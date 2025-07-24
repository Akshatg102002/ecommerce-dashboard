import React from 'react';
function ExportSection() {
  const exportToCSV = () => {
    // Your logic to export data to CSV (you can use Papaparse or any other method)
    alert('Exporting to CSV');
  };

  const exportToJSON = () => {
    // Logic to export to JSON format
    alert('Exporting to JSON');
  };

  return (
    <div className="export-section">
      <h2>Export Data</h2>
      <button className="export-btn" onClick={exportToCSV}>
        Export to CSV
      </button>
      <button className="export-btn" onClick={exportToJSON}>
        Export to JSON
      </button>
    </div>
  );
}

export default ExportSection;
