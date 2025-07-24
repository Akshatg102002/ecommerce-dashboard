// components/DatabaseStatus.js
import React from 'react';
import { useDatabaseContext } from '../contexts/DatabaseContext';

const DatabaseStatus = () => {
  const { isDbReady, dbError, clearAllData } = useDatabaseContext();
  const [isClearing, setIsClearing] = React.useState(false);

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all stored data? This action cannot be undone.')) {
      setIsClearing(true);
      const success = await clearAllData();
      
      if (success) {
        window.location.reload(); // Reload to refresh the app state
      }
      setIsClearing(false);
    }
  };

  if (dbError) {
    return (
      <div className="alert alert-danger mb-3">
        <div className="d-flex align-items-center">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <div>
            <strong>Database Error:</strong> {dbError.message}
            <br />
            <small>Data will not be saved across sessions.</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
      <div className="d-flex align-items-center">
        <i className={`fas ${isDbReady ? 'fa-database text-success' : 'fa-spinner fa-spin text-warning'} me-2`}></i>
        <span className="small">
          {isDbReady ? 'Database Ready' : 'Initializing Database...'}
        </span>
      </div>
      
      {isDbReady && (
        <button 
          className="btn btn-outline-danger btn-sm"
          onClick={handleClearData}
          disabled={isClearing}
        >
          {isClearing ? (
            <>
              <span className="spinner-border spinner-border-sm me-1"></span>
              Clearing...
            </>
          ) : (
            <>
              <i className="fas fa-trash me-1"></i>
              Clear All Data
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default DatabaseStatus;
