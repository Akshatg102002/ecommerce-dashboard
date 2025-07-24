// components/AIInsightsSection.js
import React, { useState, useEffect } from 'react';

function AIInsightsSection({ records, reportType }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateAIInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const analysisData = prepareDataForAI(records, reportType);
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro', // Corrected model name
          messages: [
            {
              role: 'user',
              content: buildPrompt(analysisData)
            }
          ],
          max_tokens: 800,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorDetails = await response.text();
        console.error('API Error Details:', errorDetails);
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.choices && result.choices[0] && result.choices[0].message) {
        const aiInsights = parseInsights(result.choices[0].message.content);
        setInsights(aiInsights);
      } else {
        throw new Error('Invalid API response format');
      }

    } catch (err) {
      console.error('AI Insights Error:', err);
      setError(`Failed to generate AI insights: ${err.message}`);
      
      // Fallback to mock insights on error
      setInsights(generateMockInsights());
    } finally {
      setLoading(false);
    }
  };

  const prepareDataForAI = (records, reportType) => {
    const totalSales = records.reduce((sum, r) => sum + (r.totalSales || 0), 0);
    const totalOrders = records.reduce((sum, r) => sum + (r.totalOrders || 0), 0);
    const totalReturns = records.reduce((sum, r) => sum + (r.totalReturns || 0), 0);
    const totalStock = records.reduce((sum, r) => sum + (r.totalStock || 0), 0);
    
    // Extract top SKUs
    const skuMap = new Map();
    records.forEach(record => {
      if (record.skus) {
        Object.entries(record.skus).forEach(([sku, value]) => {
          const parentSku = sku.replace(/-[SMLXL0-9]+$/i, '');
          if (!skuMap.has(parentSku)) {
            skuMap.set(parentSku, { parentSku, totalValue: 0, childSkus: new Set() });
          }
          skuMap.get(parentSku).totalValue += Number(value) || 0;
          skuMap.get(parentSku).childSkus.add(sku);
        });
      }
    });

    const topSkus = Array.from(skuMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    // Platform performance
    const platformData = {};
    records.forEach(record => {
      if (!platformData[record.platform]) {
        platformData[record.platform] = { sales: 0, orders: 0, returns: 0 };
      }
      platformData[record.platform].sales += record.totalSales || 0;
      platformData[record.platform].orders += record.totalOrders || 0;
      platformData[record.platform].returns += record.totalReturns || 0;
    });

    return {
      reportType,
      totalSales,
      totalOrders,
      totalReturns,
      totalStock,
      topSkus,
      platformData,
      recordCount: records.length
    };
  };

  const buildPrompt = (data) => {
    const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
    
    let prompt = `Analyze this ${data.reportType} data for Bani Women Multi-Platform Ecommerce business:\n\n`;
    
    prompt += `PERFORMANCE METRICS:\n`;
    if (data.reportType === 'orders') {
      prompt += `- Total Sales: ${formatCurrency(data.totalSales)}\n`;
      prompt += `- Total Orders: ${data.totalOrders.toLocaleString()}\n`;
      prompt += `- Average Order Value: ${formatCurrency(data.totalOrders > 0 ? data.totalSales / data.totalOrders : 0)}\n`;
    } else if (data.reportType === 'returns') {
      prompt += `- Total Returns: ${data.totalReturns.toLocaleString()}\n`;
      prompt += `- Return Rate: ${data.totalOrders > 0 ? ((data.totalReturns / data.totalOrders) * 100).toFixed(1) : 0}%\n`;
    } else if (data.reportType === 'inventory') {
      prompt += `- Total Stock: ${data.totalStock.toLocaleString()} units\n`;
      prompt += `- SKU Count: ${data.topSkus.length}\n`;
    }
    
    prompt += `- Records Analyzed: ${data.recordCount}\n\n`;
    
    if (data.topSkus.length > 0) {
      prompt += `TOP PERFORMING SKUS:\n`;
      data.topSkus.forEach((sku, i) => {
        prompt += `${i+1}. ${sku.parentSku}: ${formatCurrency(sku.totalValue)} (${sku.childSkus.size} variants)\n`;
      });
      prompt += `\n`;
    }
    
    if (Object.keys(data.platformData).length > 0) {
      prompt += `PLATFORM BREAKDOWN:\n`;
      Object.entries(data.platformData).forEach(([platform, metrics]) => {
        prompt += `- ${platform}: ${formatCurrency(metrics.sales)} sales`;
        if (metrics.orders > 0) prompt += `, ${metrics.orders} orders`;
        if (metrics.returns > 0) prompt += `, ${metrics.returns} returns`;
        prompt += `\n`;
      });
      prompt += `\n`;
    }
    
    prompt += `Please provide business insights in the following JSON format:\n`;
    prompt += `{\n`;
    prompt += `  "insights": ["insight1", "insight2", "insight3"],\n`;
    prompt += `  "opportunities": ["opportunity1", "opportunity2", "opportunity3"],\n`;
    prompt += `  "risks": ["risk1", "risk2"],\n`;
    prompt += `  "strategy": ["strategy1", "strategy2"]\n`;
    prompt += `}\n\n`;
    prompt += `Focus on actionable recommendations for growing this women's fashion e-commerce business.`;
    
    return prompt;
  };

  const parseInsights = (content) => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
      
      // Fallback parsing if JSON format is not found
      return parseTextInsights(content);
    } catch (error) {
      console.error('Error parsing insights:', error);
      return generateMockInsights();
    }
  };

  const parseTextInsights = (content) => {
    const sections = {
      insights: [],
      opportunities: [],
      risks: [],
      strategy: []
    };

    const lines = content.split('\n');
    let currentSection = null;

    lines.forEach(line => {
      line = line.trim();
      if (line.toLowerCase().includes('insight')) {
        currentSection = 'insights';
      } else if (line.toLowerCase().includes('opportunit')) {
        currentSection = 'opportunities';
      } else if (line.toLowerCase().includes('risk')) {
        currentSection = 'risks';
      } else if (line.toLowerCase().includes('strateg')) {
        currentSection = 'strategy';
      } else if (line.match(/^\d+\./) && currentSection) {
        sections[currentSection].push(line.replace(/^\d+\.\s*/, ''));
      } else if (line.startsWith('-') && currentSection) {
        sections[currentSection].push(line.replace(/^-\s*/, ''));
      }
    });

    return sections;
  };

  const generateMockInsights = () => {
    const baseInsights = {
      orders: {
        insights: [
          "Strong sales performance with consistent order volume growth",
          "Top SKUs contribute significantly to overall revenue stream",
          "Cross-platform presence driving diversified sales channels"
        ],
        opportunities: [
          "Expand top-performing SKU variants to capture 25-30% additional revenue",
          "Implement cross-selling strategies for complementary products",
          "Optimize pricing strategy based on demand patterns"
        ],
        risks: [
          "High dependency on few top-performing SKUs",
          "Platform concentration risk requiring diversification"
        ],
        strategy: [
          "Develop comprehensive product portfolio expansion plan",
          "Implement data-driven inventory management system"
        ]
      },
      returns: {
        insights: [
          "Return patterns indicate specific product quality concerns",
          "Seasonal return trends affecting overall profitability",
          "Customer feedback valuable for product improvement"
        ],
        opportunities: [
          "Reduce return rates through improved product descriptions",
          "Implement return analytics for inventory optimization",
          "Convert returns into customer retention opportunities"
        ],
        risks: [
          "Rising return rates impacting profit margins",
          "Customer satisfaction concerns from return experiences"
        ],
        strategy: [
          "Develop proactive return prevention strategies",
          "Enhance quality control processes"
        ]
      },
      inventory: {
        insights: [
          "Inventory levels show healthy stock distribution",
          "Warehouse optimization opportunities identified",
          "SKU performance varies significantly across locations"
        ],
        opportunities: [
          "Optimize stock allocation based on regional demand",
          "Implement predictive inventory management",
          "Reduce carrying costs through better forecasting"
        ],
        risks: [
          "Overstock in slow-moving SKUs",
          "Warehouse capacity constraints during peak seasons"
        ],
        strategy: [
          "Implement AI-driven demand forecasting",
          "Optimize warehouse distribution network"
        ]
      }
    };

    return baseInsights[reportType] || baseInsights.orders;
  };

  useEffect(() => {
    if (records && records.length > 0) {
      generateAIInsights();
    }
  }, [records, reportType]);

  const renderInsightCard = (title, items, icon, color) => (
    <div className={`ai-insight-card card-${color}`}>
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <h4>{title}</h4>
      </div>
      <div className="card-body">
        {items && items.map((item, index) => (
          <div key={index} className="insight-item">
            <span className="insight-bullet">•</span>
            <span className="insight-text">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="ai-insights-section">
        <div className="container-fluid">
          <div className="loading-container">
            <div className="ai-loader">
              <div className="loader-circle"></div>
              <p>🤖 AI is analyzing your {reportType} data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="ai-insights-section">
      <div className="container-fluid">
        <div className="section-header">
          <h2>🤖 AI-Powered Business Insights</h2>
          <button onClick={generateAIInsights} className="refresh-btn">
            <i className="fas fa-sync-alt"></i> Refresh Insights
          </button>
        </div>

        {error && (
          <div className="alert alert-warning mb-3">
            <small>Note: Using sample insights due to API connectivity. {error}</small>
          </div>
        )}

        <div className="insights-grid">
          {insights.insights && renderInsightCard(
            'Key Performance Insights', 
            insights.insights, 
            '📊', 
            'blue'
          )}
          
          {insights.opportunities && renderInsightCard(
            'Growth Opportunities', 
            insights.opportunities, 
            '🚀', 
            'green'
          )}
          
          {insights.risks && renderInsightCard(
            'Risk Factors', 
            insights.risks, 
            '⚠️', 
            'yellow'
          )}
          
          {insights.strategy && renderInsightCard(
            'Strategic Recommendations', 
            insights.strategy, 
            '🎯', 
            'purple'
          )}
        </div>
      </div>
    </div>
  );
}

export default AIInsightsSection;
