import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

function RecordCard({ record, reportType, onEdit, onDelete, skuMapping }) {
  const [showChildSkus, setShowChildSkus] = useState(false);
  const [selectedParentSku, setSelectedParentSku] = useState(null);
  const [showAllSkus, setShowAllSkus] = useState(false);
  const [activeTab, setActiveTab] = useState('parent-skus');

  // Helper functions
  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('en-IN');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Enhanced parent SKU extraction with count tracking
  const getParentSku = (childSku) => {
    if (!childSku || typeof childSku !== 'string') return 'Unknown';
    
    childSku = childSku.trim();
    
    if (childSku.includes('_')) {
      return childSku.split('_')[0];
    }
    
    const match = childSku.match(/^([A-Z]{2,4}\d{3,6})/);
    if (match) {
      return match[1];
    }
    
    return childSku;
  };

  // Enhanced function to group child SKUs by parent SKU with count tracking
  const getTopParentSkus = (items, counts, limit = 20) => {
    if (!items || typeof items !== 'object') return [];
    
    const parentSkuMap = new Map();

    Object.entries(items).forEach(([childSku, value]) => {
      if (!childSku || childSku.trim() === '' || childSku === 'Unknown' || childSku === 'N/A') return;
      
      const parentSku = getParentSku(childSku);
      const numValue = Number(value) || 0;
      const countValue = counts && counts[childSku] ? Number(counts[childSku]) : 1;

      if (!parentSkuMap.has(parentSku)) {
        parentSkuMap.set(parentSku, { 
          parentSku, 
          totalValue: 0, 
          totalCount: 0,
          childSkus: new Map(),
          childCounts: new Map()
        });
      }

      const parentData = parentSkuMap.get(parentSku);
      parentData.totalValue += numValue;
      parentData.totalCount += countValue;
      parentData.childSkus.set(childSku, numValue);
      parentData.childCounts.set(childSku, countValue);
    });

    const sortedParents = Array.from(parentSkuMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    return sortedParents;
  };

  // Get top child SKUs for a parent with count information
  const getTopChildSkus = (parentData, limit = 50) => {
    if (!parentData || !parentData.childSkus) return [];
    
    return Array.from(parentData.childSkus.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);
  };

  // Enhanced metrics calculation with count
  const getMappedSkuCount = () => {
    const skuKeys = Object.keys(record.skus || {});
    const parentKeys = Object.keys(record.parentSkus || {});
    const categoryKeys = Object.keys(record.categories || {});
    
    return Math.max(skuKeys.length, parentKeys.length, categoryKeys.length);
  };

  // Handle parent SKU click to show child SKUs
  const handleParentSkuClick = (parentData, event) => {
    event.stopPropagation();
    setSelectedParentSku(parentData);
    setShowChildSkus(true);
  };

  // Close child SKU modal
  const closeChildSkuModal = () => {
    setShowChildSkus(false);
    setSelectedParentSku(null);
  };

  // Enhanced download functionality with count data
  const handleDownloadParentSku = (parentData, event) => {
    event.stopPropagation();
    
    const childSkuData = getTopChildSkus(parentData, 1000).map(([childSku, value], index) => {
      const count = parentData.childCounts.get(childSku) || 1;
      const percentage = ((value / parentData.totalValue) * 100).toFixed(2);
      
      return {
        'Rank': index + 1,
        'Child SKU': childSku,
        'Value': value,
        'Count': count,
        'Percentage': `${percentage}%`,
        'Parent SKU': parentData.parentSku
      };
    });

    const ws = XLSX.utils.json_to_sheet(childSkuData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Child SKUs');
    
    const fileName = `${parentData.parentSku}_Child_SKUs_${formatDate(record.uploadedAt || new Date().toISOString())}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Enhanced metrics rendering with count information
  const renderMetricsWithClasses = () => {
    if (reportType === 'orders') {
      return (
        <>
          <div className="metric-row">
            <div className="metric-item sales">
              <span className="metric-label">Sales</span>
              <span className="metric-value">{formatCurrency(record.totalSales || 0)}</span>
            </div>
            <div className="metric-item orders">
              <span className="metric-label">Orders</span>
              <span className="metric-value">{formatNumber(record.totalOrders || 0)}</span>
            </div>
            <div className="metric-item count">
              <span className="metric-label">Pieces</span>
              <span className="metric-value">{formatNumber(record.totalSkuCount || 0)}</span>
            </div>
          </div>
        </>
      );
    } else if (reportType === 'returns') {
      return (
        <>
          <div className="metric-row">
            <div className="metric-item returns">
              <span className="metric-label">Total Returns</span>
              <span className="metric-value">{formatNumber(record.totalReturns || 0)}</span>
            </div>
            <div className="metric-item refund">
              <span className="metric-label">Refund Amount</span>
              <span className="metric-value">{formatCurrency(record.totalRefundAmount || 0)}</span>
            </div>
            <div className="metric-item count">
              <span className="metric-label">Return Pieces</span>
              <span className="metric-value">{formatNumber(record.totalSkuCount || 0)}</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-item sku-count">
              <span className="metric-label">Unique SKUs</span>
              <span className="metric-value">{getMappedSkuCount()}</span>
            </div>
          </div>
        </>
      );
    } else if (reportType === 'inventory') {
      return (
        <>
          <div className="metric-row">
            <div className="metric-item stock">
              <span className="metric-label">Total Stock</span>
              <span className="metric-value">{formatNumber(record.totalStock || 0)}</span>
            </div>
            <div className="metric-item count">
              <span className="metric-label">Stock Pieces</span>
              <span className="metric-value">{formatNumber(record.totalSkuCount || record.totalStock || 0)}</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-item sku-count">
              <span className="metric-label">Unique SKUs</span>
              <span className="metric-value">{getMappedSkuCount()}</span>
            </div>
          </div>
        </>
      );
    }
  };

  // Enhanced parent SKUs rendering with count information
  const renderParentSkus = () => {
    const topParentSkus = getTopParentSkus(record.skus || {}, record.skuCounts || {}, 20);
    
    if (topParentSkus.length === 0) {
      return <div className="no-data">No SKU data available</div>;
    }

    return (
      <div className="parent-skus-grid">
        {topParentSkus.map((parentData, index) => (
          <div 
            key={parentData.parentSku} 
            className="parent-sku-item"
            onClick={(e) => handleParentSkuClick(parentData, e)}
          >
            <div className="parent-sku-details">
              <div className="parent-sku-name" title={parentData.parentSku}>
                {parentData.parentSku}
              </div>
              <div className="parent-sku-metrics">
                <div className="metric-value">
                  {reportType === 'orders' ? formatCurrency(parentData.totalValue) : formatNumber(parentData.totalValue)}
                </div>
                <div className="metric-count">
                  {formatNumber(parentData.totalCount)} {reportType === 'orders' ? 'pieces' : reportType === 'inventory' ? 'units' : 'returns'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Enhanced categories rendering with count
  const renderCategories = () => {
    if (!record.categories || Object.keys(record.categories).length === 0) {
      return <div className="no-data">No category data available</div>;
    }

    const sortedCategories = Object.entries(record.categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return (
      <div className="categories-grid">
        {sortedCategories.map(([category, value], index) => {
          const categoryCount = record.categoryCount && record.categoryCount[category] ? record.categoryCount[category] : 0;
          
          return (
            <div key={category} className="category-item">
              <div className="category-rank">#{index + 1}</div>
              <div className="category-details">
                <div className="category-name" title={category}>
                  {category}
                </div>
                <div className="category-metrics">
                  <div className="metric-value">
                    {reportType === 'orders' ? formatCurrency(value) : formatNumber(value)}
                  </div>
                  {categoryCount > 0 && (
                    <div className="metric-count">
                      {formatNumber(categoryCount)} {reportType === 'orders' ? 'pieces' : reportType === 'inventory' ? 'units' : 'returns'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <style>
        {`
        .record-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin-bottom: 24px;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .record-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border-color: #007bff;
        }

        .record-header {
          color: #000;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .record-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .platform-icon {
          font-size: 24px;
        }

        .record-info h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .record-meta {
          font-size: 14px;
          opacity: 0.9;
          display: flex;
          gap: 16px;
        }

        .record-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          background: red;
          color: #fff;
        }

        .action-btn:hover {
          background: rgba(255,255,255,0.3);
          transform: scale(1.05);
          color:#000;
        }

        .metrics-section {
          padding:10px;
          border-bottom: 1px solid #e9ecef;
        }

        .metric-row {
          display: flex;
          gap: 5px;
          margin-bottom: 12px;
          background: #00080;
        }

        .metric-item {
          flex: 1;
          padding: 5px;
          border-radius: 8px;
          text-align: center;
          min-width: 120px;
        }

        .metric-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          opacity: 0.9;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .metric-value {
          font-size: 18px;
          font-weight: 700;
        }

        .metric-count {
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
          margin-top: 2px;
        }

        .data-tabs {
          display: flex;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .tab-btn {
          flex: 1;
          padding: 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 600;
          color: #6c757d;
          transition: all 0.3s ease;
        }

        .tab-btn.active {
          color: #007bff;
          background: white;
          border-bottom: 3px solid #007bff;
        }

        .tab-content {
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }

        .parent-skus-grid {
          display: grid;
          gap: 12px;
        }

        .parent-sku-item {
          display: flex;
          align-items: center;
          padding: 5px;
          background: #f8f9fa;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .parent-sku-item:hover {
          background: #e9ecef;
          transform: translateX(4px);
        }

        .parent-sku-rank {
          font-weight: 700;
          color: #007bff;
          margin-right: 12px;
          min-width: 32px;
        }

        .parent-sku-details {
          flex: 1;
        }

        .parent-sku-name {
          font-weight: 600;
          color: #343a40;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .parent-sku-metrics {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .parent-sku-metrics .metric-value {
          font-size: 14px;
          color: #28a745;
          font-weight: 600;
        }

        .parent-sku-actions {
          display: flex;
          gap: 8px;
        }

        .download-btn {
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #007bff;
          color: white;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .download-btn:hover {
          background: #0056b3;
          transform: scale(1.1);
        }

        .categories-grid {
          display: grid;
          gap: 12px;
        }

        .category-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .category-rank {
          font-weight: 700;
          color: #007bff;
          margin-right: 12px;
          min-width: 32px;
        }

        .category-details {
          flex: 1;
        }

        .category-name {
          font-weight: 600;
          color: #343a40;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .category-metrics {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .category-metrics .metric-value {
          font-size: 14px;
          color: #28a745;
          font-weight: 600;
        }

        .child-sku-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .child-sku-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }

        .modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .modal-summary {
          display: flex;
          gap: 20px;
          font-size: 14px;
          color: rgba(255,255,255,0.9);
          margin-top: 8px;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .modal-content {
          padding: 20px;
          max-height: 500px;
          overflow-y: auto;
        }

        .child-sku-table {
          width: 100%;
          border-collapse: collapse;
        }

        .child-sku-table th,
        .child-sku-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .child-sku-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }

        .child-sku-table tbody tr:hover {
          background: #f8f9fa;
        }

        .child-sku-table th:nth-child(4),
        .child-sku-table td:nth-child(4) {
          text-align: center;
          width: 80px;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #6c757d;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .metric-row {
            flex-direction: column;
            gap: 8px;
          }
          
          .record-header {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
          
          .record-actions {
            justify-content: center;
          }
        }
        `}
      </style>

      <div className="record-card">
        {/* Record Header */}
        <div className="record-header">
          <div className="record-title">
            <span className="platform-icon">
              {record.platform === 'myntra' ? '' : 
               record.platform === 'nykaa' ? '' : 
               record.platform === 'delhi_warehouse' ? '' : ''}
            </span>
            <div className="record-info">
              <h3>{record.platform?.toUpperCase() || 'Unknown Platform'} {record.businessUnit && `- ${record.businessUnit.toUpperCase()}`}</h3>
              <div className="record-meta">
                <span> {record.reportType?.toUpperCase() || reportType.toUpperCase()}</span>
                {record.startDate && record.endDate && (
                  <span> {formatDate(record.startDate)} - {formatDate(record.endDate)}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="record-actions">
            <button className="action-btn" onClick={() => onDelete(record.id)}>
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Enhanced Metrics Section */}
        <div className="metrics-section">
          {renderMetricsWithClasses()}
        </div>

        {/* Data Tabs */}
        <div className="data-tabs">
          <button 
            className={`tab-btn ${activeTab === 'parent-skus' ? 'active' : ''}`}
            onClick={() => setActiveTab('parent-skus')}
          >
            🏷️ Parent SKUs
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'parent-skus' && renderParentSkus()}
          {activeTab === 'categories' && renderCategories()}
        </div>
      </div>

      {/* Enhanced Child SKU Modal with Count Information */}
      {showChildSkus && selectedParentSku && (
        <div className="child-sku-modal-overlay" onClick={closeChildSkuModal}>
          <div className="child-sku-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Child SKUs for: {selectedParentSku.parentSku}</h3>
                <div className="modal-summary">
                  <span>Total Value: {reportType === 'inventory' || reportType === 'returns' ? formatNumber(selectedParentSku.totalValue) : formatCurrency(selectedParentSku.totalValue)}</span>
                  <span>Total Count: {formatNumber(selectedParentSku.totalCount)} {reportType === 'orders' ? 'pieces' : reportType === 'inventory' ? 'units' : 'returns'}</span>
                  <span>Child SKUs: {selectedParentSku.childSkus.size}</span>
                </div>
              </div>
              <button className="close-btn" onClick={closeChildSkuModal}>×</button>
            </div>
            
            <div className="modal-content">
              <table className="child-sku-table">
                <thead>
                  <tr>
                    <th>Child SKU</th>
                    <th>SKU Name</th>
                    <th>Value</th>
                    <th>Count</th>
                    <th>% Share</th>
                  </tr>
                </thead>
                <tbody>
                  {getTopChildSkus(selectedParentSku, 50).map(([childSku, value], index) => {
                    const count = selectedParentSku.childCounts.get(childSku) || 1;
                    const percentage = ((value / selectedParentSku.totalValue) * 100).toFixed(1);
                    
                    return (
                      <tr key={childSku}>
                        <td>{index + 1}</td>
                        <td>{childSku}</td>
                        <td>{reportType === 'inventory' || reportType === 'returns' ? formatNumber(value) : formatCurrency(value)}</td>
                        <td>{formatNumber(count)}</td>
                        <td>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RecordCard;
