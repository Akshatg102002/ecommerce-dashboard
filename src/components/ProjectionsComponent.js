import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';

function ProjectionsComponent({ records = [], className = '' }) {
  const [totalBudget, setTotalBudget] = useState(100000);
  const [dailyBudget, setDailyBudget] = useState(3000);
  const [projectionDays, setProjectionDays] = useState(30);
  const [campaignData, setCampaignData] = useState([]);
  const [skuMapping, setSkuMapping] = useState(new Map());
  const [mappingLoaded, setMappingLoaded] = useState(false);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [activeTab, setActiveTab] = useState('projections');
  
  // New states for manual SKU input
  const [manualSku, setManualSku] = useState('');
  const [skuProjection, setSkuProjection] = useState(null);
  const [skuSearchStatus, setSkuSearchStatus] = useState('');

  // Load Master SKU Mapping on component mount
  useEffect(() => {
    const loadSkuMapping = async () => {
      try {
        const response = await fetch('/Master_SKU_Mapping.csv');
        if (!response.ok) {
          console.warn('Master SKU mapping file not found.');
          setMappingLoaded(true);
          return;
        }

        const csvText = await response.text();
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const mapping = new Map();
        
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(cell => cell.trim());
          if (row.length < headers.length) continue;
          
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] || '';
          });
          
          const localSku = rowData['Local_SKU'] || rowData['Local SKU'] || rowData['local_sku'];
          const myntraStyleId = rowData['Myntra Style ID'] || rowData['Myntra_Style_ID'] || rowData['myntra_style_id'];
          const categories = rowData['Categories'] || rowData['categories'] || rowData['Category'];
          
          if (localSku && myntraStyleId) {
            mapping.set(myntraStyleId, {
              localSku: localSku,
              categories: categories || '',
              myntraStyleId: myntraStyleId
            });
            // Also create reverse mapping (SKU to Style ID)
            mapping.set(localSku, {
              localSku: localSku,
              categories: categories || '',
              myntraStyleId: myntraStyleId
            });
          }
        }
        
        setSkuMapping(mapping);
        setMappingLoaded(true);
        console.log(`✅ Loaded ${mapping.size} Style ID mappings from Master_SKU_Mapping.csv`);
      } catch (error) {
        console.error('Error loading SKU mapping:', error);
        setMappingLoaded(true);
      }
    };

    loadSkuMapping();
  }, []);

  // Handle ad campaign file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadStatus('Uploading...');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processedData = jsonData.map(row => ({
          styleId: String(row['Style ID'] || row['style_id'] || row['StyleID'] || ''),
          style: row['Style'] || row['Style Name'] || row['style_name'] || '',
          spend: Number(row['Spend'] || row['Cost'] || row['spend'] || 0),
          impressions: Number(row['Impressions'] || row['impressions'] || 0),
          clicks: Number(row['Clicks'] || row['clicks'] || 0),
          ctr: Number(row['CTR'] || row['ctr'] || 0),
          cvr: Number(row['CVR'] || row['cvr'] || 0),
          avgCpc: Number(row['Avg CPC'] || row['avg_cpc'] || row['CPC'] || 0),
          unitsSold: Number(row['Units Sold'] || row['units_sold'] || row['Orders'] || row['orders'] || 0),
          revenue: Number(row['Revenue'] || row['revenue'] || row['Sales'] || row['sales'] || 0),
          roi: Number(row['ROI'] || row['roi'] || 0)
        })).filter(item => item.styleId && item.spend > 0);

        setCampaignData(processedData);
        setIsFileUploaded(true);
        setUploadStatus(`✅ Successfully uploaded ${processedData.length} campaign records`);
        
        event.target.value = '';
      } catch (error) {
        console.error('Error parsing file:', error);
        setUploadStatus('❌ Error parsing file. Please check format.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, []);

  // Helper functions
  const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const formatNumber = (num) => Number(num || 0).toLocaleString('en-IN');

  // Get sales performance data for all SKUs from records
  const salesPerformanceData = useMemo(() => {
    if (!records || records.length === 0) return {};

    const skuPerformance = {};

    records.forEach(record => {
      if (record.skus && typeof record.skus === 'object') {
        Object.entries(record.skus).forEach(([sku, sales]) => {
          const salesValue = Number(sales) || 0;
          const count = record.skuCounts && record.skuCounts[sku] ? Number(record.skuCounts[sku]) : 1;
          
          if (!skuPerformance[sku]) {
            skuPerformance[sku] = {
              totalSales: 0,
              totalUnits: 0,
              recordCount: 0,
              avgSalesPerUnit: 0,
              platform: record.platform,
              recentSales: []
            };
          }
          
          skuPerformance[sku].totalSales += salesValue;
          skuPerformance[sku].totalUnits += count;
          skuPerformance[sku].recordCount += 1;
          skuPerformance[sku].recentSales.push({
            date: record.startDate || record.uploadedAt,
            sales: salesValue,
            units: count
          });
        });
      }
    });

    // Calculate average sales per unit and sort recent sales
    Object.keys(skuPerformance).forEach(sku => {
      const data = skuPerformance[sku];
      data.avgSalesPerUnit = data.totalUnits > 0 ? data.totalSales / data.totalUnits : 0;
      data.recentSales.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    return skuPerformance;
  }, [records]);

  // Handle manual SKU projection
  const handleSkuProjection = useCallback(() => {
    if (!manualSku.trim()) {
      setSkuSearchStatus('❌ Please enter a SKU to analyze');
      return;
    }

    setSkuSearchStatus('🔍 Analyzing SKU...');

    // Find SKU in sales data
    const salesData = salesPerformanceData[manualSku.trim()];
    
    // Find corresponding Style ID and campaign data
    const mappingData = skuMapping.get(manualSku.trim());
    const styleId = mappingData ? mappingData.myntraStyleId : null;
    const campaignRecord = styleId ? campaignData.find(item => item.styleId === styleId) : null;

    if (!salesData && !campaignRecord) {
      setSkuSearchStatus('❌ SKU not found in sales data or campaign records');
      setSkuProjection(null);
      return;
    }

    // Calculate projections based on available data
    const projectedBudgetPerDay = Math.min(dailyBudget, totalBudget / projectionDays);
    let projection = {
      sku: manualSku.trim(),
      styleId: styleId || 'Unknown',
      hasSalesData: !!salesData,
      hasCampaignData: !!campaignRecord,
      dataSource: ''
    };

    if (campaignRecord) {
      // Use campaign data for projection (preferred)
      const costPerUnit = campaignRecord.unitsSold > 0 ? campaignRecord.spend / campaignRecord.unitsSold : 0;
      const revenuePerUnit = campaignRecord.unitsSold > 0 ? campaignRecord.revenue / campaignRecord.unitsSold : 0;
      
      // Allocate 10% of daily budget to this SKU
      const dailyBudgetAllocation = projectedBudgetPerDay * 0.1;
      const projectedDailyUnits = costPerUnit > 0 ? dailyBudgetAllocation / costPerUnit : 0;
      const projectedDailyRevenue = projectedDailyUnits * revenuePerUnit;

      projection = {
        ...projection,
        dataSource: 'Campaign Data',
        // Historical metrics
        historicalSpend: campaignRecord.spend,
        historicalUnits: campaignRecord.unitsSold,
        historicalRevenue: campaignRecord.revenue,
        historicalROI: campaignRecord.roi,
        historicalCTR: campaignRecord.ctr,
        historicalCVR: campaignRecord.cvr,
        // Cost metrics
        costPerUnit,
        revenuePerUnit,
        profitPerUnit: revenuePerUnit - costPerUnit,
        // Projections
        projectedDailySpend: dailyBudgetAllocation,
        projectedDailyUnits,
        projectedDailyRevenue,
        totalProjectedSpend: dailyBudgetAllocation * projectionDays,
        totalProjectedUnits: projectedDailyUnits * projectionDays,
        totalProjectedRevenue: projectedDailyRevenue * projectionDays,
        totalProjectedProfit: (projectedDailyRevenue - dailyBudgetAllocation) * projectionDays,
        projectedROI: dailyBudgetAllocation > 0 ? projectedDailyRevenue / dailyBudgetAllocation : 0
      };
    } else if (salesData) {
      // Use sales data for estimation
      const estimatedCostPerUnit = salesData.avgSalesPerUnit * 0.15; // Assume 15% of revenue as ad cost
      const dailyBudgetAllocation = projectedBudgetPerDay * 0.1;
      const projectedDailyUnits = estimatedCostPerUnit > 0 ? dailyBudgetAllocation / estimatedCostPerUnit : 0;
      const projectedDailyRevenue = projectedDailyUnits * salesData.avgSalesPerUnit;

      projection = {
        ...projection,
        dataSource: 'Sales Data (Estimated)',
        // Sales metrics
        totalSales: salesData.totalSales,
        totalUnits: salesData.totalUnits,
        avgSalesPerUnit: salesData.avgSalesPerUnit,
        recordCount: salesData.recordCount,
        platform: salesData.platform,
        // Estimated cost metrics
        costPerUnit: estimatedCostPerUnit,
        revenuePerUnit: salesData.avgSalesPerUnit,
        profitPerUnit: salesData.avgSalesPerUnit - estimatedCostPerUnit,
        // Projections
        projectedDailySpend: dailyBudgetAllocation,
        projectedDailyUnits,
        projectedDailyRevenue,
        totalProjectedSpend: dailyBudgetAllocation * projectionDays,
        totalProjectedUnits: projectedDailyUnits * projectionDays,
        totalProjectedRevenue: projectedDailyRevenue * projectionDays,
        totalProjectedProfit: (projectedDailyRevenue - dailyBudgetAllocation) * projectionDays,
        projectedROI: dailyBudgetAllocation > 0 ? projectedDailyRevenue / dailyBudgetAllocation : 0
      };
    }

    setSkuProjection(projection);
    setSkuSearchStatus(`✅ Analysis complete for ${manualSku.trim()}`);
  }, [manualSku, salesPerformanceData, skuMapping, campaignData, dailyBudget, totalBudget, projectionDays]);

  // Calculate projections for current campaign
  const campaignProjections = useMemo(() => {
    if (!isFileUploaded || campaignData.length === 0 || !mappingLoaded) {
      return { projections: [], summary: {} };
    }

    const projectedBudgetPerDay = Math.min(dailyBudget, totalBudget / projectionDays);
    const totalProjectedBudget = projectedBudgetPerDay * projectionDays;

    const projections = campaignData.map(item => {
      const mappingData = skuMapping.get(item.styleId);
      const sku = mappingData ? mappingData.localSku : `Unknown-${item.styleId}`;
      
      const costPerUnit = item.unitsSold > 0 ? item.spend / item.unitsSold : 0;
      const revenuePerUnit = item.unitsSold > 0 ? item.revenue / item.unitsSold : 0;
      const profitPerUnit = revenuePerUnit - costPerUnit;
      
      const totalHistoricalSpend = campaignData.reduce((sum, ad) => sum + ad.spend, 0);
      const dailySpendRatio = totalHistoricalSpend > 0 ? item.spend / totalHistoricalSpend : 0;
      const projectedDailySpend = projectedBudgetPerDay * dailySpendRatio;
      const projectedDailyUnits = costPerUnit > 0 ? projectedDailySpend / costPerUnit : 0;
      const projectedDailyRevenue = projectedDailyUnits * revenuePerUnit;
      
      const totalProjectedSpend = projectedDailySpend * projectionDays;
      const totalProjectedUnits = projectedDailyUnits * projectionDays;
      const totalProjectedRevenue = projectedDailyRevenue * projectionDays;
      const totalProjectedProfit = totalProjectedRevenue - totalProjectedSpend;

      return {
        sku,
        styleId: item.styleId,
        style: item.style,
        historicalSpend: item.spend,
        historicalUnits: item.unitsSold,
        historicalRevenue: item.revenue,
        historicalROI: item.roi,
        historicalCTR: item.ctr,
        historicalCVR: item.cvr,
        costPerUnit,
        revenuePerUnit,
        profitPerUnit,
        projectedDailySpend,
        projectedDailyUnits,
        projectedDailyRevenue,
        totalProjectedSpend,
        totalProjectedUnits,
        totalProjectedRevenue,
        totalProjectedProfit,
        projectedROI: totalProjectedSpend > 0 ? totalProjectedRevenue / totalProjectedSpend : 0
      };
    });

    projections.sort((a, b) => b.profitPerUnit - a.profitPerUnit);

    const summary = {
      totalBudgetAllocated: totalProjectedBudget,
      dailyBudget: projectedBudgetPerDay,
      projectionDays,
      currentCampaignSkus: projections.length,
      totalProjectedUnits: projections.reduce((sum, item) => sum + item.totalProjectedUnits, 0),
      totalProjectedRevenue: projections.reduce((sum, item) => sum + item.totalProjectedRevenue, 0),
      totalProjectedProfit: projections.reduce((sum, item) => sum + item.totalProjectedProfit, 0),
      averageROI: projections.length > 0 ? projections.reduce((sum, item) => sum + item.projectedROI, 0) / projections.length : 0
    };

    return { projections, summary };
  }, [campaignData, totalBudget, dailyBudget, projectionDays, isFileUploaded, mappingLoaded, skuMapping]);

  // Download projections as Excel
  const downloadProjections = () => {
    const wb = XLSX.utils.book_new();

    // Current Campaign Data
    if (campaignProjections.projections.length > 0) {
      const campaignData = campaignProjections.projections.map((item, index) => ({
        'Rank': index + 1,
        'SKU': item.sku,
        'Style ID': item.styleId,
        'Style Name': item.style,
        'Status': 'Currently Running',
        'Historical Spend': item.historicalSpend,
        'Historical Units': item.historicalUnits,
        'Historical Revenue': item.historicalRevenue,
        'Cost Per Unit': item.costPerUnit,
        'Revenue Per Unit': item.revenuePerUnit,
        'Profit Per Unit': item.profitPerUnit,
        'Projected Total Spend': item.totalProjectedSpend,
        'Projected Total Units': item.totalProjectedUnits,
        'Projected Total Revenue': item.totalProjectedRevenue,
        'Projected Total Profit': item.totalProjectedProfit,
        'Projected ROI': item.projectedROI
      }));

      const ws1 = XLSX.utils.json_to_sheet(campaignData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Current Campaign');
    }

    // Manual SKU Analysis
    if (skuProjection) {
      const manualSkuData = [{
        'SKU': skuProjection.sku,
        'Style ID': skuProjection.styleId,
        'Data Source': skuProjection.dataSource,
        'Historical Spend': skuProjection.historicalSpend || 'N/A',
        'Historical Units': skuProjection.historicalUnits || skuProjection.totalUnits || 'N/A',
        'Historical Revenue': skuProjection.historicalRevenue || skuProjection.totalSales || 'N/A',
        'Cost Per Unit': skuProjection.costPerUnit,
        'Revenue Per Unit': skuProjection.revenuePerUnit,
        'Profit Per Unit': skuProjection.profitPerUnit,
        'Projected Daily Spend': skuProjection.projectedDailySpend,
        'Projected Daily Units': skuProjection.projectedDailyUnits,
        'Projected Daily Revenue': skuProjection.projectedDailyRevenue,
        'Total Projected Spend': skuProjection.totalProjectedSpend,
        'Total Projected Units': skuProjection.totalProjectedUnits,
        'Total Projected Revenue': skuProjection.totalProjectedRevenue,
        'Total Projected Profit': skuProjection.totalProjectedProfit,
        'Projected ROI': skuProjection.projectedROI
      }];

      const ws2 = XLSX.utils.json_to_sheet(manualSkuData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Manual SKU Analysis');
    }
    
    const fileName = `Myntra_Ad_Projections_${projectionDays}days_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <>
      <style>
        {`
        .projections-container {
          background: #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin: 20px 0;
          overflow: hidden;
        }

        .projections-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }

        .projections-header h2 {
          margin: 0;
          font-size: 24px;
        }

        .upload-section {
          padding: 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .upload-area {
          border: 2px dashed #007bff;
          padding: 20px;
          text-align: center;
          background: white;
          margin-bottom: 15px;
          transition: all 0.3s ease;
        }

        .upload-area:hover {
          border-color: #0056b3;
          background: #f8f9ff;
        }

        .upload-input {
          display: none;
        }

        .upload-label {
          cursor: pointer;
          color: #007bff;
          font-weight: 600;
          display: inline-block;
          padding: 10px 20px;
          border: 2px solid #007bff;
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .upload-label:hover {
          background: #007bff;
          color: white;
        }

        .upload-status {
          margin-top: 10px;
          font-weight: 600;
          color: #28a745;
        }

        .mapping-status {
          padding: 10px 20px;
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .input-section {
          padding: 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .input-row {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-bottom: 15px;
        }

        .input-group {
          flex: 1;
        }

        .input-label {
          display: block;
          font-weight: 600;
          margin-bottom: 5px;
          color: #495057;
        }

        .input-field {
          width: 100%;
          padding: 10px;
          border: 2px solid #e9ecef;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }

        .input-field:focus {
          outline: none;
          border-color: #007bff;
        }

        .sku-analysis-section {
          padding: 20px;
          background: #fff;
          border-bottom: 1px solid #dee2e6;
        }

        .sku-input-row {
          display: flex;
          gap: 15px;
          align-items: end;
          margin-bottom: 15px;
        }

        .analyze-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s ease;
          white-space: nowrap;
        }

        .analyze-btn:hover {
          background: #0056b3;
        }

        .sku-status {
          margin-bottom: 15px;
          font-weight: 600;
        }

        .sku-projection-card {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          padding: 20px;
          margin-top: 15px;
        }

        .projection-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .projection-title {
          font-size: 18px;
          font-weight: 700;
          color: #007bff;
        }

        .data-source-badge {
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          background: #28a745;
          color: white;
        }

        .projection-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .metric-card {
          background: white;
          padding: 15px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .metric-value {
          font-size: 18px;
          font-weight: 700;
          color: #007bff;
          margin-bottom: 5px;
        }

        .metric-label {
          font-size: 11px;
          color: #6c757d;
          text-transform: uppercase;
          font-weight: 600;
        }

        .tabs-nav {
          display: flex;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .tab-btn {
          flex: 1;
          padding: 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 600;
          color: #6c757d;
          transition: all 0.3s ease;
        }

        .tab-btn.active {
          color: #007bff;
          background: white;
          border-bottom: 3px solid #007bff;
        }

        .summary-section {
          padding: 20px;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 15px;
        }

        .summary-card {
          background: white;
          padding: 15px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .summary-value {
          font-size: 18px;
          font-weight: 700;
          color: #007bff;
          margin-bottom: 5px;
        }

        .summary-label {
          font-size: 11px;
          color: #6c757d;
          text-transform: uppercase;
          font-weight: 600;
        }

        .projections-table {
          overflow-x: auto;
          max-height: 65vh;
          border-top: 1px solid #dee2e6;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .table th,
        .table td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
          vertical-align: top;
        }

        .table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #495057;
          position: sticky;
          top: 0;
          z-index: 10;
          font-size: 12px;
          white-space: nowrap;
        }

        .table tbody tr:hover {
          background: #f8f9fa;
        }

        .text-truncate {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3;
          max-height: 2.6em;
        }

        .sku-cell {
          font-weight: 600;
          color: #007bff;
        }

        .status-running {
          background: #28a745;
          color: white;
          padding: 2px 6px;
          font-size: 11px;
        }

        .profit-positive {
          color: #28a745;
          font-weight: 600;
        }

        .profit-negative {
          color: #dc3545;
          font-weight: 600;
        }

        .small-text {
          font-size: 11px;
          color: #6c757d;
        }

        .metric-group {
          line-height: 1.2;
        }

        .metric-group div {
          margin-bottom: 2px;
        }

        .download-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          cursor: pointer;
          font-weight: 600;
          margin: 20px;
          transition: background 0.3s ease;
        }

        .download-btn:hover {
          background: #218838;
        }

        .download-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .no-data-message {
          text-align: center;
          padding: 40px;
          color: #6c757d;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .input-row, .sku-input-row {
            flex-direction: column;
            gap: 10px;
          }
          
          .summary-grid, .projection-metrics {
            grid-template-columns: repeat(2, 1fr);
          }

          .table {
            font-size: 11px;
          }

          .table th,
          .table td {
            padding: 6px 8px;
          }
        }
        `}
      </style>

      <div className={`projections-container ${className}`}>
        <div className="projections-header">
          <h2>📈 Smart Ad Campaign Projections</h2>
          <p>Upload campaign data & analyze specific SKU variants for intelligent projections</p>
        </div>

        {/* SKU Mapping Status */}
        {mappingLoaded && (
          <div className="mapping-status">
            {skuMapping.size > 0 ? (
              <span>✅ Master SKU Mapping loaded: {skuMapping.size} Style ID mappings found</span>
            ) : (
              <span>⚠️ Master SKU Mapping not found - using fallback mapping</span>
            )}
          </div>
        )}

        {/* File Upload Section */}
        <div className="upload-section">
          <div className="upload-area">
            <h4>📁 Upload Ad Campaign Data</h4>
            <p>Upload your Myntra ad campaign CSV/Excel file with Style IDs</p>
            <input
              type="file"
              id="campaign-upload"
              className="upload-input"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
            />
            <label htmlFor="campaign-upload" className="upload-label">
              Choose Campaign File
            </label>
            {uploadStatus && (
              <div className="upload-status">{uploadStatus}</div>
            )}
          </div>
          
          <div className="small-text">
            <strong>Expected columns:</strong> Style ID, Style Name, Spend, Units Sold, Revenue, etc.
          </div>
        </div>

        {/* Budget Input Section */}
        {isFileUploaded && (
          <div className="input-section">
            <h4>Set Your Campaign Budget</h4>
            <div className="input-row">
              <div className="input-group">
                <label className="input-label">Total Campaign Budget (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
                  placeholder="100000"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Daily Budget Limit (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value) || 0)}
                  placeholder="3000"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Projection Period (Days)</label>
                <input
                  type="number"
                  className="input-field"
                  value={projectionDays}
                  onChange={(e) => setProjectionDays(Number(e.target.value) || 1)}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
        )}

        {/* Manual SKU Analysis Section */}
        {isFileUploaded && (
          <div className="sku-analysis-section">
            <h4>Analyze Specific SKU Variant</h4>
            <p className="small-text">Enter any SKU variant to get projections based on your uploaded campaign data and sales history</p>
            
            <div className="sku-input-row">
              <div className="input-group">
                <label className="input-label">SKU Variant (e.g., BW8058GREY_SKD-L)</label>
                <input
                  type="text"
                  className="input-field"
                  value={manualSku}
                  onChange={(e) => setManualSku(e.target.value)}
                  placeholder="Enter SKU variant..."
                />
              </div>
              <button className="analyze-btn" onClick={handleSkuProjection}>
                📊 Analyze SKU
              </button>
            </div>

            {skuSearchStatus && (
              <div className="sku-status">{skuSearchStatus}</div>
            )}

            {/* SKU Projection Results */}
            {skuProjection && (
              <div className="sku-projection-card">
                <div className="projection-header">
                  <div className="projection-title">
                    Projection for {skuProjection.sku}
                  </div>
                  <div className="data-source-badge">
                    {skuProjection.dataSource}
                  </div>
                </div>

                <div className="projection-metrics">
                  {skuProjection.hasCampaignData && (
                    <>
                      <div className="metric-card">
                        <div className="metric-value">{formatCurrency(skuProjection.historicalRevenue)}</div>
                        <div className="metric-label">Historical Revenue</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">{skuProjection.historicalUnits}</div>
                        <div className="metric-label">Historical Units</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">{skuProjection.historicalROI.toFixed(2)}x</div>
                        <div className="metric-label">Historical ROI</div>
                      </div>
                    </>
                  )}
                  
                  {skuProjection.hasSalesData && !skuProjection.hasCampaignData && (
                    <>
                      <div className="metric-card">
                        <div className="metric-value">{formatCurrency(skuProjection.totalSales)}</div>
                        <div className="metric-label">Total Sales</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">{skuProjection.totalUnits}</div>
                        <div className="metric-label">Total Units Sold</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">{formatCurrency(skuProjection.avgSalesPerUnit)}</div>
                        <div className="metric-label">Avg Sales/Unit</div>
                      </div>
                    </>
                  )}

                  <div className="metric-card">
                    <div className="metric-value">{formatCurrency(skuProjection.costPerUnit)}</div>
                    <div className="metric-label">Cost Per Unit</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{formatCurrency(skuProjection.projectedDailySpend)}</div>
                    <div className="metric-label">Daily Spend</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{Math.round(skuProjection.projectedDailyUnits)}</div>
                    <div className="metric-label">Daily Units</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{formatCurrency(skuProjection.projectedDailyRevenue)}</div>
                    <div className="metric-label">Daily Revenue</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{formatCurrency(skuProjection.totalProjectedSpend)}</div>
                    <div className="metric-label">Total Spend ({projectionDays}d)</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{Math.round(skuProjection.totalProjectedUnits)}</div>
                    <div className="metric-label">Total Units ({projectionDays}d)</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{formatCurrency(skuProjection.totalProjectedRevenue)}</div>
                    <div className="metric-label">Total Revenue ({projectionDays}d)</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{skuProjection.projectedROI.toFixed(2)}x</div>
                    <div className="metric-label">Projected ROI</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary & Current Campaign Section */}
        {isFileUploaded && campaignProjections.projections.length > 0 && (
          <>
            <div className="summary-section">
              <h3>Campaign Analysis Summary</h3>
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-value">{formatCurrency(campaignProjections.summary.totalBudgetAllocated)}</div>
                  <div className="summary-label">Total Budget</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{formatCurrency(campaignProjections.summary.dailyBudget)}</div>
                  <div className="summary-label">Daily Budget</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{campaignProjections.summary.currentCampaignSkus}</div>
                  <div className="summary-label">Running SKUs</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{Math.round(campaignProjections.summary.totalProjectedUnits)}</div>
                  <div className="summary-label">Projected Units</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{formatCurrency(campaignProjections.summary.totalProjectedRevenue)}</div>
                  <div className="summary-label">Projected Revenue</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{campaignProjections.summary.averageROI.toFixed(2)}x</div>
                  <div className="summary-label">Average ROI</div>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button 
              className="download-btn" 
              onClick={downloadProjections}
            >
              Download Complete Analysis (Excel)
            </button>

            {/* Current Campaign Projections Table */}
            <div className="projections-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Style ID</th>
                    <th>Status</th>
                    <th>Historical Performance</th>
                    <th>Cost/Unit</th>
                    <th>Revenue/Unit</th>
                    <th>Profit/Unit</th>
                    <th>Projected Total</th>
                    <th>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignProjections.projections.map((item, index) => (
                    <tr key={item.styleId}>
                      <td>{index + 1}</td>
                      <td className="sku-cell">{item.sku}</td>
                      <td>{item.styleId}</td>
                      <td><span className="status-running">Running</span></td>
                      <td>
                        <div className="metric-group small-text">
                          <div>Units: {item.historicalUnits}</div>
                          <div>Rev: {formatCurrency(item.historicalRevenue)}</div>
                          <div>CTR: {item.historicalCTR.toFixed(1)}%</div>
                        </div>
                      </td>
                      <td>{formatCurrency(item.costPerUnit)}</td>
                      <td>{formatCurrency(item.revenuePerUnit)}</td>
                      <td className={item.profitPerUnit > 0 ? 'profit-positive' : 'profit-negative'}>
                        {formatCurrency(item.profitPerUnit)}
                      </td>
                      <td>
                        <div className="metric-group small-text">
                          <div>Spend: {formatCurrency(item.totalProjectedSpend)}</div>
                          <div>Units: {Math.round(item.totalProjectedUnits)}</div>
                          <div>Revenue: {formatCurrency(item.totalProjectedRevenue)}</div>
                        </div>
                      </td>
                      <td>{item.projectedROI.toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* No Data Message */}
        {!isFileUploaded && (
          <div className="no-data-message">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <h3>Smart Campaign Analysis</h3>
            <p>Upload your Myntra ad campaign data to get intelligent projections and analyze specific SKU variants based on historical performance.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default ProjectionsComponent;
