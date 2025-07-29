import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const Projections = () => {
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [skuInput, setSkuInput] = useState('');
  const [projectionDays, setProjectionDays] = useState('30');
  const [projectionData, setProjectionData] = useState(null);
  const [topSkusData, setTopSkusData] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mappingStatus, setMappingStatus] = useState({ applied: false, totalMappings: 0 });

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

  // Helper functions
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

  useEffect(() => {
    fetchTopSkusProjections();
  }, [selectedPlatform, projectionDays]);

  const fetchSkuProjections = async () => {
    if (!skuInput.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/projections/ai-projections?sku=${skuInput}&days=${projectionDays}&platform=${selectedPlatform}`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Projection data received:', data.data);
        setProjectionData(data.data);
        setAiInsights(data.data);
        setMappingStatus({
          applied: data.data.mappingApplied,
          totalMappings: data.data.totalMappings
        });
      } else {
        console.error('❌ API returned error:', data.error);
        // Set fallback data
        setProjectionData({
          projectedSales: 0,
          projectedQuantity: 0,
          confidence: 'Low',
          growthRate: 0,
          marketInsights: ['Unable to fetch data - please try again'],
          riskFactors: ['API connection error'],
          opportunities: ['Check server connection']
        });
      }
    } catch (error) {
      console.error('❌ Error fetching projections:', error);
      setProjectionData({
        projectedSales: 0,
        projectedQuantity: 0,
        confidence: 'Low',
        growthRate: 0,
        marketInsights: [`Error: ${error.message}`],
        riskFactors: ['Connection failed'],
        opportunities: ['Please check server status']
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopSkusProjections = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/projections/top-skus-projections?days=${projectionDays}&limit=10&platform=${selectedPlatform}`
      );
      const data = await response.json();
      
      if (data.success) {
        setTopSkusData(data.data);
      }
    } catch (error) {
      console.error('Error fetching top SKUs:', error);
    }
  };

  const getConfidenceClass = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'confidence-badge high';
      case 'medium': return 'confidence-badge medium';
      case 'low': return 'confidence-badge low';
      default: return 'confidence-badge low';
    }
  };

  const getCurrentPlatform = () => {
    return platforms.find(p => p.value === selectedPlatform) || platforms[0];
  };

  return (
    <div className="projections-container">
      {/* Header Section */}
      <div className="projections-header">
        <div className="projections-header-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <h1 className="projections-title">
                  🤖 AI-Powered Sales Projections
                </h1>
                <p className="projections-subtitle">
                  Get intelligent insights and forecasts using standardized local SKUs across all platforms
                </p>
                {mappingStatus.totalMappings > 0 && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '8px', 
                    fontSize: '0.875rem',
                    color: '#065f46',
                    marginTop: '0.5rem'
                  }}>
                    ✅ SKU Mapping Active: {mappingStatus.totalMappings} mappings loaded
                  </div>
                )}
              </div>
              
              {/* Platform Selector */}
              <div className="platform-selector">
                <label className="platform-selector-label">
                  Platform
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="platform-select"
                  >
                    {platforms.map(platform => (
                      <option key={platform.value} value={platform.value}>
                        {platform.icon} {platform.label}
                      </option>
                    ))}
                  </select>
                  <div className="platform-select-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="projections-main">
        {/* Search and Controls */}
        <div className="search-controls fade-in">
          <div className="search-grid">
            <div className="form-group">
              <label className="form-label">
                Local SKU Code
              </label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  placeholder="Enter local SKU code for detailed analysis"
                  className="search-input"
                  onKeyPress={(e) => e.key === 'Enter' && fetchSkuProjections()}
                />
                <div className="search-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Projection Period
              </label>
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

            <div className="form-group" style={{ alignItems: 'flex-end' }}>
              <button
                onClick={fetchSkuProjections}
                disabled={loading || !skuInput.trim()}
                className="ai-button"
              >
                {loading ? (
                  <div className="ai-button-loading">
                    <svg className="loading-spinner" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </div>
                ) : (
                  '🚀 Get AI Projections'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Platform Info Banner */}
        <div className="platform-banner slide-up">
          <div className="platform-banner-content">
            <div className="platform-info">
              <span className="platform-icon">{getCurrentPlatform().icon}</span>
              <div>
                <h3 className="platform-name">
                  Analyzing: {getCurrentPlatform().label}
                </h3>
                <p className="platform-description">
                  {selectedPlatform === 'all' 
                    ? 'Cross-platform analysis using standardized local SKUs for comprehensive insights'
                    : `Platform-specific analysis using mapped local SKUs for optimized strategies`
                  }
                </p>
              </div>
            </div>
            <div className="projection-period">
              <p className="projection-period-label">Projection Period</p>
              <p className="projection-period-value">{projectionDays} Days</p>
            </div>
          </div>
        </div>

        {/* AI Projection Results */}
        {projectionData && (
          <div className="fade-in">
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ background: '#f3f4f6', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                <strong>Debug Info:</strong> 
                Projected Sales: {projectionData.projectedSales}, 
                Projected Quantity: {projectionData.projectedQuantity}, 
                Growth Rate: {projectionData.growthRate}
              </div>
            )}
            
            {/* Key Metrics Cards */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <div className="metric-info">
                    <h3>Projected Sales</h3>
                    <div className="metric-value green">
                      {formatCurrency(projectionData.projectedSales || 0)}
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
                    {projectionData.confidence || 'Low'} Confidence
                  </span>
                  {projectionData.historicalData && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      Based on ₹{formatNumber(projectionData.historicalData.totalSales)} historical sales
                    </div>
                  )}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <div className="metric-info">
                    <h3>Recommended Inventory</h3>
                    <div className="metric-value blue">
                      {formatNumber(projectionData.projectedQuantity || 0)} units
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
                    {projectionData.inventoryStrategy?.distributionPlan || 'Distribute based on platform performance'}
                  </p>
                  {projectionData.historicalData?.averageOrderValue && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      Avg Order Value: ₹{formatNumber(projectionData.historicalData.averageOrderValue)}
                    </div>
                  )}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <div className="metric-info">
                    <h3>Growth Rate</h3>
                    <div className={`metric-value ${(projectionData.growthRate || 0) >= 0 ? 'green' : 'red'}`}>
                      {(projectionData.growthRate || 0) >= 0 ? '+' : ''}{(projectionData.growthRate || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className={`metric-icon ${(projectionData.growthRate || 0) >= 0 ? 'green' : 'red'}`}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={(projectionData.growthRate || 0) >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                  </div>
                </div>
                <div className="metric-footer">
                  <p className="metric-subtitle">Compared to historical average</p>
                  {projectionData.historicalData && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      {projectionData.historicalData.recordCount} records analyzed
                    </div>
                  )}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <div className="metric-info">
                    <h3>SKU Performance</h3>
                    <div className="metric-value purple">
                      {skuInput || 'Overall'}
                    </div>
                  </div>
                  <div className="metric-icon purple">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="metric-footer">
                  <p className="metric-subtitle">
                    {getCurrentPlatform().label}
                  </p>
                  {mappingStatus.totalMappings > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.5rem' }}>
                      ✅ SKU Mapping Active
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Insights Section */}
            {aiInsights && (
              <div className="insights-grid">
                {/* Market Insights */}
                <div className="insight-card">
                  <div className="insight-header">
                    <div className="insight-icon blue">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="insight-title">🧠 AI Market Insights</h3>
                  </div>
                  <div className="insight-list">
                    {aiInsights.marketInsights?.map((insight, index) => (
                      <div key={index} className="insight-item blue">
                        <span className="insight-bullet blue"></span>
                        <p className="insight-text">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opportunities */}
                <div className="insight-card">
                  <div className="insight-header">
                    <div className="insight-icon green">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="insight-title">🚀 Growth Opportunities</h3>
                  </div>
                  <div className="insight-list">
                    {aiInsights.opportunities?.map((opportunity, index) => (
                      <div key={index} className="insight-item green">
                        <span className="insight-bullet green"></span>
                        <p className="insight-text">{opportunity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Factors */}
                <div className="insight-card">
                  <div className="insight-header">
                    <div className="insight-icon yellow">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="insight-title">⚠️ Risk Factors</h3>
                  </div>
                  <div className="insight-list">
                    {aiInsights.riskFactors?.map((risk, index) => (
                      <div key={index} className="insight-item yellow">
                        <span className="insight-bullet yellow"></span>
                        <p className="insight-text">{risk}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform Recommendations */}
                <div className="insight-card">
                  <div className="insight-header">
                    <div className="insight-icon purple">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="insight-title">🎯 Platform Strategy</h3>
                  </div>
                  <div className="platform-strategy">
                    {Object.entries(aiInsights.platformRecommendations || {}).map(([platform, rec]) => (
                      <div key={platform} className="strategy-item">
                        <div className="strategy-header">
                          <h4 className="strategy-platform">{platform}</h4>
                          <span className="strategy-allocation">
                            {rec.allocation}% allocation
                          </span>
                        </div>
                        <p className="strategy-description">{rec.strategy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top SKUs Section */}
        <div className="top-skus-section slide-up">
          <div className="top-skus-header">
            <h3 className="top-skus-title">
              📊 Top Performing SKUs - Next {projectionDays} Days
            </h3>
            <span className="platform-indicator">
              {getCurrentPlatform().icon} {getCurrentPlatform().label}
            </span>
          </div>
          
          {topSkusData.length > 0 ? (
            <div className="skus-grid">
              {topSkusData.slice(0, 6).map((sku, index) => (
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
                      <span className="sku-metric-label">Projected Sales</span>
                      <span className="sku-metric-value green">
                        {formatCurrency(sku.projections?.projectedSales || 0)}
                      </span>
                    </div>
                    <div className="sku-metric">
                      <span className="sku-metric-label">Recommended Qty</span>
                      <span className="sku-metric-value blue">
                        {sku.projections?.projectedTotalQuantity || 0} units
                      </span>
                    </div>
                  </div>
                  <div className="sku-platforms">
                    Platforms: {sku.platforms?.join(', ') || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="empty-state-title">No data available</h3>
              <p className="empty-state-description">
                Upload some sales data to see SKU projections for {getCurrentPlatform().label}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projections;
