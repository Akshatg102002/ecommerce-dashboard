import React, { useState, useEffect } from 'react';

function DateRangeFilter({ onFilterChange, currentRecords, reportType }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);

  // Get available date range from current records
  const getAvailableDateRange = () => {
    if (!currentRecords || currentRecords.length === 0) return { min: '', max: '' };
    
    const dates = currentRecords
      .map(record => {
        // Handle different date formats
        if (record.startDate) return record.startDate;
        if (record.endDate) return record.endDate;
        if (record.uploadedAt) return record.uploadedAt.split('T')[0];
        if (record.date) return new Date(record.date).toISOString().split('T')[0];
        return null;
      })
      .filter(date => date && date !== 'Invalid Date')
      .sort();

    return {
      min: dates[0] || '',
      max: dates[dates.length - 1] || ''
    };
  };

  const availableRange = getAvailableDateRange();

  const handleFilterApply = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      alert('Start date cannot be after end date');
      return;
    }

    setIsFilterActive(true);
    onFilterChange({ startDate, endDate, isActive: true });
  };

  const handleFilterClear = () => {
    setStartDate('');
    setEndDate('');
    setIsFilterActive(false);
    onFilterChange({ startDate: '', endDate: '', isActive: false });
  };

  const getFilteredCount = () => {
    if (!isFilterActive || !currentRecords) return 0;
    
    return currentRecords.filter(record => {
      const recordDate = record.startDate || 
                        record.endDate || 
                        record.uploadedAt?.split('T')[0] || 
                        (record.date ? new Date(record.date).toISOString().split('T')[0] : null);
      
      if (!recordDate) return false;
      return recordDate >= startDate && recordDate <= endDate;
    }).length;
  };

  // Auto-clear filter when switching report types
  useEffect(() => {
    if (isFilterActive) {
      handleFilterClear();
    }
  }, [reportType]);

  return (
    <div className="date-range-filter-section mb-4">
      <div className="container-fluid">
        <div className="filter-card">
          <div className="filter-header">
            <div className="filter-title">
              <i className="fas fa-filter filter-icon"></i>
              <h6 className="filter-heading">Date Range Filter</h6>
            </div>
            {isFilterActive && (
              <span className="filter-badge active">
                <i className="fas fa-check-circle"></i>
                {getFilteredCount()} of {currentRecords.length} records
              </span>
            )}
          </div>
          
          <div className="filter-body">
            <div className="filter-controls">
              <div className="date-input-group">
                <label className="date-label">From Date</label>
                <input
                  type="date"
                  className="date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={availableRange.min}
                  max={availableRange.max}
                />
              </div>
              
              <div className="date-input-group">
                <label className="date-label">To Date</label>
                <input
                  type="date"
                  className="date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || availableRange.min}
                  max={availableRange.max}
                />
              </div>
              
              <div className="filter-actions">
                <button
                  className={`filter-btn apply-btn ${!startDate || !endDate ? 'disabled' : ''}`}
                  onClick={handleFilterApply}
                  disabled={!startDate || !endDate}
                >
                  <i className="fas fa-search"></i>
                  Apply Filter
                </button>
                
                <button
                  className={`filter-btn clear-btn ${!isFilterActive ? 'disabled' : ''}`}
                  onClick={handleFilterClear}
                  disabled={!isFilterActive}
                >
                  <i className="fas fa-times"></i>
                  Clear
                </button>
              </div>
            </div>
            
            <div className="filter-info">
              <small className="filter-status">
                {isFilterActive ? (
                  <span className="active-filter">
                    <i className="fas fa-calendar-check"></i>
                    Showing records from {startDate} to {endDate}
                  </span>
                ) : (
                  <span className="all-records">
                    <i className="fas fa-list"></i>
                    Showing all {currentRecords.length} records
                  </span>
                )}
              </small>
              
              {availableRange.min && availableRange.max && (
                <small className="date-range-info">
                  Available data: {availableRange.min} to {availableRange.max}
                </small>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DateRangeFilter;
