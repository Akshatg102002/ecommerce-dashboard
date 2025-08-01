import React, { useState, useEffect, useMemo } from 'react';
import AdsUpload from './Adsupload'; 

const Projections = () => {
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [adsData, setAdsData] = useState([]);
  const [skuInput, setSkuInput] = useState('');
  const [projectionDays, setProjectionDays] = useState('30');
  const [projectionData, setProjectionData] = useState(null);
  const [topSkusData, setTopSkusData] = useState([]);
  const [userBudget, setUserBudget] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  const [allRecords, setAllRecords] = useState([]);
  const [recordsLoaded, setRecordsLoaded] = useState(false);

  const [skuMapping, setSkuMapping] = useState(new Map());
  const [mappingLoaded, setMappingLoaded] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

  useEffect(() => {
    const fetchAllRecords = async () => {
      setDataLoading(true);
      try {
        console.log('🔄 Fetching records from MongoDB...');
        const response = await fetch(`${API_BASE_URL}/records`);

        if (!response.ok) {
          throw new Error(`Failed to fetch records: ${response.status}`);
        }

        const records = await response.json();
        console.log('✅ Fetched', records.length, 'records from MongoDB');

        setAllRecords(records);
        setRecordsLoaded(true);
      } catch (error) {
        console.error('❌ Error fetching records:', error);
        setError(`Failed to load data: ${error.message}`);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAllRecords();
  }, []);

  useEffect(() => {
    const loadSkuMapping = async () => {
      try {
        const response = await fetch('/Master_SKU_Mapping.csv');
        if (!response.ok) {
          console.warn('Master SKU mapping file not found');
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
          }
        }

        setSkuMapping(mapping);
        setMappingLoaded(true);
        console.log(`✅ Projections: Loaded ${mapping.size} SKU mappings`);
      } catch (error) {
        console.error('Error loading SKU mapping:', error);
        setMappingLoaded(true);
      }
    };

    loadSkuMapping();
  }, []);

  const enhancedRecords = useMemo(() => {
    if (!mappingLoaded || !skuMapping.size || !allRecords.length) {
      return allRecords;
    }

    return allRecords.map(record => {
      const platformName = record.platform?.toLowerCase() || 'unknown';

      if (record.skus && typeof record.skus === 'object') {
        const enhancedSkus = {};
        const skuCategories = {};

        Object.entries(record.skus).forEach(([sku, value]) => {
          const mappingKey = `${platformName}_${sku.toLowerCase()}`;
          const mappingData = skuMapping.get(mappingKey);

          const localSku = mappingData ? mappingData.localSku : sku;
          const category = mappingData ? mappingData.categories : '';

          if (enhancedSkus[localSku]) {
            enhancedSkus[localSku] += Number(value) || 0;
          } else {
            enhancedSkus[localSku] = Number(value) || 0;
          }

          if (category) skuCategories[localSku] = category;
        });

        return {
          ...record,
          skus: enhancedSkus,
          skuCategories,
          mappingApplied: true
        };
      }

      return record;
    });
  }, [allRecords, skuMapping, mappingLoaded]);

  const ordersRecords = useMemo(() => {
    return enhancedRecords.filter(record => 
      record.reportType === 'orders' || record.reportType === 'sjit' || record.reportType === 'ppmp'
    );
  }, [enhancedRecords]);

  const filteredRecords = useMemo(() => {
    if (selectedPlatform === 'all') {
      return ordersRecords;
    }
    return ordersRecords.filter(record => record.platform === selectedPlatform);
  }, [ordersRecords, selectedPlatform]);

 const calculateLocalProjections = useMemo(() => {
  if (!skuInput.trim()) return null;
  const sku = skuInput.trim().toLowerCase();

  const skuRecords = filteredRecords.filter(
    (r) => r.skus && r.skus[sku] > 0
  );

  if (!skuRecords.length) {
    return {
      error: `No sales data found for SKU "${sku}".`,
      sku,
    };
  }

  const timeSeries = skuRecords
    .map((r) => ({
      date: new Date(r.startDate || r.endDate || r.uploadedAt),
      sales: Number(r.skus[sku]) || 0,
      platform: r.platform,
      businessUnit: r.businessUnit || "PPMP",
    }))
    .filter((p) => p.sales > 0)
    .sort((a, b) => a.date - b.date);

  const totalSales = timeSeries.reduce((sum, p) => sum + p.sales, 0);
  const n = timeSeries.length;

  const dateRange =
    n > 1
      ? (timeSeries[n - 1].date.getTime() - timeSeries[0].date.getTime()) /
        (1000 * 60 * 60 * 24)
      : n;
  const coverageDays = Math.max(1, dateRange);

  const avgDailySales = totalSales / coverageDays;

  const mid = Math.floor(n / 2);
  const earlyAvg =
    timeSeries
      .slice(0, mid)
      .reduce((acc, cur) => acc + cur.sales, 0) / Math.max(1, mid);
  const recentAvg =
    timeSeries
      .slice(mid)
      .reduce((acc, cur) => acc + cur.sales, 0) /
    Math.max(1, n - mid);

  let growthRate = earlyAvg
    ? ((recentAvg - earlyAvg) / earlyAvg) * 100
    : recentAvg
    ? 100
    : 0;
  growthRate = Math.min(Math.max(growthRate, -50), 200); 

  const seasonalFactors = {
    1: 0.8,
    2: 0.9,
    3: 1.1,
    4: 1.2,
    5: 1.0,
    6: 0.9,
    7: 0.8,
    8: 1.1,
    9: 1.3,
    10: 1.4,
    11: 1.6,
    12: 1.5,
  };
  const currentMonth = new Date().getMonth() + 1;
  const seasonality = seasonalFactors[currentMonth] || 1;

  let projectedSales =
    avgDailySales * (1 + growthRate / 100) * seasonality * Number(projectionDays);
  if (projectedSales < 0) projectedSales = avgDailySales * Number(projectionDays);

  let avgOrderValue = 800; 
  if (totalSales > 0 && n > 0) {
    avgOrderValue = Math.max(500, Math.min(2000, totalSales / n));
  }

  if (
    selectedPlatform.toLowerCase() === "myntra" &&
    adsData.length > 0
  ) {
    <AdsUpload onAdsData={setAdsData} />
    const adsRecord = adsData.find(
      (ad) => ad.sku && ad.sku.trim().toLowerCase() === sku
    );
    if (adsRecord && adsRecord.budget && adsRecord.impressions && adsRecord.spend) {
      const spendRatio = adsRecord.budget / (adsRecord.spend || 1);

      const boostFactor = Math.min(0.7, 0.5 * spendRatio);
      projectedSales *= 1 + boostFactor;
    }
  }

  const projectedQuantity = Math.max(1, Math.ceil(projectedSales / avgOrderValue));

  const confidenceScore = Math.min(
    1,
    Math.log10(n + 1) / 2 + Math.min(totalSales / 15000, 1) * 0.5
  );
  const confidence =
    confidenceScore > 0.75 ? "High" : confidenceScore > 0.5 ? "Medium" : "Low";

  const platformStats = {};
  skuRecords.forEach((r) => {
    const key = r.platform + (r.businessUnit ? `_${r.businessUnit}` : "");
    if (!platformStats[key]) {
      platformStats[key] = {
        sales: 0,
        records: 0,
        platform: r.platform,
        businessUnit: r.businessUnit || "PPMP",
      };
    }
    platformStats[key].sales += r.skus[sku];
    platformStats[key].records += 1;
  });
  Object.values(platformStats).forEach((stat) => {
    stat.roi =
      adsData.length && adsData.find(a => a.sku?.toLowerCase() === sku)
        ? (stat.sales / adsData.find(a => a.sku?.toLowerCase() === sku).spend).toFixed(2)
        : null;
  });

  const platformRecommendations = {};
  Object.entries(platformStats).forEach(([platKey, stat]) => {
    const share = (stat.sales / totalSales) * 100 || 0;
    platformRecommendations[platKey] = {
      allocation: Math.round(share),
      strategy:
        share > 40
          ? "Primary platform - strong focus"
          : share > 15
          ? "Growth platform - expand"
          : "Test platform - monitor",
      sales: stat.sales,
      roi: stat.roi,
    };
  });

  return {
    sku,
    projectedSales: Math.round(projectedSales),
    projectedQuantity,
    growthRate: growthRate.toFixed(1),
    confidence,
    avgOrderValue: Math.round(avgOrderValue),
    seasonality,
    projectionDays: Number(projectionDays),
    historical: {
      totalSales,
      totalRecords: n,
      coverageDays,
      averageDailySales: avgDailySales.toFixed(2),
    },
    insights: [
      `Average daily sales: ₹${avgDailySales.toFixed(0)}`,
      `Data covers ${coverageDays.toFixed(0)} days across ${n} records`,
      `Current seasonal multiplier: ${seasonality.toFixed(2)}`,
    ],
    adsRecord: adsData.find(ad => ad.sku.trim().toLowerCase() === sku) || null,
    opportunities: [
      projectedSales > totalSales
        ? "Expected growth; consider scaling stock."
        : "Stable inventory advised.",
      "Use ad budget effectiveness to boost sales efficiently.",
    ],
    risks: [
      n < 10 ? "Limited data; results may vary." : "Adequate data quality.",
      growthRate < -20 ? "Sales decline trend detected." : "Stable or positive trend.",
    ],
    platformRecommendations,
    mappingLoaded,
    totalMappings: skuMapping.size,
  };
}, [adsData,skuInput, filteredRecords, projectionDays, selectedPlatform, adsData, skuMapping, mappingLoaded]);

  const topSkusFromMongoDB = useMemo(() => {
    const skuAggregation = {};

    filteredRecords.forEach(record => {
      if (record.skus) {
        Object.entries(record.skus).forEach(([sku, sales]) => {
          const numericSales = Number(sales) || 0;
          if (numericSales > 0) {
            if (!skuAggregation[sku]) {
              skuAggregation[sku] = {
                totalSales: 0,
                platforms: new Set(),
                records: 0,
                businessUnits: new Set()
              };
            }
            skuAggregation[sku].totalSales += numericSales;
            skuAggregation[sku].platforms.add(record.platform);
            skuAggregation[sku].records += 1;
            if (record.businessUnit) {
              skuAggregation[sku].businessUnits.add(record.businessUnit);
            }
          }
        });
      }
    });

    return Object.entries(skuAggregation)
      .filter(([_, data]) => data.totalSales > 100) 
      .map(([sku, data]) => {
        const growthEstimate = Math.min(50, Math.max(-20, (Math.random() - 0.3) * 40));
        return {
          sku,
          totalSales: data.totalSales,
          platforms: Array.from(data.platforms),
          businessUnits: Array.from(data.businessUnits),
          projections: {
            projectedSales: Math.round(data.totalSales * (1 + growthEstimate / 100)),
            projectedTotalQuantity: Math.ceil(data.totalSales / 800),
            growthRate: growthEstimate
          }
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 6);
  }, [filteredRecords]);

  const handleGenerateProjection = () => {
    if (!skuInput.trim()) {
      setError('Please enter a SKU code to analyze');
      return;
    }

    if (!recordsLoaded) {
      setError('Data still loading from MongoDB. Please wait...');
      return;
    }

    setLoading(true);
    setError(null);

    setTimeout(() => {
      const result = calculateLocalProjections;
      if (result?.error) {
        setError(result.error);
        setProjectionData(null);
      } else {
        setProjectionData(result);
      }
      setLoading(false);
    }, 1200);
  };

  const formatNumber = (num) => {
    if (!num || isNaN(num)) return '0';
    return Math.round(num).toLocaleString('en-IN');
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  };

  const getConfidenceClass = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'confidence-badge high';
      case 'medium': return 'confidence-badge medium';
      case 'low': return 'confidence-badge low';
      default: return 'confidence-badge low';
    }
  };

  const platforms = [
    { value: 'all', label: 'All Platforms', icon: '🌐' },
    { value: 'myntra', label: 'Myntra', icon: '👗' },
    { value: 'amazon', label: 'Amazon', icon: '📦' },
    { value: 'flipkart', label: 'Flipkart', icon: '🛒' },
    { value: 'nykaa', label: 'Nykaa', icon: '💄' },
    { value: 'ajio', label: 'Ajio', icon: '👠' }
  ];

  const daysOptions = [
    { value: '7', label: '7 Days' },
    { value: '15', label: '15 Days' },
    { value: '30', label: '30 Days' },
    { value: '60', label: '60 Days' },
    { value: '90', label: '90 Days' }
  ];

  if (dataLoading) {
    return (
      <div className="projections-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h3>Loading Data from MongoDB</h3>
          <p>Fetching records for analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="projections-container">
      {}
      <div className="projections-header">
        <div className="projections-header-content">
          <h2 className="projections-title">
            AI-Powered Sales Projections
          </h2>

          {}
          <div className="data-source-info">
            <span className="data-badge">
              {allRecords.length} records loaded from MongoDB
            </span>
          </div>
        </div>
      </div>

      <div className="projections-main">
        {}
        <div className="search-controls">
          <div className="search-grid">
            <div className="form-group">
              <label className="form-label">Local SKU Code</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  placeholder="Enter local SKU code for analysis"
                  className="search-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerateProjection()}
                />
                <div className="search-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Platform</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="form-select"
              >
                {platforms.map(platform => (
                  <option key={platform.value} value={platform.value}>
                    {platform.icon} {platform.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Projection Period</label>
              <select
                value={projectionDays}
                onChange={(e) => setProjectionDays(e.target.value)}
                className="form-select"
              >
                {daysOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <button
                onClick={handleGenerateProjection}
                disabled={loading || !skuInput.trim() || !recordsLoaded}
                className="ai-button"
              >
                {loading ? (
                  <span className="ai-button-loading">
                    <div className="loading-spinner"></div>
                    Processing MongoDB data...
                  </span>
                ) : (
                  'Generate Forecast'
                )}
              </button>
            </div>
          </div>
        </div>

        {}
        {error && (
          <div className="error-message">
            <div className="error-content">
              <h3>⚠️ Analysis Issue</h3>
              <p>{error}</p>
              <div className="error-suggestions">
                <h4>Troubleshooting:</h4>
                <ul>
                  <li>Verify the SKU exists in your MongoDB data</li>
                  <li>Check if data was uploaded for the selected platform</li>
                  <li>Try a different SKU from the top performers below</li>
                  <li>Ensure your MongoDB connection is working</li>
                </ul>
              </div>
            </div>
            <button onClick={() => setError(null)} className="close-error">✕</button>
          </div>
        )}

        {}
        {projectionData && !projectionData.error && (
          <div className="projection-results fade-in">
            {}
            <div className="algorithm-info">
              <p>
                Analyzed <strong>{projectionData.historicalData?.daysCovered} days</strong> from 
                <strong> {projectionData.historicalData?.totalRecords} MongoDB records</strong> with 
                <strong> {(projectionData.monthlySeasonality * 100).toFixed(0)}% Seasonal Adjustments.</strong>
              </p>
            </div>

            {}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <div className="metric-info">
                    <h3>Projected Sales</h3>
                    <div className="metric-value green">
                      {formatCurrency(projectionData.projectedSales)}
                    </div>
                  </div>
                  <div className="metric-icon green">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="metric-footer">
                  <span className={getConfidenceClass(projectionData.confidence)}>
                    {projectionData.confidence} Confidence
                  </span>
                  <p className="metric-subtitle">
                    From ₹{formatNumber(projectionData.historicalData?.totalSales)} historical (MongoDB)
                  </p>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <div className="metric-info">
                    <h3>Smart Inventory</h3>
                    <div className="metric-value blue">
                      {formatNumber(projectionData.projectedQuantity)} units
                    </div>
                  </div>
                  <div className="metric-icon blue">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
                    </svg>
                  </div>
                </div>
                <div className="metric-footer">
                  <p className="metric-subtitle">
                    +{projectionData.inventoryStrategy?.safetyStock} safety stock
                  </p>
                  <p className="metric-subtitle">
                    AOV: ₹{formatNumber(projectionData.historicalData?.averageOrderValue)}
                  </p>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <div className="metric-info">
                    <h3>Growth Trend</h3>
                    <div className={`metric-value ${projectionData.growthRate >= 0 ? 'green' : 'red'}`}>
                      {projectionData.growthRate >= 0 ? '+' : ''}{projectionData.growthRate}%
                    </div>
                  </div>
                  <div className={`metric-icon ${projectionData.growthRate >= 0 ? 'green' : 'red'}`}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d={projectionData.growthRate >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                  </div>
                </div>
                <div className="metric-footer">
                  <p className="metric-subtitle">MongoDB trend analysis</p>
                  <p className="metric-subtitle">
                    Daily avg: ₹{formatNumber(projectionData.historicalData?.averageDailySales)}
                  </p>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <div className="metric-info">
                    <h3>Data Quality</h3>
                    <div className="metric-value purple">
                      {projectionData.historicalData?.daysCovered} days
                    </div>
                  </div>
                  <div className="metric-icon purple">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="metric-footer">
                  <p className="metric-subtitle">
                    {projectionData.historicalData?.totalRecords} MongoDB records
                  </p>
                  <p className="metric-subtitle">
                    {projectionData.mappingApplied ? '✅' : '⚠️'} SKU Mapping
                  </p>
                </div>
              </div>
            </div>

            {}
            <div className="insights-section">
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-header">
                    <div className="insight-icon blue">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="insight-title">MongoDB Insights</h3>
                  </div>
                  <div className="insight-list">
                    {projectionData.marketInsights?.map((insight, index) => (
                      <div key={index} className="insight-item blue">
                        <span className="insight-bullet blue"></span>
                        <p className="insight-text">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-header">
                    <div className="insight-icon green">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="insight-title">Growth Opportunities</h3>
                  </div>
                  <div className="insight-list">
                    {projectionData.opportunities?.map((opportunity, index) => (
                      <div key={index} className="insight-item green">
                        <span className="insight-bullet green"></span>
                        <p className="insight-text">{opportunity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-header">
                    <div className="insight-icon yellow">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="insight-title">Risk Assessment</h3>
                  </div>
                  <div className="insight-list">
                    {projectionData.riskFactors?.map((risk, index) => (
                      <div key={index} className="insight-item yellow">
                        <span className="insight-bullet yellow"></span>
                        <p className="insight-text">{risk}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-header">
                    <div className="insight-icon purple">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="insight-title">Platform Strategy</h3>
                  </div>
                  <div className="platform-strategy">
                    {Object.entries(projectionData.platformRecommendations || {}).map(([platform, rec]) => (
                      <div key={platform} className="strategy-item">
                        <div className="strategy-header">
                          <h4 className="strategy-platform">{platform}</h4>
                          <span className="strategy-allocation">
                            {rec.allocation}%
                          </span>
                        </div>
                        <p className="strategy-description">{rec.strategy}</p>
                        <p className="strategy-performance">{rec.performance}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {}
        <div className="top-skus-section slide-up">
          <div className="top-skus-header">
            <h3 className="top-skus-title">
              📊 Top MongoDB SKUs - Next {projectionDays} Days
            </h3>
            <span className="platform-indicator">
              {platforms.find(p => p.value === selectedPlatform)?.icon} {platforms.find(p => p.value === selectedPlatform)?.label}
            </span>
          </div>

          {topSkusFromMongoDB.length > 0 ? (
            <div className="skus-grid">
              {topSkusFromMongoDB.map((sku, index) => (
                <div 
                  key={sku.sku} 
                  className="sku-card"
                  onClick={() => setSkuInput(sku.sku)}
                >
                  <div className="sku-card-header">
                    <span className="sku-rank">
                      #{index + 1}
                    </span>
                    <span className="sku-click-hint">Click to analyze</span>
                  </div>
                  <h4 className="sku-name">{sku.sku}</h4>
                  <div className="sku-metrics">
                    <div className="sku-metric">
                      <span className="sku-metric-label">Historical (MongoDB)</span>
                      <span className="sku-metric-value">
                        {formatCurrency(sku.totalSales)}
                      </span>
                    </div>
                    <div className="sku-metric">
                      <span className="sku-metric-label">Projected Sales</span>
                      <span className="sku-metric-value green">
                        {formatCurrency(sku.projections?.projectedSales || 0)}
                      </span>
                    </div>
                    <div className="sku-metric">
                      <span className="sku-metric-label">Growth Rate</span>
                      <span className={`sku-metric-value ${sku.projections?.growthRate >= 0 ? 'green' : 'red'}`}>
                        {sku.projections?.growthRate >= 0 ? '+' : ''}{sku.projections?.growthRate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="sku-platforms">
                    Platforms: {sku.platforms?.join(', ')} 
                    {sku.businessUnits?.length > 0 && ` | Units: ${sku.businessUnits.join(', ')}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="empty-state-title">No MongoDB data available</h3>
              <p className="empty-state-description">
                Upload sales data through the Upload Section to see SKU projections
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projections;