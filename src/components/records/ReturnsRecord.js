import React from 'react';

function ReturnsRecord({ record, formatNumber, formatCurrency, getTopItems }) {
  return (
    <>
      <div className="metric-group">
        <div className="metric">
          <span className="metric-label">Total Returns</span>
          <span className="metric-value">{formatNumber(record.totalReturns || 0)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Total Refund</span>
          <span className="metric-value refund">{formatCurrency(record.totalRefundAmount || 0)}</span>
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

      {record.returnReasons && Object.keys(record.returnReasons).length > 0 && (
        <div className="top-items">
          <strong>Top Return Reasons:</strong>
          <ul>
            {getTopItems(record.returnReasons).map(([reason, count]) => (
              <li key={reason}>
                {reason}: {formatNumber(count)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.returnTypes && Object.keys(record.returnTypes).length > 0 && (
        <div className="top-items">
          <strong>Return Types:</strong>
          <ul>
            {getTopItems(record.returnTypes).map(([type, count]) => (
              <li key={type}>
                {type}: {formatNumber(count)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default ReturnsRecord;
