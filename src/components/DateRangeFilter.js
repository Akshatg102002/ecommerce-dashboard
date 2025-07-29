import React, { useState, useEffect } from 'react';

function DateRangeFilter({ onFilterChange, records = [] }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Get available date range from records with null checks
  const getAvailableDateRange = () => {
    if (!records || !Array.isArray(records) || records.length === 0) {
      return { minDate: '', maxDate: '' };
    }

    const dates = records
      .map(record => {
        if (record.startDate) return record.startDate;
        if (record.endDate) return record.endDate;
        if (record.uploadedAt) return record.uploadedAt.split('T')[0];
        if (record.date) return new Date(record.date).toISOString().split('T')[0];
        return null;
      })
      .filter(date => date !== null)
      .sort();

    if (dates.length === 0) {
      return { minDate: '', maxDate: '' };
    }

    return {
      minDate: dates[0],
      maxDate: dates[dates.length - 1]
    };
  };

  const { minDate, maxDate } = getAvailableDateRange();

  // Reset filter
  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsActive(false);
    if (onFilterChange) {
      onFilterChange({ startDate: '', endDate: '', isActive: false });
    }
  };

  // Auto-apply when dates change
  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      setIsActive(true);
      if (onFilterChange) {
        onFilterChange({ startDate, endDate, isActive: true });
      }
    } else if (!startDate && !endDate) {
      setIsActive(false);
      if (onFilterChange) {
        onFilterChange({ startDate: '', endDate: '', isActive: false });
      }
    }
  }, [startDate, endDate, onFilterChange]);

  return (
    <div className="date-range-filter-compact">
      <div className="filter-row">
        <div className="date-inputs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={minDate}
            max={maxDate}
            className="date-input-compact"
            placeholder="Start Date"
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || minDate}
            max={maxDate}
            className="date-input-compact"
            placeholder="End Date"
          />
        </div>
        
        <button 
          onClick={resetFilter}
          disabled={!isActive}
          className="reset-btn-compact"
          title="Clear date filter"
        >
          ✕
        </button>
        
        {isActive && (
          <span className="filter-status">📅 Filtered</span>
        )}
      </div>
      
      {records && records.length > 0 && (
        <div className="date-range-info-compact">
          <small>Available: {minDate || 'N/A'} to {maxDate || 'N/A'} ({records.length} records)</small>
        </div>
      )}
    </div>
  );
}

export default DateRangeFilter;
