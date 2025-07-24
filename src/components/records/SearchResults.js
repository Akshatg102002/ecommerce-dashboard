import React from 'react';

function SearchResults({ searchTerm, searchResults, reportType, getLocalSku }) {
  const formatCurrency = (amount) => {
    return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num) => {
    return Number(num).toLocaleString('en-IN');
  };

  const formatDateDisplay = (record) => {
    if (record.dateRange) {
      return record.dateRange;
    }
    if (record.startDate && record.endDate) {
      if (record.startDate === record.endDate) {
        return record.startDate;
      }
      return `${record.startDate} to ${record.endDate}`;
    }
    if (record.date) {
      return new Date(record.date).toLocaleDateString('en-IN');
    }
    return 'Date not available';
  };

  // Enhanced helper function to get SKU-specific warehouse distribution for Myntra
const getSkuWarehouseDistribution = (record, targetSku) => {
  if (!targetSku) return [];
  const distribution = [];
  
  console.log('Getting warehouse distribution for SKU:', targetSku);
  console.log('Available warehouse-SKU data:', record.warehouseSkuData);
  console.log('Available SKU-warehouse data:', record.skuWarehouseData);
  
  // **METHOD 1: Use structured warehouse-SKU data (preferred)**
  if (record.warehouseSkuData && typeof record.warehouseSkuData === 'object') {
    Object.entries(record.warehouseSkuData).forEach(([warehouse, skuData]) => {
      if (skuData && typeof skuData === 'object') {
        // Check for exact SKU match
        if (skuData[targetSku] !== undefined) {
          distribution.push({ warehouse, stock: skuData[targetSku] || 0 });
        }
        
        // Also check for SKU mapping if getLocalSku is available
        if (typeof getLocalSku === 'function') {
          Object.entries(skuData).forEach(([platformSku, stock]) => {
            const localSkuResult = getLocalSku(platformSku);
            if (localSkuResult && localSkuResult.localSku === targetSku) {
              const existingEntry = distribution.find(d => d.warehouse === warehouse);
              if (existingEntry) {
                existingEntry.stock += stock || 0;
              } else {
                distribution.push({ warehouse, stock: stock || 0 });
              }
            }
          });
        }
      }
    });
  }
  
  // **METHOD 2: Use reverse SKU-warehouse mapping**
  if (distribution.length === 0 && record.skuWarehouseData && record.skuWarehouseData[targetSku]) {
    Object.entries(record.skuWarehouseData[targetSku]).forEach(([warehouse, stock]) => {
      distribution.push({ warehouse, stock: stock || 0 });
    });
  }
  
  // **METHOD 3: Direct search in raw data (fallback for Myntra)**
  if (distribution.length === 0 && record.platform === 'myntra' && record.rawData) {
    console.log('Falling back to raw data search for Myntra...');
    
    record.rawData.forEach(row => {
      if (!row || typeof row !== 'object') return;
      
      // Get SKU from the row (case insensitive matching)
      const rowSku = getColumnValue(row, ['sku code', 'Seller SKU Code', 'seller sku code']) || '';
      const warehouse = getColumnValue(row, ['warehouse name', 'Warehouse Name', 'warehouse_name', 'Warehouse_Name']) || 'Unknown';
      const stock = parseInt(String(getColumnValue(row, ['inventory count', 'Inventory Count']) || '0').replace(/,/g, '')) || 0;
      
      console.log('Checking row - SKU:', rowSku, 'Warehouse:', warehouse, 'Stock:', stock);
      
      // Check for direct match or mapped SKU match
      let isMatch = false;
      if (rowSku === targetSku) {
        isMatch = true;
      } else if (typeof getLocalSku === 'function') {
        const localSkuResult = getLocalSku(rowSku);
        if (localSkuResult && localSkuResult.localSku === targetSku) {
          isMatch = true;
        }
      }
      
      if (isMatch && warehouse !== 'Unknown' && stock > 0) {
        const existingWarehouse = distribution.find(d => d.warehouse === warehouse);
        if (existingWarehouse) {
          existingWarehouse.stock += stock;
        } else {
          distribution.push({ warehouse, stock });
        }
      }
    });
  }
  
  console.log('Final distribution for', targetSku, ':', distribution);
  return distribution.sort((a, b) => b.stock - a.stock);
};


  // Helper function to get parent SKU warehouse distribution
  const getParentSkuWarehouseDistribution = (record, parentSku) => {
    if (!record.rawData || !parentSku) return [];
    const distribution = [];
    
    if (record.platform === 'delhi_warehouse' && reportType === 'inventory') {
      record.rawData.forEach(row => {
        if (!row || typeof row !== 'object') return;
        
        const rowParentSku = getColumnValue(row, ['Style code', 'style code']) || '';
        const warehouse = getColumnValue(row, ['Warehouse', 'warehouse']) || 'Delhi';
        const stock = parseInt(String(getColumnValue(row, ['Total Stock', 'total stock']) || '0').replace(/,/g, '')) || 0;
        
        if (rowParentSku.includes(parentSku)) {
          const existingWarehouse = distribution.find(d => d.warehouse === warehouse);
          if (existingWarehouse) {
            existingWarehouse.stock += stock;
          } else {
            distribution.push({ warehouse, stock });
          }
        }
      });
    }
    
    // Fallback to existing logic
    if (distribution.length === 0 && record.warehouseSkuData) {
      if (typeof record.warehouseSkuData === 'object') {
        Object.entries(record.warehouseSkuData).forEach(([warehouse, skuData]) => {
          if (skuData && typeof skuData === 'object') {
            let totalStock = 0;
            Object.entries(skuData).forEach(([sku, stock]) => {
              if (sku.includes(parentSku)) {
                totalStock += stock || 0;
              }
            });
            if (totalStock > 0) {
              distribution.push({ warehouse, stock: totalStock });
            }
          }
        });
      }
    }
    
    return distribution.sort((a, b) => b.stock - a.stock);
  };

  // Enhanced helper function with fallback
  const getSkuWarehouseDistributionWithFallback = (record, targetSku) => {
    let distribution = getSkuWarehouseDistribution(record, targetSku);
    
    if (distribution.length === 0) {
      if (record.rawData && record.rawData.warehouses) {
        Object.entries(record.rawData.warehouses).forEach(([warehouse, data]) => {
          if (data && data[targetSku] !== undefined) {
            distribution.push({ warehouse, stock: data[targetSku] || 0 });
          }
        });
      }
      
      if (distribution.length === 0 && record.skuWarehouseData) {
        Object.entries(record.skuWarehouseData).forEach(([sku, warehouseData]) => {
          if (sku === targetSku && warehouseData) {
            Object.entries(warehouseData).forEach(([warehouse, stock]) => {
              distribution.push({ warehouse, stock: stock || 0 });
            });
          }
        });
      }
    }
    
    return distribution.sort((a, b) => b.stock - a.stock);
  };

  // Helper function to get column value with case-insensitive matching
  const getColumnValue = (row, columnNames) => {
    if (!columnNames || !row) return null;

    const columns = Array.isArray(columnNames) ? columnNames : [columnNames];

    for (const columnName of columns) {
      // Direct match
      if (row[columnName] !== undefined) {
        return row[columnName];
      }

      // Case-insensitive match
      const keys = Object.keys(row);
      const matchedKey = keys.find(key => key.toLowerCase() === columnName.toLowerCase());
      if (matchedKey && row[matchedKey] !== undefined) {
        return row[matchedKey];
      }
    }

    return null;
  };

  // Group results by parent SKU for better organization
  const groupResultsByParentSku = (results) => {
    const grouped = {};
    const nonInventoryResults = [];
    
    results.forEach(result => {
      if (result.type === 'parentSku' || result.type === 'sku' || result.type === 'originalSku') {
        const parentSku = result.type === 'parentSku' ? result.parentSku : 
                          result.sku ? result.sku.split('-')[0] : null;
        
        if (parentSku) {
          if (!grouped[parentSku]) {
            grouped[parentSku] = { parent: null, children: [] };
          }
          
          if (result.type === 'parentSku') {
            grouped[parentSku].parent = result;
          } else {
            grouped[parentSku].children.push(result);
          }
        } else {
          nonInventoryResults.push(result);
        }
      } else {
        nonInventoryResults.push(result);
      }
    });
    
    return { grouped, nonInventoryResults };
  };

  // Render warehouse distribution as horizontal pills
  const renderWarehouseDistribution = (distribution, maxShow = 4) => {
    if (distribution.length === 0) return null;
    
    return (
      <div className="warehouse-distribution mt-2">
        <div className="d-flex flex-wrap gap-1">
          {distribution.slice(0, maxShow).map(({ warehouse, stock }, idx) => (
            <span key={idx} className="badge bg-light text-dark border" style={{ fontSize: '0.75rem' }}>
              {warehouse}: <strong>{formatNumber(stock)}</strong>
            </span>
          ))}
          {distribution.length > maxShow && (
            <span className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>
              +{distribution.length - maxShow} more
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render Parent SKU tile
  const renderParentSkuTile = (result) => {
    const { record } = result;
    const warehouseDistribution = getParentSkuWarehouseDistribution(record, result.parentSku);
    
    return (
      <div className="sku-tile parent-sku-tile">
        <div className="tile-header bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <div className="tile-title">
              <i className="fas fa-sitemap me-2"></i>
              <span className="fw-bold">Style: {result.parentSku}</span>
            </div>
            <div className="tile-badges">
              <span className="badge bg-light text-primary">{record.platform}</span>
            </div>
          </div>
        </div>
        <div className="tile-body">
          <div className="tile-stats">
            <div className="stat-item">
              <div className="stat-value text-primary fw-bold">{formatNumber(result.stock)}</div>
              <div className="stat-label">Total Stock</div>
            </div>
            {result.category && (
              <div className="stat-item">
                <div className="stat-value text-muted">{result.category}</div>
                <div className="stat-label">Category</div>
              </div>
            )}
          </div>
          {renderWarehouseDistribution(warehouseDistribution)}
          {/* <div className="tile-footer">
            <small className="text-muted">{formatDateDisplay(record)}</small>
          </div> */}
        </div>
      </div>
    );
  };

  // Render Child SKU tile
  const renderChildSkuTile = (result) => {
    const { record } = result;
    const warehouseDistribution = getSkuWarehouseDistributionWithFallback(record, result.sku);
    
    return (
      <div className="sku-tile child-sku-tile">
        <div className="tile-header bg-success text-white">
          <div className="d-flex justify-content-between align-items-center">
            <div className="tile-title">
              <i className="fas fa-barcode me-2"></i>
              <span className="fw-bold">{result.sku}</span>
              {result.isMapped && <i className="fas fa-link ms-1" title="Mapped SKU"></i>}
            </div>
            <div className="tile-badges">
              <span className="badge bg-light text-success">{record.platform}</span>
            </div>
          </div>
        </div>
        <div className="tile-body">
          <div className="tile-stats">
            <div className="stat-item">
              <div className="stat-value text-success fw-bold">{formatNumber(result.stock)}</div>
              <div className="stat-label">Stock</div>
            </div>
            {result.category && (
              <div className="stat-item">
                <div className="stat-value text-muted">{result.category}</div>
                <div className="stat-label">Category</div>
              </div>
            )}
          </div>
          {renderWarehouseDistribution(warehouseDistribution)}
          {/* <div className="tile-footer">
            <small className="text-muted">{formatDateDisplay(record)}</small>
            {result.isMapped && (
              <small className="text-info d-block">
                <i className="fas fa-info-circle me-1"></i>Mapped SKU
              </small>
            )}
          </div> */}
        </div>
      </div>
    );
  };

  // Render other result types (same as before)
  const renderOtherResultTile = (result) => {
    const { type, record, matchText, platform } = result;
    
    // Platform aggregates for Orders
    if (type === 'platformOrdersAggregate') {
      return (
        <div className="result-tile platform-tile">
          <div className="tile-header bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center">
              <div className="tile-title">
                <i className="fas fa-chart-line me-2"></i>
                <span className="fw-bold">{matchText}</span>
              </div>
              <span className="badge bg-light text-primary">{result.recordCount} records</span>
            </div>
          </div>
          <div className="tile-body">
            <div className="tile-stats">
              <div className="stat-item">
                <div className="stat-value text-primary fw-bold">{formatNumber(result.totalOrders)}</div>
                <div className="stat-label">Total Orders</div>
              </div>
              <div className="stat-item">
                <div className="stat-value text-success fw-bold">{formatCurrency(result.totalSales)}</div>
                <div className="stat-label">Total Sales</div>
              </div>
              <div className="stat-item">
                <div className="stat-value text-info fw-bold">
                  {result.totalOrders > 0 ? formatCurrency(result.totalSales / result.totalOrders) : '₹0'}
                </div>
                <div className="stat-label">Avg. Order Value</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Platform aggregates for Returns
    if (type === 'platformReturnsAggregate') {
      return (
        <div className="result-tile platform-tile">
          <div className="tile-header bg-warning text-dark">
            <div className="d-flex justify-content-between align-items-center">
              <div className="tile-title">
                <i className="fas fa-undo me-2"></i>
                <span className="fw-bold">{matchText}</span>
              </div>
              <span className="badge bg-light text-dark">{result.recordCount} records</span>
            </div>
          </div>
          <div className="tile-body">
            <div className="tile-stats">
              <div className="stat-item">
                <div className="stat-value text-warning fw-bold">{formatNumber(result.totalReturns)}</div>
                <div className="stat-label">Total Returns</div>
              </div>
              <div className="stat-item">
                <div className="stat-value text-danger fw-bold">{formatCurrency(result.totalRefundAmount)}</div>
                <div className="stat-label">Refund Amount</div>
              </div>
              <div className="stat-item">
                <div className="stat-value text-info fw-bold">
                  {result.totalReturns > 0 ? formatCurrency(result.totalRefundAmount / result.totalReturns) : '₹0'}
                </div>
                <div className="stat-label">Avg. Refund</div>
              </div>
            </div>
            {platform?.toLowerCase() === 'myntra' && (
              <div className="return-types mt-2">
                <div className="d-flex gap-2">
                  <span className="badge bg-info">SJIT: {formatNumber(result.sjitReturns)}</span>
                  <span className="badge bg-info">PPMP: {formatNumber(result.ppmpReturns)}</span>
                  <span className="badge bg-info">RTV: {formatNumber(result.rtvReturns)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default tile for other types
    const getTypeConfig = (type) => {
      const configs = {
        orderSku: { icon: 'fas fa-barcode', color: 'success', label: 'Order SKU' },
        orderCategory: { icon: 'fas fa-tags', color: 'info', label: 'Category' },
        orderCity: { icon: 'fas fa-map-marker-alt', color: 'secondary', label: 'City' },
        returnReason: { icon: 'fas fa-exclamation-triangle', color: 'warning', label: 'Return Reason' },
        returnType: { icon: 'fas fa-list-ul', color: 'danger', label: 'Return Type' },
        returnSku: { icon: 'fas fa-barcode', color: 'warning', label: 'Return SKU' },
        returnCategory: { icon: 'fas fa-tags', color: 'warning', label: 'Return Category' },
        category: { icon: 'fas fa-tags', color: 'secondary', label: 'Category' },
        warehouse: { icon: 'fas fa-warehouse', color: 'dark', label: 'Warehouse' },
        city: { icon: 'fas fa-map-marker-alt', color: 'primary', label: 'City' }
      };
      return configs[type] || { icon: 'fas fa-file-alt', color: 'secondary', label: 'Record' };
    };

    const config = getTypeConfig(type);
    
    return (
      <div className="result-tile generic-tile">
        <div className={`tile-header bg-${config.color} text-white`}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="tile-title">
              <i className={`${config.icon} me-2`}></i>
              <span className="fw-bold">{matchText}</span>
            </div>
            <span className={`badge bg-light text-${config.color}`}>{platform || record.platform}</span>
          </div>
        </div>
        <div className="tile-body">
          <div className="tile-stats">
            {result.sales && (
              <div className="stat-item">
                <div className="stat-value text-success fw-bold">{formatCurrency(result.sales)}</div>
                <div className="stat-label">Sales</div>
              </div>
            )}
            {result.count && (
              <div className="stat-item">
                <div className="stat-value text-primary fw-bold">{formatNumber(result.count)}</div>
                <div className="stat-label">Count</div>
              </div>
            )}
            {result.returnCount && (
              <div className="stat-item">
                <div className="stat-value text-warning fw-bold">{formatNumber(result.returnCount)}</div>
                <div className="stat-label">Returns</div>
              </div>
            )}
            {result.refundAmount && (
              <div className="stat-item">
                <div className="stat-value text-danger fw-bold">{formatCurrency(result.refundAmount)}</div>
                <div className="stat-label">Refund</div>
              </div>
            )}
            {result.stock && (
              <div className="stat-item">
                <div className="stat-value text-info fw-bold">{formatNumber(result.stock)}</div>
                <div className="stat-label">Stock</div>
              </div>
            )}
            {result.value && (
              <div className="stat-item">
                <div className="stat-value text-primary fw-bold">
                  {reportType === 'inventory' ? formatNumber(result.value) : formatCurrency(result.value)}
                </div>
                <div className="stat-label">
                  {reportType === 'inventory' ? 'Stock' : 'Value'}
                </div>
              </div>
            )}
          </div>
          <div className="tile-footer">
            <small className="text-muted">{formatDateDisplay(record)}</small>
          </div>
        </div>
      </div>
    );
  };

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="alert alert-info mt-3">
        <h5 className="alert-heading">
          <i className="fas fa-search me-2"></i>
          No matches found for "{searchTerm}"
        </h5>
        <p className="mb-0">Try searching for:</p>
        <ul className="mb-0 mt-2">
          {reportType === 'inventory' && (
            <>
              <li>Product names, SKUs, or categories</li>
              <li>Warehouse names</li>
              <li>Local SKUs or mapped SKUs</li>
            </>
          )}
          {reportType === 'orders' && (
            <>
              <li>Platform names (Myntra, Amazon, etc.)</li>
              <li>Product categories or SKUs</li>
              <li>City names</li>
            </>
          )}
          {reportType === 'returns' && (
            <>
              <li>Platform names</li>
              <li>Return reasons or types</li>
              <li>Product SKUs or categories</li>
            </>
          )}
        </ul>
      </div>
    );
  }

  const { grouped, nonInventoryResults } = groupResultsByParentSku(searchResults);

  return (
    <>
      <style jsx>{`
        .search-results {
          margin-top: 1rem;
        }
        
        .sku-group {
          margin-bottom: 2rem;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: #f8f9fa;
          padding: 1rem;
        }
        
        .sku-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: flex-start;
        }
        
        .sku-tile, .result-tile {
          flex: 0 0 auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .sku-tile:hover, .result-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .parent-sku-tile {
          border: 2px solid #0d6efd;
        }
        
        .child-sku-tile {
          border: 2px solid #198754;
        }
        
        .platform-tile {
          min-width: 350px;
          max-width: 400px;
        }
        
        .generic-tile {
          min-width: 250px;
          max-width: 300px;
        }
        
        .tile-header {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        
        .tile-title {
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .tile-body {
          padding: 1rem;
        }
        
        .tile-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        
        .stat-item {
          flex: 1;
          min-width: 80px;
          text-align: center;
        }
        
        .stat-value {
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.2;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0.25rem;
        }
        
        .warehouse-distribution {
          border-top: 1px solid #e9ecef;
          padding-top: 0.75rem;
          margin-top: 0.75rem;
        }
        
        .tile-footer {
          border-top: 1px solid #e9ecef;
          padding-top: 0.75rem;
          margin-top: 0.75rem;
        }
        
        .results-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .tile-badges {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        
        .return-types {
          border-top: 1px solid rgba(255,255,255,0.2);
          padding-top: 0.5rem;
        }
        
        @media (max-width: 768px) {
          .sku-row {
            grid-template-columns: 1fr 1fr;
          }
          
          .sku-tile, .result-tile {
            min-width: 100%;
            max-width: 100%;
          }
          
          .tile-stats {
            justify-content: space-around;
          }

          .tile-title{
            font-size:10px;
          }
        }
      `}</style>

      <div className="search-results">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>
            <i className="fas fa-search-plus me-2"></i>
            Search Results ({searchResults.length})
          </h5>
          <small className="text-muted">Showing results for "{searchTerm}"</small>
        </div>

        {/* Render grouped SKU results */}
        {Object.entries(grouped).map(([parentSku, group]) => (
          <div key={parentSku} className="sku-group">
            <div className="sku-row">
              {/* Render parent SKU first */}
              {group.parent && renderParentSkuTile(group.parent)}
              
              {/* Render child SKUs */}
              {group.children.map((child, index) => (
                <div key={`child-${child.sku}-${index}`}>
                  {renderChildSkuTile(child)}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Render other results */}
        {nonInventoryResults.length > 0 && (
          <div className="results-grid">
            {nonInventoryResults.map((result, index) => (
              <div key={`other-${index}`}>
                {renderOtherResultTile(result)}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default SearchResults;
