import React from 'react';

function OrdersRecord({ record, formatNumber, formatCurrency, getTopItems }) {
  return (
    <>
      <div className="metric-group">
        <div className="metric">
          <span className="metric-label">Total Orders</span>
          <span className="metric-value">{formatNumber(record.totalOrders || 0)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Total Sales</span>
          <span className="metric-value sales">{formatCurrency(record.totalSales || 0)}</span>
        </div>
      </div>

      {record.platform === 'myntra' && record.styleName && record.styleName !== 'Unknown' && (
        <p className="product-info">
          <strong>Style:</strong> {record.styleName}
        </p>
      )}

      {record.productName && record.productName !== 'Unknown' && (
        <p className="product-info">
          <strong>Product:</strong> {record.productName}
        </p>
      )}

      {record.categories && Object.keys(record.categories).length > 0 && (
        <div className="top-items">
          <strong>Top Categories:</strong>
          <ul>
            {getTopItems(record.categories).map(([category, sales]) => (
              <li key={category}>
                {category}: {formatCurrency(sales)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.cities && Object.keys(record.cities).length > 0 && (
        <div className="top-items">
          <strong>Top Cities:</strong>
          <ul>
            {getTopItems(record.cities).map(([city, sales]) => (
              <li key={city}>
                {city}: {formatCurrency(sales)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default OrdersRecord;
