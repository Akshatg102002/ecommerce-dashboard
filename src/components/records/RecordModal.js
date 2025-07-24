import React from 'react';
import OrdersRecord from './OrdersRecord';
import ReturnsRecord from './ReturnsRecord';
import InventoryRecord from './InventoryRecord';

function RecordModal({ 
  selectedRecord, 
  reportType, 
  onClose, 
  onDelete, 
  onDownload,
  formatNumber,
  formatCurrency,
  getTopItems,
  getStockStatus,
  formatDateDisplay
}) {
  if (!selectedRecord) return null;

  const renderRecordContent = () => {
    switch (reportType) {
      case 'orders':
        return (
          <OrdersRecord 
            record={selectedRecord}
            formatNumber={formatNumber}
            formatCurrency={formatCurrency}
            getTopItems={getTopItems}
          />
        );
      case 'returns':
        return (
          <ReturnsRecord 
            record={selectedRecord}
            formatNumber={formatNumber}
            formatCurrency={formatCurrency}
            getTopItems={getTopItems}
          />
        );
      case 'inventory':
        return (
          <InventoryRecord 
            record={selectedRecord}
            formatNumber={formatNumber}
            getTopItems={getTopItems}
            getStockStatus={getStockStatus}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="selected-record-overlay">
      <div className="selected-record-modal">
        <div className="modal-header">
          <h3>Record Details</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <div className={`record-card ${reportType}-card full-view`}>
            <div className="record-header">
              <h3>
                {selectedRecord.platform ? selectedRecord.platform.toUpperCase() : 'UNKNOWN'} - {formatDateDisplay(selectedRecord)}
              </h3>
              {selectedRecord.reportType && (
                <span className="report-badge">
                  {selectedRecord.reportType ? selectedRecord.reportType.toUpperCase() : 'UNKNOWN'}
                </span>
              )}
            </div>

            <div className="record-content">
              {renderRecordContent()}
            </div>

            <div className="record-actions">
              <button 
                className="download-btn"
                onClick={() => onDownload(selectedRecord)}
              >
                Download CSV
              </button>
              <button 
                className="delete-btn"
                onClick={() => {
                  if (selectedRecord.id) {
                    onDelete(selectedRecord.id);
                    onClose();
                  }
                }}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordModal;