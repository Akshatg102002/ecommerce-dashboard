import React, { useState } from 'react';

function RecordCard({ record, reportType, onDownload, onDelete, onSelectRecord, getLocalSkuMapping }) {
  const [selectedParentSku, setSelectedParentSku] = useState(null);
  const [showChildSkus, setShowChildSkus] = useState(false);

  const formatCurrency = (amount) => {
    return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num) => {
    return Number(num).toLocaleString('en-IN');
  };

  // Extract parent SKU from child SKU
  const getParentSku = (childSku) => {
    if (!childSku) return childSku;
    
    // Remove size suffix (e.g., BW6085BLUE_DRS-M -> BW6085BLUE_DRS)
    const parentSku = childSku.replace(/-[SMLXL0-9]+$/i, '');
    
    // Further simplify if needed (e.g., BW6085BLUE_DRS -> BW6085)
    return parentSku;
  };

  // Group child SKUs by parent SKU and aggregate values
  const getTopParentSkus = (items, limit = 20) => {
    if (!items || typeof items !== 'object') return [];

    const parentSkuMap = new Map();

    // Group by parent SKU
    Object.entries(items).forEach(([childSku, value]) => {
      if (!childSku || childSku.trim() === '' || childSku === 'Unknown' || childSku === 'N/A') return;
      
      const parentSku = getParentSku(childSku);
      const numValue = Number(value) || 0;
      
      if (!parentSkuMap.has(parentSku)) {
        parentSkuMap.set(parentSku, {
          parentSku,
          totalValue: 0,
          childSkus: new Map()
        });
      }
      
      const parentData = parentSkuMap.get(parentSku);
      parentData.totalValue += numValue;
      parentData.childSkus.set(childSku, numValue);
    });

    // Convert to array and sort by total value
    const sortedParents = Array.from(parentSkuMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    return sortedParents;
  };

  // Get top warehouses with stock distribution
  const getTopWarehouses = (warehouses, limit = 5) => {
    if (!warehouses || typeof warehouses !== 'object') return [];

    return Object.entries(warehouses)
      .filter(([warehouse, stock]) => warehouse && warehouse !== 'Unknown' && stock > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  };

  // Get top child SKUs for a specific parent
  const getTopChildSkus = (parentSkuData, limit = 10) => {
    return Array.from(parentSkuData.childSkus.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  };

  const handleParentSkuClick = (parentSkuData, event) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedParentSku(parentSkuData);
    setShowChildSkus(true);
  };

  const closeChildSkuModal = () => {
    setShowChildSkus(false);
    setSelectedParentSku(null);
  };

  // Delete record function with confirmation
  const handleDeleteRecord = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const confirmMessage = `Are you sure you want to delete this ${reportType} record?\n\n` +
                          `Platform: ${record.platform}\n` +
                          `Date: ${formatDateDisplay(record)}\n` +
                          `Records: ${record.recordCount || 'N/A'}\n\n` +
                          `This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      onDelete(record.id);
    }
  };

  const formatDateDisplay = (record) => {
    if (record.dateRange) return record.dateRange;
    if (record.startDate && record.endDate) {
      if (record.startDate === record.endDate) return record.startDate;
      return `${record.startDate} to ${record.endDate}`;
    }
    if (record.date) return new Date(record.date).toLocaleDateString('en-IN');
    return 'Date not available';
  };

  const getMappedSkuCount = () => {
    if (!record.skus) return 0;
    return Object.keys(record.skus).length;
  };

  const renderMetricsWithClasses = () => {
    if (reportType === 'orders') {
      return (
        <>
          <div className="metric-item">
            <div className="metric-value sales">{formatCurrency(record.totalSales || 0)}</div>
            <div className="metric-label">Total Sales</div>
          </div>
          <div className="metric-item">
            <div className="metric-value orders">{formatNumber(record.totalOrders || 0)}</div>
            <div className="metric-label">Orders</div>
          </div>
        </>
      );
    } else if (reportType === 'returns') {
      return (
        <>
          <div className="metric-item">
            <div className="metric-value returns">{formatNumber(record.totalReturns || 0)}</div>
            <div className="metric-label">Returns</div>
          </div>
          <div className="metric-item">
            <div className="metric-value refund">{formatCurrency(record.totalRefundAmount || 0)}</div>
            <div className="metric-label">Refund Amount</div>
          </div>
        </>
      );
    } else if (reportType === 'inventory') {
      return (
        <>
          <div className="metric-item">
            <div className="metric-value stock">{formatNumber(record.totalStock || 0)}</div>
            <div className="metric-label">Total Stock</div>
          </div>
          <div className="metric-item">
            <div className="metric-value stock">{formatNumber(record.totalFreeStock || 0)}</div>
            <div className="metric-label">Free Stock</div>
          </div>
        </>
      );
    }
  };

  const renderTopParentSkusWithClasses = () => {
    const topParentSkus = getTopParentSkus(record.skus || {}, 20);
    
    if (topParentSkus.length === 0) {
      return <p className="text-muted small">No SKU data available</p>;
    }

    return (
      <div className="parent-skus-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
        {topParentSkus.map((parentData, index) => (
          <div 
            key={index}
            className="parent-sku-item"
            onClick={(e) => handleParentSkuClick(parentData, e)}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="sku-code">{parentData.parentSku}</span>
                <div className="sku-variants">{parentData.childSkus.size} variants</div>
              </div>
              <div className="text-end">
                <div className="sku-value">
                  {reportType === 'inventory' 
                    ? formatNumber(parentData.totalValue) 
                    : formatCurrency(parentData.totalValue)
                  }
                </div>
                <i className="fas fa-chevron-right chevron-icon"></i>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render warehouse distribution for inventory
  const renderWarehouseDistribution = () => {
    if (reportType !== 'inventory') return null;

    const topWarehouses = getTopWarehouses(record.warehouses || {}, 5);
    
    if (topWarehouses.length === 0) {
      return (
        <div className="warehouse-section">
          <h6 className="section-title" style={{ marginBottom: '12px', fontSize: '14px' }}>
            <i className="fas fa-warehouse"></i>
            Warehouse Distribution
          </h6>
          <p className="text-muted small">No warehouse data available</p>
        </div>
      );
    }

    return (
      <div className="warehouse-section" style={{ marginTop: '16px' }}>
        <h6 className="section-title" style={{ marginBottom: '12px', fontSize: '14px' }}>
          <i className="fas fa-warehouse"></i>
          Warehouse Distribution
        </h6>
        <div className="warehouse-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {topWarehouses.map(([warehouse, stock], index) => (
            <div 
              key={index}
              className="warehouse-item d-flex justify-content-between align-items-center mt-2 p-2"
              style={{ 
                background: '#f8f9fa', 
                border: '1px solid #dee2e6', 
                borderRadius: '6px',
                borderLeft: '4px solid #17a2b8'
              }}
            >
              <div>
                <span className="warehouse-name" style={{ 
                  fontWeight: '600', 
                  color: '#495057',
                  fontSize: '13px'
                }}>
                  {warehouse}
                </span>
              </div>
              <div className="text-end">
                <div className="warehouse-stock" style={{ 
                  fontWeight: '700', 
                  color: '#17a2b8',
                  fontSize: '14px'
                }}>
                  {formatNumber(stock)}
                </div>
                <small className="text-muted" style={{ fontSize: '11px' }}>
                  {((stock / (record.totalStock || 1)) * 100).toFixed(1)}%
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="col-md-6 col-lg-4 mb-4">
        <div className="record-card">
          <div className="record-card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="platform-title">
                {record.platform}
              </h5>
              <div className="d-flex align-items-center gap-2">
                <span className="report-badge">{reportType}</span>
                {/* Delete Button */}
                <button 
                  className="btn btn-outline-danger btn-sm delete-btn"
                  onClick={handleDeleteRecord}
                  title="Delete Record"
                  style={{ 
                    padding: '4px 8px', 
                    margin: '0px 10px',
                    border: '1px solid #000',
                    borderRadius: '20px',
                    background: '#dc3545'
                  }}
                >Delete
                  <i className="fas fa-trash" style={{ fontSize: '12px' }}></i>
                </button>
              </div>
            </div>
            <div className="date-range">{formatDateDisplay(record)}</div>
          </div>

          <div className="record-card-body" style={{ padding: '12px' }}>
            {/* Metrics */}
            <div className="metrics-section" style={{ gap: '12px', marginBottom: '16px' }}>
              {renderMetricsWithClasses()}
            </div>

            {/* For inventory - show warehouse distribution */}
            {reportType === 'inventory' && renderWarehouseDistribution()}

            {/* For orders/returns - show parent SKUs */}
            {(reportType === 'orders' || reportType === 'returns') && (
              <div className="parent-skus-section">
                <h6 className="section-title" style={{ marginBottom: '12px', fontSize: '14px' }}>
                  <i className="fas fa-list-ul"></i>
                  Top 20 Parent SKUs
                </h6>
                {renderTopParentSkusWithClasses()}
              </div>
            )}

            {/* For inventory - also show top parent SKUs but smaller */}
            {reportType === 'inventory' && (
              <div className="parent-skus-section" style={{ marginTop: '16px' }}>
                <h6 className="section-title" style={{ marginBottom: '12px', fontSize: '14px' }}>
                  <i className="fas fa-list-ul"></i>
                  Top 10 Parent SKUs
                </h6>
                <div className="parent-skus-container" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {getTopParentSkus(record.skus || {}, 10).map((parentData, index) => (
                    <div 
                      key={index}
                      className="parent-sku-item"
                      onClick={(e) => handleParentSkuClick(parentData, e)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="sku-code">{parentData.parentSku}</span>
                          <div className="sku-variants">{parentData.childSkus.size} variants</div>
                        </div>
                        <div className="text-end">
                          <div className="sku-value">
                            {formatNumber(parentData.totalValue)}
                          </div>
                          <i className="fas fa-chevron-right chevron-icon"></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="additional-info" style={{ marginTop: '12px', paddingTop: '12px' }}>
              <div className="info-item">Total SKUs: {getMappedSkuCount()}</div>
              {record.recordCount && (
                <div className="info-item">Records: {formatNumber(record.recordCount)}</div>
              )}
              {reportType === 'inventory' && record.warehouses && (
                <div className="info-item">
                  Warehouses: {Object.keys(record.warehouses).length}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal with CSS classes */}
      {showChildSkus && selectedParentSku && (
        <div 
          className="modal fade show child-skus-modal" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeChildSkuModal}
        >
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-sitemap"></i>
                  Child SKUs for: <strong>{selectedParentSku.parentSku}</strong>
                </h5>
                <button type="button" className="btn-close" onClick={closeChildSkuModal}></button>
              </div>
              <div className="modal-body">
                <div className="summary-cards">
                  <div className="summary-card success">
                    <div className="summary-value">
                      {reportType === 'inventory' 
                        ? formatNumber(selectedParentSku.totalValue) 
                        : formatCurrency(selectedParentSku.totalValue)
                      }
                    </div>
                    <div className="summary-label">Total Value</div>
                  </div>
                  <div className="summary-card info">
                    <div className="summary-value">{selectedParentSku.childSkus.size}</div>
                    <div className="summary-label">Total Variants</div>
                  </div>
                  <div className="summary-card primary">
                    <div className="summary-value">{Math.min(10, selectedParentSku.childSkus.size)}</div>
                    <div className="summary-label">Top Showing</div>
                  </div>
                </div>
                
                <div className="child-skus-table-section">
                  <div className="child-skus-table-header">
                    <i className="fas fa-trophy"></i>
                    Top 10 Child SKUs
                  </div>
                  <div className="table-responsive">
                    <table className="table child-skus-table mb-0">
                      <thead>
                        <tr>
                          <th width="10%">Rank</th>
                          <th width="50%">Child SKU</th>
                          <th width="25%" className="text-end">Value</th>
                          <th width="15%" className="text-end">% Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getTopChildSkus(selectedParentSku, 10).map(([childSku, value], index) => (
                          <tr key={childSku}>
                            <td>
                              <span className={`rank-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'default'}`}>
                                {index + 1}
                              </span>
                            </td>
                            <td>
                              <span className="child-sku-code">{childSku}</span>
                            </td>
                            <td className="text-end">
                              <span className="child-sku-value">
                                {reportType === 'inventory' ? formatNumber(value) : formatCurrency(value)}
                              </span>
                            </td>
                            <td className="text-end">
                              <span className="percentage-badge">
                                {((value / selectedParentSku.totalValue) * 100).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeChildSkuModal}>
                  <i className="fas fa-times me-1"></i>Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RecordCard;
