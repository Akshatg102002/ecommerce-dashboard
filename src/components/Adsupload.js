import React, { useState } from 'react';
import Papa from 'papaparse';

function AdsUpload({ onAdsDataParsed }) {
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Map columns; no budget parsed here
        const mappedAdsData = results.data.map(row => ({
          sku: row['SKU'] || row['Parent SKU'] || row['Local SKU'] || row['myntra_sku'] || '',
          spend: parseFloat((row['Spend'] || '0').replace(/,/g, '')) || 0,
          impressions: parseInt((row['Impressions'] || '0').replace(/,/g, '')) || 0,
          revenue: parseFloat((row['Revenue'] || '0').replace(/,/g, '')) || 0,
          ctr: parseFloat((row['CTR'] || '0').replace(/,/g, '')) || 0,
          roi: parseFloat((row['ROI'] || '0').replace(/,/g, '')) || 0,
          // budget omitted here, will be separately input
        }));

        const validData = mappedAdsData.filter(entry => entry.sku && entry.sku.trim() !== '');

        if (validData.length === 0) {
          alert('No valid SKU entries found in the Ads CSV.');
          onAdsDataParsed([]);
          return;
        }

        onAdsDataParsed(validData);
      },
      error: (err) => {
        alert('Error parsing Ads CSV file: ' + err.message);
      }
    });
  };

  return (
    <div className="ads-upload">
      <label htmlFor="ads-file-input" className="ads-upload-label">
        Upload Myntra Ads CSV
      </label>
      <input
        id="ads-file-input"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => document.getElementById('ads-file-input').click()}
        className="ads-upload-button"
      >
        {fileName ? `Selected: ${fileName}` : 'Choose Ads CSV File'}
      </button>
    </div>
  );
}

export default AdsUpload;
