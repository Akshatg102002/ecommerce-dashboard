import React from 'react';

function InventoryRecord({ record, formatNumber, getTopItems, getStockStatus }) {
  return (
    <>
      <div className="metric-group">
        <div className="metric">
          <span className="metric-label">Total Stock</span>
          <span className="metric-value inventory">{formatNumber(record.totalStock || 0)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">{record.platform === 'delhi_warehouse' ? 'Internal Code Count' : 'SKU Count'}</span>
          <span className="metric-value">{record.skus ? Object.keys(record.skus).length : 0}</span>
        </div>
      </div>

      {record.totalFreeStock !== undefined && record.totalFreeStock > 0 && (
        <div className="metric">
          <span className="metric-label">Free Stock</span>
          <span className="metric-value">{formatNumber(record.totalFreeStock)}</span>
        </div>
      )}

      {record.totalStock !== undefined && (
        <div className={`stock-status ${getStockStatus(record.totalStock).className}`}>
          <span className="status-indicator"></span>
          {getStockStatus(record.totalStock).status}
        </div>
      )}

      {record.productName && record.productName !== 'Unknown' && (
        <p className="product-info">
          <strong>{record.platform === 'delhi_warehouse' ? 'Department' : 'Product'}:</strong> {record.productName}
        </p>
      )}

      {record.skus && Object.keys(record.skus).length > 0 && (
        <div className="top-items">
          <strong>Top {record.platform === 'delhi_warehouse' ? 'Internal Codes' : 'SKUs'} by Stock:</strong>
          <ul>
            {getTopItems(record.skus).map(([sku, stock]) => (
              <li key={sku}>
                {sku}: {formatNumber(stock)} units
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.parentSkus && Object.keys(record.parentSkus).length > 0 && (
        <div className="top-items">
          <strong>Top Parent SKUs/Style Codes:</strong>
          <ul>
            {getTopItems(record.parentSkus).map(([parentSku, stock]) => (
              <li key={parentSku}>
                {parentSku}: {formatNumber(stock)} units
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.categories && Object.keys(record.categories).length > 0 && (
        <div className="top-items">
          <strong>Top Categories:</strong>
          <ul>
            {getTopItems(record.categories).map(([category, stock]) => (
              <li key={category}>
                {category}: {formatNumber(stock)} units
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.warehouses && Object.keys(record.warehouses).length > 0 && (
        <div className="top-items">
          <strong>Top Warehouses:</strong>
          <ul>
            {getTopItems(record.warehouses).map(([warehouse, stock]) => (
              <li key={warehouse}>
                {warehouse}: {formatNumber(stock)} units
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.platform === 'myntra' && record.mappedSkuCount > 0 && (
        <div className="mapping-info">
          <strong>SKU Mapping Applied:</strong>
          <p>{record.mappedSkuCount} SKUs mapped from Myntra codes to local codes</p>
        </div>
      )}
    </>
  );
}

export default InventoryRecord;
