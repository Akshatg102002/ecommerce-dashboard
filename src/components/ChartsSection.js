import React, { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ChartsSection = ({ records, reportType, skuMapping: propSkuMapping = {} }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedParentSku, setSelectedParentSku] = useState(null);
  const [drilldownLevel, setDrilldownLevel] = useState('parent'); // 'parent' or 'child'
  const [debugMode, setDebugMode] = useState(false);
  const [skuMapping, setSkuMapping] = useState(new Map());
  const [mappingLoaded, setMappingLoaded] = useState(false);
  const chartRefs = useRef({});

  // Load SKU mapping from Master_SKU_Mapping.csv
  useEffect(() => {
    const loadSkuMapping = async () => {
      try {
        const response = await fetch('/Master_SKU_Mapping.csv');
        if (!response.ok) {
          console.warn('Master SKU mapping file not found. SKU mapping will be disabled.');
          setMappingLoaded(true);
          return;
        }

        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const mapping = new Map();
            if (results?.data && Array.isArray(results.data)) {
              results.data.forEach(row => {
                if (!row || typeof row !== 'object') return;

                const cleanedRow = {};
                Object.keys(row).forEach(key => {
                  const cleanKey = key ? key.trim() : '';
                  cleanedRow[cleanKey] = row[key] ? row[key].trim() : '';
                });

                const localSku = cleanedRow['Local_SKU'] || cleanedRow['Local SKU'] || cleanedRow['local_sku'];
                const myntraSku = cleanedRow['Myntra_SKU'] || cleanedRow['Myntra SKU'] || cleanedRow['myntra_sku'];
                const nykaaSku = cleanedRow['Nykaa_SKU'] || cleanedRow['Nykaa SKU'] || cleanedRow['nykaa_sku'];
                const categories = cleanedRow['Categories'] || cleanedRow['categories'] || cleanedRow['Category'];

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
                  if (nykaaSku) {
                    mappingData.platforms.nykaa = nykaaSku;
                    mapping.set(`nykaa_${nykaaSku.toLowerCase()}`, mappingData);
                  }
                  mapping.set(`local_${localSku.toLowerCase()}`, mappingData);
                }
              });
            }
            setSkuMapping(mapping);
            setMappingLoaded(true);
            console.log(`Loaded ${mapping.size} SKU mappings from Master_SKU_Mapping.csv`);
          },
          error: (error) => {
            console.error('Error parsing Master SKU mapping CSV:', error);
            setMappingLoaded(true);
          }
        });
      } catch (error) {
        console.error('Error loading Master SKU mapping:', error);
        setMappingLoaded(true);
      }
    };

    loadSkuMapping();
  }, []);

  // **NEW: Extract parent SKU from child SKU**
  const extractParentSku = (childSku) => {
    if (!childSku) return null;
    
    // Remove size and color variants
    // Examples: BW8058Grey_SKD-L -> BW8058, BW8058Red-M -> BW8058, BW8058_L -> BW8058
    let parentSku = childSku.toString().trim();
    
    // Remove common size suffixes
    parentSku = parentSku.replace(/[-_](XS|S|M|L|XL|XXL|XXXL|\d+)$/i, '');
    
    // Remove color variants (common color names)
    parentSku = parentSku.replace(/(Black|White|Red|Blue|Green|Yellow|Pink|Purple|Orange|Brown|Grey|Gray|Navy|Maroon|Beige|Cream|Olive|Khaki|Burgundy|Teal|Coral|Mint|Lavender|Peach|Rose|Gold|Silver|Bronze)[-_]?/gi, '');
    
    // Remove additional variant patterns
    parentSku = parentSku.replace(/[-_](SKD|Regular|Slim|Fit|Cotton|Polyester|Denim|Casual|Formal)[-_]?/gi, '');
    
    // Remove trailing separators
    parentSku = parentSku.replace(/[-_]+$/, '');
    
    return parentSku || childSku;
  };

  // Get local SKU mapping
  const getLocalSkuMapping = (platformSku, platform) => {
    if (!platformSku || !skuMapping.size) {
      return { localSku: platformSku, category: '', originalSku: platformSku };
    }

    const mappingKey = `${platform}_${platformSku.toLowerCase()}`;
    const mappingData = skuMapping.get(mappingKey);
    
    if (mappingData) {
      return {
        localSku: mappingData.localSku,
        category: mappingData.categories,
        originalSku: platformSku
      };
    }
    
    return { localSku: platformSku, category: '', originalSku: platformSku };
  };

  const platforms = useMemo(() => {
    if (!records || records.length === 0) return [];
    return [...new Set(records.map(r => r.platform || 'unknown'))];
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    let filtered = records;
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(r => r.platform === selectedPlatform);
    }
    return filtered;
  }, [records, selectedPlatform]);

  // **NEW: Process hierarchical SKU data**
  const processHierarchicalData = () => {
    const parentSkuData = {};
    const childSkuData = {};
    
    filteredRecords.forEach(record => {
      if (!record) return;
      
      const platform = record.platform || 'unknown';
      
      // Process different data types based on report type
      let skuDataSource = null;
      if (reportType === 'orders' && record.skuSales) {
        skuDataSource = record.skuSales;
      } else if (reportType === 'returns' && record.skus) {
        skuDataSource = record.skus;
      } else if (reportType === 'inventory' && record.skus) {
        skuDataSource = record.skus;
      } else if (record.skus) {
        skuDataSource = record.skus;
      }
      
      if (skuDataSource && typeof skuDataSource === 'object') {
        Object.entries(skuDataSource).forEach(([childSku, value]) => {
          if (!childSku || !value) return;
          
          const mapping = getLocalSkuMapping(childSku, platform.toLowerCase());
          const mappedChildSku = mapping.localSku;
          const parentSku = extractParentSku(mappedChildSku);
          
          // Store parent SKU data
          if (!parentSkuData[parentSku]) {
            parentSkuData[parentSku] = {
              value: 0,
              count: 0,
              children: new Set(),
              category: mapping.category
            };
          }
          parentSkuData[parentSku].value += parseFloat(value) || 0;
          parentSkuData[parentSku].count += 1;
          parentSkuData[parentSku].children.add(mappedChildSku);
          
          // Store child SKU data
          if (!childSkuData[parentSku]) {
            childSkuData[parentSku] = {};
          }
          if (!childSkuData[parentSku][mappedChildSku]) {
            childSkuData[parentSku][mappedChildSku] = {
              value: 0,
              count: 0,
              category: mapping.category,
              originalSku: childSku
            };
          }
          childSkuData[parentSku][mappedChildSku].value += parseFloat(value) || 0;
          childSkuData[parentSku][mappedChildSku].count += 1;
        });
      }
    });
    
    return { parentSkuData, childSkuData };
  };

  // **NEW: Handle chart click for drill-down**
  const handleChartClick = (event, elements, chartType) => {
    if (chartType !== 'skus') return; // Only handle SKU chart clicks
    
    if (elements.length > 0) {
      const elementIndex = elements[0].index;
      
      if (drilldownLevel === 'parent') {
        // Drill down to child SKUs
        const hierarchicalData = processHierarchicalData();
        const parentSkus = Object.entries(hierarchicalData.parentSkuData)
          .sort((a, b) => b[1].value - a[1].value)
          .slice(0, 10);
        
        if (parentSkus[elementIndex]) {
          const clickedParentSku = parentSkus[elementIndex][0];
          setSelectedParentSku(clickedParentSku);
          setDrilldownLevel('child');
        }
      } else if (drilldownLevel === 'child') {
        // Go back to parent view
        setSelectedParentSku(null);
        setDrilldownLevel('parent');
      }
    }
  };

  // **ENHANCED: Process chart data with hierarchy support**
  const processChartData = () => {
    const trends = {};
    const platformDistribution = {};
    const warehouseDistribution = {};
    const topCategories = {};
    
    // Process hierarchical SKU data
    const hierarchicalData = processHierarchicalData();
    const { parentSkuData, childSkuData } = hierarchicalData;

    if (!filteredRecords || filteredRecords.length === 0) {
      return {
        trends: { labels: [], historicalData: [] },
        platformDistribution: { labels: [], data: [] },
        warehouseDistribution: { labels: [], data: [] },
        topSkus: { labels: [], data: [] },
        topCategories: { labels: [], data: [] }
      };
    }

    // Process trends and distributions (unchanged)
    filteredRecords.forEach(record => {
      if (!record) return;

      const platform = record.platform || 'unknown';
      const dateString = record.dateRange || record.startDate || new Date().toLocaleDateString('en-IN');

      if (reportType === 'orders') {
        const totalSales = record.totalSales || 0;
        trends[dateString] = (trends[dateString] || 0) + totalSales;
        platformDistribution[platform] = (platformDistribution[platform] || 0) + totalSales;
      } else if (reportType === 'returns') {
        const totalRefunds = record.totalRefundAmount || 0;
        trends[dateString] = (trends[dateString] || 0) + totalRefunds;
        platformDistribution[platform] = (platformDistribution[platform] || 0) + totalRefunds;
      } else if (reportType === 'inventory') {
        const totalStock = record.totalStock || 0;
        trends[dateString] = (trends[dateString] || 0) + totalStock;
        platformDistribution[platform] = (platformDistribution[platform] || 0) + totalStock;

        if (record.warehouses && typeof record.warehouses === 'object') {
          Object.entries(record.warehouses).forEach(([warehouse, stock]) => {
            if (warehouse && stock > 0) {
              warehouseDistribution[warehouse] = (warehouseDistribution[warehouse] || 0) + stock;
            }
          });
        }
      }

      // Process categories
      if (record.categories && typeof record.categories === 'object') {
        Object.entries(record.categories).forEach(([category, value]) => {
          if (category && value > 0) {
            topCategories[category] = (topCategories[category] || 0) + value;
          }
        });
      }
    });

    // **NEW: Generate SKU chart data based on drill-down level**
    let topSkus = { labels: [], data: [] };
    
    if (drilldownLevel === 'parent') {
      // Show parent SKUs
      const sortedParentSkus = Object.entries(parentSkuData)
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 10);
      
      topSkus = {
        labels: sortedParentSkus.map(([parentSku]) => parentSku),
        data: sortedParentSkus.map(([_, data]) => data.value)
      };
    } else if (drilldownLevel === 'child' && selectedParentSku) {
      // Show child SKUs for selected parent
      const childSkus = childSkuData[selectedParentSku] || {};
      const sortedChildSkus = Object.entries(childSkus)
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 10);
      
      topSkus = {
        labels: sortedChildSkus.map(([childSku]) => childSku),
        data: sortedChildSkus.map(([_, data]) => data.value)
      };
    }

    return {
      trends: {
        labels: Object.keys(trends).sort(),
        historicalData: Object.keys(trends).sort().map(date => trends[date])
      },
      platformDistribution: {
        labels: Object.keys(platformDistribution),
        data: Object.values(platformDistribution)
      },
      warehouseDistribution: {
        labels: Object.keys(warehouseDistribution),
        data: Object.values(warehouseDistribution)
      },
      topSkus,
      topCategories: {
        labels: Object.entries(topCategories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([label]) => label),
        data: Object.entries(topCategories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([_, value]) => value)
      }
    };
  };

  const chartData = processChartData();

  // Enhanced tooltip options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300
    },
    interaction: {
      mode: 'nearest',
      intersect: true
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            weight: '500'
          },
          color: '#374151'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        titleFont: {
          size: 15,
          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          weight: '600'
        },
        bodyFont: {
          size: 13,
          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        },
        cornerRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        displayColors: true,
        intersect: true,
        position: 'nearest',
        external: null
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          },
          color: '#6B7280',
          padding: 10
        }
      },
      y: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          },
          color: '#6B7280',
          padding: 10
        }
      }
    }
  };

  // **NEW: Enhanced chart title with drill-down indication**
  const getChartTitle = (chartType) => {
    const platformFilter = selectedPlatform !== 'all' ? ` - ${selectedPlatform.toUpperCase()}` : '';
    
    if (chartType === 'skus') {
      let baseTitle = '';
      if (reportType === 'orders') baseTitle = 'Top Selling SKUs';
      else if (reportType === 'returns') baseTitle = 'Top Returned SKUs';
      else if (reportType === 'inventory') baseTitle = 'Top Stock SKUs';
      else baseTitle = 'Top SKUs';
      
      if (drilldownLevel === 'parent') {
        return `${baseTitle} - Parent SKUs${platformFilter}`;
      } else if (drilldownLevel === 'child' && selectedParentSku) {
        return `${baseTitle} - ${selectedParentSku} Variants${platformFilter}`;
      }
      return `${baseTitle}${platformFilter}`;
    }
    
    switch (chartType) {
      case 'trends':
        return `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Trends${platformFilter}`;
      case 'categories':
        return `Top Categories${platformFilter}`;
      default:
        return `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics${platformFilter}`;
    }
  };

  // Format value based on report type
  const formatValue = (value, context = '') => {
    if (reportType === 'orders') {
      return context === 'tooltip' ? `₹${value.toLocaleString('en-IN')}` : value.toLocaleString('en-IN');
    } else if (reportType === 'returns') {
      return context === 'count' ? `${value.toLocaleString('en-IN')} returns` : `₹${value.toLocaleString('en-IN')}`;
    } else if (reportType === 'inventory') {
      return `${value.toLocaleString('en-IN')} units`;
    }
    return value.toLocaleString('en-IN');
  };

  // **NEW: Reset drill-down when platform changes**
  useEffect(() => {
    setSelectedParentSku(null);
    setDrilldownLevel('parent');
  }, [selectedPlatform, reportType]);

  const charts = [
    // Trends Chart
    {
      type: 'line',
      title: getChartTitle('trends'),
      data: {
        labels: chartData.trends.labels,
        datasets: [{
          label: reportType === 'inventory' ? 'Stock Units' : 
                 reportType === 'orders' ? 'Sales Amount' : 'Return Count',
          data: chartData.trends.historicalData,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3,
          pointBackgroundColor: '#3B82F6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          tooltip: {
            ...commonOptions.plugins.tooltip,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatValue(context.raw, 'tooltip')}`
            }
          }
        }
      }
    },

    // Platform Distribution (only show when all platforms selected)
    ...(selectedPlatform === 'all' ? [{
      type: 'doughnut',
      title: 'Platform Distribution',
      data: {
        labels: chartData.platformDistribution.labels,
        datasets: [{
          data: chartData.platformDistribution.data,
          backgroundColor: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
            '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
          ],
          borderColor: '#FFFFFF',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${context.label}: ${formatValue(value, 'tooltip')} (${percentage}%)`;
              }
            }
          }
        }
      }
    }] : []),

    // Warehouse Distribution (only for inventory)
    ...(reportType === 'inventory' && chartData.warehouseDistribution.labels.length > 0 ? [{
      type: 'doughnut',
      title: 'Warehouse Distribution',
      data: {
        labels: chartData.warehouseDistribution.labels,
        datasets: [{
          data: chartData.warehouseDistribution.data,
          backgroundColor: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
            '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
          ],
          borderColor: '#FFFFFF',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${context.label}: ${formatValue(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    }] : []),

    // **ENHANCED: Interactive SKU Chart with drill-down**
    {
      type: 'bar',
      title: getChartTitle('skus'),
      chartType: 'skus', // Add identifier for click handler
      data: {
        labels: chartData.topSkus.labels,
        datasets: [{
          label: reportType === 'orders' ? 'Sales Amount' : 
                 reportType === 'returns' ? 'Return Count' : 'Stock Quantity',
          data: chartData.topSkus.data,
          backgroundColor: drilldownLevel === 'parent' ? 
            'rgba(139, 92, 246, 0.8)' : 'rgba(16, 185, 129, 0.8)',
          borderColor: drilldownLevel === 'parent' ? '#8B5CF6' : '#10B981',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: drilldownLevel === 'parent' ? 
            'rgba(139, 92, 246, 0.9)' : 'rgba(16, 185, 129, 0.9)',
          hoverBorderWidth: 3
        }]
      },
      options: {
        ...commonOptions,
        indexAxis: 'y',
        onClick: (event, elements) => handleChartClick(event, elements, 'skus'),
        plugins: {
          ...commonOptions.plugins,
          tooltip: {
            ...commonOptions.plugins.tooltip,
            callbacks: {
              label: (context) => {
                const value = context.raw;
                let label = '';
                if (reportType === 'orders') {
                  label = `Sales: ₹${value.toLocaleString('en-IN')}`;
                } else if (reportType === 'returns') {
                  label = `Returns: ${value.toLocaleString('en-IN')}`;
                } else if (reportType === 'inventory') {
                  label = `Stock: ${value.toLocaleString('en-IN')} units`;
                }
                
                // Add drill-down hint
                if (drilldownLevel === 'parent') {
                  label += ' (Click to view variants)';
                } else {
                  label += ' (Click to go back)';
                }
                
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            ...commonOptions.scales.x,
            title: {
              display: true,
              text: reportType === 'orders' ? 'Sales Amount (₹)' : 
                    reportType === 'returns' ? 'Return Count' : 'Stock Units',
              color: '#374151',
              font: {
                size: 13,
                weight: '600',
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }
            }
          },
          y: {
            ...commonOptions.scales.y,
            title: {
              display: true,
              text: drilldownLevel === 'parent' ? 'Parent SKU' : 'Child SKU',
              color: '#374151',
              font: {
                size: 13,
                weight: '600',
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }
            },
            ticks: {
              ...commonOptions.scales.y.ticks,
              callback: function(value, index, ticks) {
                const label = this.getLabelForValue(value);
                return label.length > 25 ? label.substring(0, 25) + '...' : label;
              }
            }
          }
        }
      }
    },

    // Categories Chart
    {
      type: 'bar',
      title: getChartTitle('categories'),
      data: {
        labels: chartData.topCategories.labels,
        datasets: [{
          label: reportType === 'orders' ? 'Sales Amount' : 
                 reportType === 'returns' ? 'Return Value' : 'Stock Quantity',
          data: chartData.topCategories.data,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: '#10B981',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
          hoverBorderWidth: 3
        }]
      },
      options: {
        ...commonOptions,
        indexAxis: 'y',
        plugins: {
          ...commonOptions.plugins,
          tooltip: {
            ...commonOptions.plugins.tooltip,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatValue(context.raw, 'tooltip')}`
            }
          }
        },
        scales: {
          x: {
            ...commonOptions.scales.x,
            title: {
              display: true,
              text: reportType === 'orders' ? 'Sales Amount (₹)' : 
                    reportType === 'returns' ? 'Return Value (₹)' : 'Stock Units',
              color: '#374151',
              font: {
                size: 13,
                weight: '600',
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }
            }
          },
          y: {
            ...commonOptions.scales.y,
            title: {
              display: true,
              text: 'Category',
              color: '#374151',
              font: {
                size: 13,
                weight: '600',
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }
            }
          }
        }
      }
    }
  ];

  const renderChart = (chart, index) => {
    const ChartComponent = chart.type === 'line' ? Line : 
                          chart.type === 'doughnut' ? Doughnut : Bar;
    
    return (
      <div key={index} className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">{chart.title}</h3>
          {chart.chartType === 'skus' && (
            <div className="chart-controls">
              {drilldownLevel === 'child' && (
                <button 
                  className="back-button"
                  onClick={() => {
                    setSelectedParentSku(null);
                    setDrilldownLevel('parent');
                  }}
                >
                  ← Back to Parent SKUs
                </button>
              )}
              <div className="drill-down-indicator">
                {drilldownLevel === 'parent' ? (
                  <span className="hint">Click bars to view variants</span>
                ) : (
                  <span className="hint">Viewing: {selectedParentSku} variants</span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="chart-wrapper" style={{ height: '400px' }}>
          <ChartComponent
            ref={el => chartRefs.current[index] = el}
            data={chart.data}
            options={chart.options}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="charts-section">
      <div className="charts-header">
        <h2>Analytics Dashboard</h2>
        <div className="charts-controls">
          <select 
            value={selectedPlatform} 
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="platform-select"
          >
            <option value="all">All Platforms</option>
            {platforms.map(platform => (
              <option key={platform} value={platform}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="charts-grid">
        {charts.map((chart, index) => renderChart(chart, index))}
      </div>

      {debugMode && (
        <div className="debug-info">
          <h4>Debug Information</h4>
          <pre>{JSON.stringify({
            recordsCount: filteredRecords.length,
            reportType,
            selectedPlatform,
            drilldownLevel,
            selectedParentSku,
            mappingLoaded,
            skuMappingSize: skuMapping.size
          }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ChartsSection;
  