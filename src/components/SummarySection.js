import React, { useState, useMemo } from 'react';
import DateRangeFilter from './DateRangeFilter';

function SummarySection({ records = [], reportType = 'orders' }) {
  const [filterRange, setFilterRange] = useState({ startDate: '', endDate: '', isActive: false });
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [activeYesterdayTab, setActiveYesterdayTab] = useState('yesterday');
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const [skuMapping, setSkuMapping] = useState(new Map());
  const [mappingLoaded, setMappingLoaded] = useState(false);

  const [activeSkuTab, setActiveSkuTab] = useState('top'); 

  const safeRecords = Array.isArray(records) ? records : [];

  React.useEffect(() => {
    const loadSkuMapping = async () => {
      try {
        const response = await fetch('/Master_SKU_Mapping.csv');
        if (!response.ok) {
          console.warn('Master SKU mapping file not found. SKU mapping will be disabled.');
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
          const myntraSku = rowData['Myntra_SKU'] || rowData['Myntra SKU'] || rowData['myntra_sku'];
          const amazonSku = rowData['Amazon_SKU'] || rowData['Amazon SKU'] || rowData['amazon_sku'];
          const flipkartSku = rowData['Flipkart_SKU'] || rowData['Flipkart SKU'] || rowData['flipkart_sku'];
          const nykaaSku = rowData['Nykaa_SKU'] || rowData['Nykaa SKU'] || rowData['nykaa_sku'];
          const ajioSku = rowData['Ajio_SKU'] || rowData['Ajio SKU'] || rowData['ajio_sku'];
          const categories = rowData['Categories'] || rowData['categories'] || rowData['Category'];

          if (localSku) {
            const mappingData = {
              localSku: localSku,
              categories: categories || '',
              platforms: {}
            };

            if (myntraSku) {
              mappingData.platforms.myntra = myntraSku;
              mapping.set(`myntra_${myntraSku.toLowerCase()}`, mappingData);
            }
            if (amazonSku) {
              mappingData.platforms.amazon = amazonSku;
              mapping.set(`amazon_${amazonSku.toLowerCase()}`, mappingData);
            }
            if (flipkartSku) {
              mappingData.platforms.flipkart = flipkartSku;
              mapping.set(`flipkart_${flipkartSku.toLowerCase()}`, mappingData);
            }
            if (nykaaSku) {
              mappingData.platforms.nykaa = nykaaSku;
              mapping.set(`nykaa_${nykaaSku.toLowerCase()}`, mappingData);
            }
            if (ajioSku) {
              mappingData.platforms.ajio = ajioSku;
              mapping.set(`ajio_${ajioSku.toLowerCase()}`, mappingData);
            }

            mapping.set(`local_${localSku.toLowerCase()}`, mappingData);
            mapping.set(localSku.toLowerCase(), mappingData);
          }
        }

        setSkuMapping(mapping);
        setMappingLoaded(true);
        console.log(`✅ Loaded ${mapping.size} SKU mappings for Summary Section`);
      } catch (error) {
        console.error('Error loading SKU mapping:', error);
        setMappingLoaded(true);
      }
    };

    loadSkuMapping();
  }, []);

  const getLocalSkuMapping = (platformSku, platform) => {
    if (!platformSku || !skuMapping.size) {
      return { localSku: platformSku, category: '', originalSku: platformSku, mapped: false };
    }

    const mappingKeys = [
      `${platform}_${platformSku.toLowerCase()}`,
      `local_${platformSku.toLowerCase()}`,
      platformSku.toLowerCase()
    ];

    for (const mappingKey of mappingKeys) {
      const mappingData = skuMapping.get(mappingKey);
      if (mappingData) {
        return {
          localSku: mappingData.localSku,
          category: mappingData.categories,
          originalSku: platformSku,
          mapped: true
        };
      }
    }

    return { localSku: platformSku, category: '', originalSku: platformSku, mapped: false };
  };

  const formatCurrency = amount => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const formatNumber = num => Number(num || 0).toLocaleString('en-IN');

  const handleFilterChange = range => setFilterRange(range);

  const getRecordDate = record => {
    if (!record) return null;
    if (record.startDate) return record.startDate;
    if (record.endDate) return record.endDate;
    if (record.uploadedAt) return record.uploadedAt.split('T')[0];
    if (record.date) return new Date(record.date).toISOString().split('T')[0];
    return null;
  };

  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const getDayBeforeYesterdayDate = () => {
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);
    return dayBefore.toISOString().split('T')[0];
  };

  const filteredRecords = useMemo(() => {
    if (!filterRange.isActive) return safeRecords;
    return safeRecords.filter(record => {
      const d = getRecordDate(record);
      return d && d >= filterRange.startDate && d <= filterRange.endDate;
    });
  }, [safeRecords, filterRange]);

  const platformSummary = useMemo(() => {
    if (!Array.isArray(filteredRecords)) return {};

    return filteredRecords.reduce((acc, r) => {
      if (!r) return acc;

      let key = r.platform || 'Unknown';

      if (key.toLowerCase() === 'myntra' && r.reportType) {
        const businessUnit = r.businessUnit || r.source || 'PPMP';
        key = `myntra_${businessUnit.toUpperCase()}_${r.reportType.toUpperCase()}`;
      }

      if (!acc[key]) {
        acc[key] = {
          orders: 0,
          sales: 0,
          returns: 0,
          refund: 0,
          stock: 0,
          recordCount: 0,
          platform: r.platform,
          businessUnit: r.businessUnit || 'PPMP',
          reportType: r.reportType || reportType
        };
      }

      acc[key].recordCount += 1;

      if (reportType === 'orders') {
        acc[key].orders += r.totalOrders || 0;
        acc[key].sales += r.totalSales || 0;
      } else if (reportType === 'returns') {
        acc[key].returns += r.totalReturns || 0;
        acc[key].refund += r.totalRefundAmount || 0;
      } else if (reportType === 'inventory') {
        acc[key].stock += r.totalStock || 0;
      }

      return acc;
    }, {});
  }, [filteredRecords, reportType]);

  const yesterdayComparison = useMemo(() => {
    const yesterdayDate = getYesterdayDate();
    const dayBeforeDate = getDayBeforeYesterdayDate();

    if (!Array.isArray(safeRecords)) {
      return { yesterday: {}, dayBefore: {} };
    }

    const yesterdayRecords = safeRecords.filter(r => r && getRecordDate(r) === yesterdayDate);
    const dayBeforeRecords = safeRecords.filter(r => r && getRecordDate(r) === dayBeforeDate);

    const calculatePlatformSales = (recordsArray) => {
      if (!Array.isArray(recordsArray)) return {};

      return recordsArray.reduce((acc, r) => {
        if (!r) return acc;

        let key = r.platform || 'Unknown';

        if (key.toLowerCase() === 'myntra') {
          const businessUnit = r.businessUnit || r.source || 'PPMP';
          key = `myntra_${businessUnit.toUpperCase()}_${r.reportType ? r.reportType.toUpperCase() : 'ORDERS'}`;
        }

        if (!acc[key]) {
          acc[key] = {
            sales: 0,
            orders: 0,
            returns: 0,
            refund: 0,
            stock: 0,
            recordCount: 0,
            platform: r.platform,
            businessUnit: r.businessUnit || 'PPMP',
            reportType: r.reportType || reportType
          };
        }

        acc[key].recordCount += 1;
        acc[key].sales += r.totalSales || 0;
        acc[key].orders += r.totalOrders || 0;
        acc[key].returns += r.totalReturns || 0;
        acc[key].refund += r.totalRefundAmount || 0;
        acc[key].stock += r.totalStock || 0;

        return acc;
      }, {});
    };

    return {
      yesterday: calculatePlatformSales(yesterdayRecords),
      dayBefore: calculatePlatformSales(dayBeforeRecords)
    };
  }, [safeRecords, reportType]);

  const skuSummary = useMemo(() => {
    const localSkuPrimaryValueAcc = {}; 
    const allSkuSales = {}; 
    const allSkuInventory = {}; 
    const debugInfo = {};

    if (!Array.isArray(filteredRecords)) {
      return { local: {}, debug: {}, lowSalesHighInventory: [] };
    }

    console.log('🔄 Processing', filteredRecords.length, 'records for SKU aggregation...');

    filteredRecords.forEach((r, recordIndex) => {
      if (!r || !r.skus || typeof r.skus !== 'object') {
        return;
      }

      const recordKey = `${r.platform || 'Unknown'}_${r.businessUnit || 'UNKNOWN'}_${r.reportType || reportType}`;

      Object.entries(r.skus).forEach(([originalSku, val]) => {
        if (!originalSku || val === null || val === undefined) return;

        const numericValue = Number(val) || 0;

        const mappingResult = getLocalSkuMapping(originalSku, r.platform?.toLowerCase() || 'local');
        const localSku = mappingResult.localSku;

        if (!localSkuPrimaryValueAcc[localSku]) {
          localSkuPrimaryValueAcc[localSku] = 0;
          debugInfo[localSku] = {
            platforms: {},
            originalSkus: new Set(),
            totalValue: 0, 
            recordDetails: [],
            mapped: mappingResult.mapped
          };
        }

        if (reportType === 'orders') {
          localSkuPrimaryValueAcc[localSku] += numericValue;
        } else if (reportType === 'returns') {
          localSkuPrimaryValueAcc[localSku] += numericValue;
        } else if (reportType === 'inventory') {
          localSkuPrimaryValueAcc[localSku] += numericValue;
        }

        if (r.reportType === 'orders' && !isNaN(numericValue)) {
            allSkuSales[localSku] = (allSkuSales[localSku] || 0) + numericValue;
        }
        if (r.reportType === 'inventory' && !isNaN(numericValue)) {
            allSkuInventory[localSku] = (allSkuInventory[localSku] || 0) + numericValue;
        }

        if (!debugInfo[localSku].platforms[recordKey]) {
          debugInfo[localSku].platforms[recordKey] = 0;
        }
        debugInfo[localSku].platforms[recordKey] += numericValue;
        debugInfo[localSku].originalSkus.add(originalSku);
        debugInfo[localSku].recordDetails.push({
          platform: r.platform,
          businessUnit: r.businessUnit,
          reportType: r.reportType,
          originalSku,
          value: numericValue,
          recordIndex
        });
      });
    });

    const filteredLocalSkus = Object.entries(localSkuPrimaryValueAcc).filter(([sku]) =>
      sku && sku.toLowerCase().includes((skuSearchTerm || '').toLowerCase())
    );

    const sortedLocalSkus = filteredLocalSkus
      .sort(([,a], [,b]) => (Number(b) || 0) - (Number(a) || 0))
      .slice(0, 50); 

    const lowSalesHighInventory = [];

    const salesValues = Object.values(allSkuSales).filter(val => val > 0).sort((a, b) => a - b);
    const inventoryValues = Object.values(allSkuInventory).filter(val => val > 0).sort((a, b) => a - b);

    const absoluteLowSalesThreshold = 1000;
    const percentileLowSalesThreshold = salesValues.length > 0 ? salesValues[Math.floor(salesValues.length * 0.10)] : 0; 
    const finalLowSalesThreshold = Math.min(absoluteLowSalesThreshold, percentileLowSalesThreshold);

    const highInventoryThreshold = inventoryValues.length > 0 ? inventoryValues[Math.floor(inventoryValues.length * 0.75)] : 0;

    const allUniqueSkus = new Set([...Object.keys(allSkuSales), ...Object.keys(allSkuInventory)]);

    allUniqueSkus.forEach(sku => {
        const sales = allSkuSales[sku] || 0;
        const inventory = allSkuInventory[sku] || 0;

        const isTopSkuInPrimaryReport = sortedLocalSkus.some(([topSku,]) => topSku === sku);

        if (inventory > 0 && sales <= finalLowSalesThreshold && inventory >= highInventoryThreshold && !isTopSkuInPrimaryReport) {
            lowSalesHighInventory.push({
                sku,
                sales,
                inventory,
                debugData: debugInfo[sku] || {}
            });
        }
    });

    const filteredLowSalesHighInventory = lowSalesHighInventory
      .filter(item => item.sku.toLowerCase().includes((skuSearchTerm || '').toLowerCase()))
      .sort((a, b) => b.inventory - a.inventory)
      .slice(0, 50); 

    if (skuSearchTerm && skuSearchTerm.length > 3) {
      const matchingSku = Object.keys(debugInfo).find(sku =>
        sku.toLowerCase().includes(skuSearchTerm.toLowerCase())
      );
      if (matchingSku) {
        console.log('🔍 DETAILED SKU BREAKDOWN for:', matchingSku);
        console.log('═══════════════════════════════════════');
        console.log('📊 Platform Breakdown:');
        Object.entries(debugInfo[matchingSku].platforms).forEach(([platform, value]) => {
          console.log(`   ${platform}: ${reportType === 'orders' ? formatCurrency(value) : formatNumber(value)}`);
        });
        console.log('───────────────────────────────────────');
        console.log('🔖 Original SKUs mapped:', Array.from(debugInfo[matchingSku].originalSkus));
        const searchedSkuPrimaryValue = localSkuPrimaryValueAcc[matchingSku] || 0;
        console.log('💰 Final Total (Primary Value):', reportType === 'orders' ? formatCurrency(searchedSkuPrimaryValue) : formatNumber(searchedSkuPrimaryValue));
        console.log('🗺️ Was Mapped:', debugInfo[matchingSku].mapped ? 'Yes' : 'No');
        console.log('📝 Record Details:', debugInfo[matchingSku].recordDetails);
        console.log('═══════════════════════════════════════');
      }
    }

    return {
      local: Object.fromEntries(sortedLocalSkus),
      debug: debugInfo,
      lowSalesHighInventory: filteredLowSalesHighInventory
    };
  }, [filteredRecords, skuSearchTerm, mappingLoaded, skuMapping, reportType, safeRecords]);

  const getPlatformIcon = (platform) => {
    if (!platform) return 'fas fa-shopping-cart';

    const icons = {
      myntra: 'fas fa-shopping-bag',
      amazon: 'fab fa-amazon',
      flipkart: 'fas fa-store',
      nykaa: 'fas fa-heart',
      ajio: 'fas fa-tshirt',
      delhi_warehouse: 'fas fa-warehouse'
    };
    return icons[platform.toLowerCase()] || 'fas fa-shopping-cart';
  };

  const getPlatformDisplayName = (key) => {
    if (!key) return 'Unknown';

    if (key.includes('myntra_')) {
      const parts = key.split('_');
      const businessUnit = parts[1]; 
      const reportType = parts[2]; 
      return `Myntra ${businessUnit} - ${reportType}`;
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  return (
    <div className="summary-section">

      <div className="summary-header">
        <div className="summary-controls">
          <DateRangeFilter
            onFilterChange={handleFilterChange}
            records={safeRecords}
          />

          <div className="control-group">
            <input
              type="text"
              placeholder="Search Local SKUs..."
              value={skuSearchTerm}
              onChange={(e) => setSkuSearchTerm(e.target.value)}
              className="sku-search-input"
            />
          </div>

          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className={`debug-toggle-btn ${showDebugInfo ? 'active' : ''}`}
            title="Toggle debug information"
          >
            🐛 Debug
          </button>
        </div>
      </div>

      {}
      {mappingLoaded && (
        <div className="mapping-status">
          {skuMapping.size > 0 ? (
            <div className="mapping-active">
              ✅ SKU Mapping Active: {skuMapping.size} mappings loaded
            </div>
          ) : (
            <div className="mapping-inactive">
              ⚠️ SKU Mapping not available - showing original SKUs
            </div>
          )}
        </div>
      )}

      {}
      <div className="platform-summary-section">
        <h3>🏪 Platform Performance Summary</h3>
        <div className="scrollable-content">
          <div className="platform-grid">
            {Object.entries(platformSummary).map(([key, data]) => (
              <div key={key} className="platform-card">
                <div className="platform-card-header">
                  <i className={getPlatformIcon(data.platform || key.split('_')[0])}></i>
                  <div className="platform-info">
                    <h4>{getPlatformDisplayName(key)}</h4>
                    <span className="record-count">{data.recordCount} records</span>
                  </div>
                </div>

                <div className="platform-metrics">
                  {reportType === 'orders' && (
                    <>
                      <div className="metric">
                        <span className="metric-label">Total Sales</span>
                        <span className="metric-value">{formatCurrency(data.sales)}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Total Orders</span>
                        <span className="metric-value">{formatNumber(data.orders)}</span>
                      </div>
                    </>
                  )}

                  {reportType === 'returns' && (
                    <>
                      <div className="metric">
                        <span className="metric-label">Total Returns</span>
                        <span className="metric-value">{formatNumber(data.returns)}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Refund Amount</span>
                        <span className="metric-value">{formatCurrency(data.refund)}</span>
                      </div>
                    </>
                  )}

                  {reportType === 'inventory' && (
                    <div className="metric">
                      <span className="metric-label">Total Stock</span>
                      <span className="metric-value">{formatNumber(data.stock)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className="yesterday-tabs-section">
        <div className="yesterday-header">
          <h3>📈 Daily Sales Comparison - Platform Wise</h3>
          <div className="date-info">
            <span className="date-label">Yesterday: {getYesterdayDate()}</span>
            <span className="date-separator">|</span>
            <span className="date-label">Day Before: {getDayBeforeYesterdayDate()}</span>
          </div>
        </div>

        {}
        <div className="yesterday-tab-nav">
          <button
            className={`tab-btn ${activeYesterdayTab === 'yesterday' ? 'active' : ''}`}
            onClick={() => setActiveYesterdayTab('yesterday')}
          >
            📅 Yesterday ({getYesterdayDate()})
          </button>
        </div>

        {}
        <div className="yesterday-tab-content">
          <div className="scrollable-content">
            <div className="platform-grid">
              {Object.entries(yesterdayComparison[activeYesterdayTab] || {}).map(([key, data]) => (
                <div key={key} className="platform-card yesterday-card">
                  <div className="platform-card-header">
                    <i className={getPlatformIcon(data.platform || key.split('_')[0])}></i>
                    <div className="platform-info">
                      <h4>{getPlatformDisplayName(key)}</h4>
                      <span className="record-count">{data.recordCount} records</span>
                    </div>
                  </div>

                  <div className="platform-metrics">
                    <div className="metric">
                      <span className="metric-label">Sales</span>
                      <span className="metric-value">{formatCurrency(data.sales)}</span>
                    </div>

                    {reportType === 'orders' && (
                      <div className="metric">
                        <span className="metric-label">Orders</span>
                        <span className="metric-value">{formatNumber(data.orders)}</span>
                      </div>
                    )}

                    {reportType === 'returns' && (
                      <>
                        <div className="metric">
                          <span className="metric-label">Returns</span>
                          <span className="metric-value">{formatNumber(data.returns)}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Refunds</span>
                          <span className="metric-value">{formatCurrency(data.refund)}</span>
                        </div>
                      </>
                    )}

                    {reportType === 'inventory' && (
                      <div className="metric">
                        <span className="metric-label">Stock</span>
                        <span className="metric-value">{formatNumber(data.stock)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="sku-analysis-tabs">
        {}
        <div className="sku-tab-nav"   style={{
    display: 'flex',
    gap: '12px',
    marginBottom: '10px', 
  }}>
          <button
            className={`sku-tab-btn ${activeSkuTab === 'top' ? 'active' : ''}`}
            onClick={() => setActiveSkuTab('top')}
           style={{padding:'5px',borderRadius:'5px'}}>
            Top SKU Performance Analysis
            <span className="sku-count-badge">
              {Object.keys(skuSummary.local).length}
            </span>
          </button>

          <button
            className={`sku-tab-btn ${activeSkuTab === 'lowSalesHighInventory' ? 'active' : ''}`}
            onClick={() => setActiveSkuTab('lowSalesHighInventory')}
            disabled={skuSummary.lowSalesHighInventory.length === 0}
              style={{padding:'5px',borderRadius:'5px'}}
          >
            Low Sales, High Inventory 
            <span className="sku-count-badge">
              {skuSummary.lowSalesHighInventory.length}
            </span>
          </button>
        </div>

        {}
        <div className="sku-tab-content">
          {}
          {activeSkuTab === 'top' && (
            <>
              <div className="sku-tab-header">
                <h3 className="sku-tab-title">
                  🏆 Top {reportType === 'orders' ? 'Sales' : reportType === 'returns' ? 'Returns' : 'Inventory'} Performance SKUs
                </h3>
              </div>

              <div className="sku-grid">
                {Object.keys(skuSummary.local).length > 0 ? (
                  Object.entries(skuSummary.local).map(([sku, value]) => {
                    const debugData = skuSummary.debug[sku];
                    const isSearched = skuSearchTerm && sku.toLowerCase().includes(skuSearchTerm.toLowerCase());

                    return (
                      <div key={sku} className={`sku-item local-sku ${isSearched ? 'searched-sku' : ''}`}>
                        <div className="sku-header">
                          <span className="sku-code">{sku}</span>
                          <div className="sku-badges">
                            {debugData?.mapped && <span className="sku-badge mapped">Mapped</span>}
                          </div>
                        </div>
                        <div className="sku-value">
                          {reportType === 'orders' ? formatCurrency(value) : formatNumber(value)}
                        </div>

                        {}
                        {(showDebugInfo || isSearched) && debugData && (
                          <div className="sku-debug-info">
                            <div className="debug-header">
                              <span className="debug-title">Platform Breakdown:</span>
                            </div>
                            <div className="debug-details">
                              {Object.entries(debugData.platforms).map(([platform, platformValue]) => (
                                <div key={platform} className="debug-item">
                                  <span className="debug-platform">{platform}:</span>
                                  <span className="debug-value">
                                    {reportType === 'orders' ? formatCurrency(platformValue) : formatNumber(platformValue)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data-message">
                    <div className="empty-state-icon">📊</div>
                    {skuMapping.size > 0 ?
                      'No matching top performing SKUs found. Try adjusting your search or filter.' :
                      'SKU mapping not available. Upload Master_SKU_Mapping.csv file.'
                    }
                  </div>
                )}
              </div>
            </>
          )}

          {}
          {activeSkuTab === 'lowSalesHighInventory' && (
            <>
              <div className="sku-tab-header">
                <h3 className="sku-tab-title">
                  ⚠️ Low Sales, High Inventory SKUs - Priority Push Required
                </h3>
              </div>

              <div className="sku-grid">
                {skuSummary.lowSalesHighInventory.length > 0 ? (
                  skuSummary.lowSalesHighInventory.map((item) => {
                    const { sku, sales, inventory, debugData } = item;
                    const isSearched = skuSearchTerm && sku.toLowerCase().includes(skuSearchTerm.toLowerCase());

                    return (
                      <div key={sku} className={`sku-item low-sales-high-inventory-sku ${isSearched ? 'searched-sku' : ''}`}>
                        <div className="sku-header">
                          <span className="sku-code">{sku}</span>
                          <div className="sku-badges">
                            {debugData?.mapped && <span className="sku-badge mapped">Mapped</span>}
                            {}
                          </div>
                        </div>
                        <div className="sku-value">
                          <span className="metric-label">Sales:</span> {formatCurrency(sales)} <br/>
                          <span className="metric-label">Inventory:</span> {formatNumber(inventory)}
                        </div>

                        {}
                        {(showDebugInfo || isSearched) && debugData && (
                          <div className="sku-debug-info">
                            <div className="debug-header">
                              <span className="debug-title">Platform Breakdown:</span>
                            </div>
                            <div className="debug-details">
                              {Object.entries(debugData.platforms || {}).map(([platform, platformValue]) => (
                                <div key={platform} className="debug-item">
                                  <span className="debug-platform">{platform}:</span>
                                  <span className="debug-value">
                                    {formatNumber(platformValue)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data-message">
                    <div className="empty-state-icon">🎉</div>
                    Great! No SKUs found with low sales and high inventory. Your inventory management is optimal.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SummarySection;