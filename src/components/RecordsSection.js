import React, { useState, useEffect, useMemo } from 'react';
import RecordCard from './records/RecordCard';

function RecordsSection({ records = [], reportType = 'orders', onEdit, onDelete, className = '' }) {
  const [skuMapping, setSkuMapping] = useState(new Map());
  const [mappingLoaded, setMappingLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Load SKU mapping on component mount
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
          const skuId = rowData['SKU_ID'] || rowData['SKU ID'] || rowData['sku_id'];
          const categories = rowData['Categories'] || rowData['categories'] || rowData['Category'];
          
          if (localSku) {
            const mappingData = {
              localSku: localSku,
              categories: categories || '',
              platforms: {}
            };
            
            // Map all platform SKUs to the same local SKU
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
            if (skuId) {
              mappingData.platforms.sku_id = skuId;
              mapping.set(`sku_id_${skuId.toLowerCase()}`, mappingData);
            }
            
            // Also map the local SKU to itself
            mapping.set(`local_${localSku.toLowerCase()}`, mappingData);
            mapping.set(localSku.toLowerCase(), mappingData);
          }
        }
        
        setSkuMapping(mapping);
        setMappingLoaded(true);
        console.log(`✅ Loaded ${mapping.size} SKU mappings for Records Section`);
      } catch (error) {
        console.error('Error loading SKU mapping:', error);
        setMappingLoaded(true);
      }
    };

    loadSkuMapping();
  }, []);

  // Enhanced SKU mapping helper function
  const getLocalSkuMapping = (platformSku, platform) => {
    if (!platformSku || !skuMapping.size) {
      return { localSku: platformSku, category: '', originalSku: platformSku, mapped: false };
    }
    
    // Clean the SKU
    const cleanSku = platformSku.toString().trim();
    if (!cleanSku) {
      return { localSku: platformSku, category: '', originalSku: platformSku, mapped: false };
    }
    
    // Try different mapping keys in order of specificity
    const mappingKeys = [
      `${platform}_${cleanSku.toLowerCase()}`,
      `local_${cleanSku.toLowerCase()}`,
      cleanSku.toLowerCase()
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
    
    // If no mapping found, return original SKU
    return { localSku: platformSku, category: '', originalSku: platformSku, mapped: false };
  };

  // CORRECTED: Enhanced function to process records with proper aggregation across multiple records
const enhanceRecordsWithMapping = (records) => {
  if (!mappingLoaded || !skuMapping.size) return records;

  return records.map(record => {
    const platformName = record.platform.toLowerCase();
    const standardizedRecord = {
      ...record,
      totalOrders: record.totalOrders || 0,
      totalSales: record.totalSales || record.totalRevenue || 0,
      totalReturns: record.totalReturns || 0,
      totalRefundAmount: record.totalRefundAmount || 0,
      totalStock: record.totalStock || 0,
    };

    // CRITICAL FIX: Process raw order line items instead of pre-aggregated SKUs
    if (record.rawOrderLines && Array.isArray(record.rawOrderLines)) {
      const enhancedSkus = {};
      const enhancedParentSkus = {};
      const skuCategories = {};
      const skuCounts = {};
      const parentSkuCounts = {};

      // Process each order line item separately
      record.rawOrderLines.forEach((orderLine) => {
        // Skip invalid orders
        const shouldSkipOrder = () => {
          if (platformName === 'myntra' && (reportType === 'orders' || record.reportType === 'orders')) {
            const orderStatus = orderLine.orderStatus || orderLine.status || orderLine.order_status;
            const invalidStatuses = ['WP', 'CANCELLED', 'CANCELED', 'RETURNED', 'REFUNDED', 'CA', 'RT'];
            if (orderStatus && invalidStatuses.includes(orderStatus.toUpperCase())) {
              return true;
            }
          }
          return false;
        };

        if (shouldSkipOrder()) return;

        const sku = orderLine.sku || orderLine.SKU;
        const value = Number(orderLine.finalAmount || orderLine.value || orderLine.sales || 0);
        const quantity = Number(orderLine.quantity || 1); // Each order line = 1 piece unless specified

        if (!sku || !value) return;

        // Apply SKU mapping
        let mappingResult;
        switch (platformName) {
          case 'myntra':
            mappingResult = getLocalSkuMapping(sku, 'myntra');
            break;
          case 'nykaa':
            mappingResult = getLocalSkuMapping(sku, 'nykaa');
            break;
          case 'delhi_warehouse':
            mappingResult = getLocalSkuMapping(sku, 'sku_id');
            break;
          default:
            mappingResult = getLocalSkuMapping(sku, 'local');
            break;
        }

        const { localSku, category } = mappingResult;

        // Aggregate values and counts
        enhancedSkus[localSku] = (enhancedSkus[localSku] || 0) + value;
        skuCounts[localSku] = (skuCounts[localSku] || 0) + quantity;

        if (category) {
          skuCategories[localSku] = category;
        }
      });

      // Calculate totals
      const totalSkuCount = Object.values(skuCounts).reduce((sum, count) => sum + count, 0);

      return {
        ...standardizedRecord,
        skus: enhancedSkus,
        parentSkus: enhancedParentSkus,
        skuCategories: skuCategories,
        skuCounts: skuCounts,
        parentSkuCounts: parentSkuCounts,
        totalSkuCount: totalSkuCount,
        totalParentSkuCount: 0
      };
    }

    // ALTERNATIVE FIX: If you don't have rawOrderLines, but SKUs appear multiple times in the same record
    else if (record.skus && typeof record.skus === 'object') {
      const enhancedSkus = {};
      const skuCounts = {};

      // Check if your record structure has multiple entries for the same SKU
      // This would happen if your CSV has multiple rows for the same SKU
      
      // Process each SKU entry (this assumes each entry = 1 piece)
      Object.entries(record.skus).forEach(([sku, value]) => {
        // Skip invalid entries
        if (!sku || sku.trim() === '' || sku === 'Unknown' || sku === 'N/A') return;
        
        const numericValue = Number(value) || 0;

        // Skip cancelled orders
        const shouldSkipOrder = () => {
          if (platformName === 'myntra' && (reportType === 'orders' || record.reportType === 'orders')) {
            const orderStatus = record.orderStatus || record.status || record.order_status;
            const invalidStatuses = ['WP', 'CANCELLED', 'CANCELED', 'RETURNED', 'REFUNDED', 'CA', 'RT'];
            if (orderStatus && invalidStatuses.includes(orderStatus.toUpperCase())) {
              return true;
            }
          }
          return false;
        };

        if (shouldSkipOrder()) return;

        // Apply SKU mapping
        let mappingResult;
        switch (platformName) {
          case 'myntra':
            mappingResult = getLocalSkuMapping(sku, 'myntra');
            break;
          case 'nykaa':
            mappingResult = getLocalSkuMapping(sku, 'nykaa');
            break;
          default:
            mappingResult = getLocalSkuMapping(sku, 'local');
            break;
        }

        const { localSku } = mappingResult;

        // CRITICAL: Each entry in the skus object represents ONE piece sold
        enhancedSkus[localSku] = (enhancedSkus[localSku] || 0) + numericValue;
        skuCounts[localSku] = (skuCounts[localSku] || 0) + 1; // Each entry = 1 piece
      });

      return {
        ...standardizedRecord,
        skus: enhancedSkus,
        skuCounts: skuCounts,
        totalSkuCount: Object.values(skuCounts).reduce((sum, count) => sum + count, 0)
      };
    }

    return standardizedRecord;
  });
};


  // Apply enhancements to records
  const enhancedRecords = useMemo(() => {
    return enhanceRecordsWithMapping(records);
  }, [records, mappingLoaded, skuMapping]);

  // Filter and search functionality
  const filteredRecords = useMemo(() => {
    let filtered = enhancedRecords;

    // Platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(record => 
        record.platform?.toLowerCase() === platformFilter.toLowerCase()
      );
    }

    // Search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        // Search in platform, business unit, and SKUs
        const platformMatch = record.platform?.toLowerCase().includes(lowerSearchTerm);
        const businessUnitMatch = record.businessUnit?.toLowerCase().includes(lowerSearchTerm);
        
        // Search in SKUs
        const skuMatch = record.skus && Object.keys(record.skus).some(sku => 
          sku.toLowerCase().includes(lowerSearchTerm)
        );
        
        return platformMatch || businessUnitMatch || skuMatch;
      });
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0));
        break;
      case 'sales-high':
        filtered.sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));
        break;
      case 'sales-low':
        filtered.sort((a, b) => (a.totalSales || 0) - (b.totalSales || 0));
        break;
      case 'platform':
        filtered.sort((a, b) => (a.platform || '').localeCompare(b.platform || ''));
        break;
      default:
        break;
    }

    return filtered;
  }, [enhancedRecords, searchTerm, sortBy, platformFilter]);

  // Get unique platforms for filter
  const uniquePlatforms = useMemo(() => {
    const platforms = records.map(record => record.platform).filter(Boolean);
    return [...new Set(platforms)];
  }, [records]);

  if (!Array.isArray(records) || records.length === 0) {
    return (
      <div className={`records-section ${className}`}>
        <div className="no-records">
          <div className="no-records-icon">📊</div>
          <h3>No Records Found</h3>
          <p>Upload some data files to see records here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`records-section ${className}`}>
      {/* SKU Mapping Status */}
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

      {/* Controls */}
      <div className="records-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search records, platforms, or SKUs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="platform-filter"
          >
            <option value="all">All Platforms</option>
            {uniquePlatforms.map(platform => (
              <option key={platform} value={platform}>
                {platform.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="sort-container">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="sales-high">Highest Sales</option>
            <option value="sales-low">Lowest Sales</option>
            <option value="platform">Platform A-Z</option>
          </select>
        </div>
      </div>

      {/* Records Count */}
      <div className="records-summary">
        <span className="records-count">
          Showing {filteredRecords.length} of {records.length} records
        </span>
        {searchTerm && (
          <span className="search-results">
            for "{searchTerm}"
          </span>
        )}
      </div>

      {/* Records Grid */}
      <div className="records-grid">
        {filteredRecords.map(record => (
          <RecordCard
            key={record.id}
            record={record}
            reportType={reportType}
            onEdit={onEdit}
            onDelete={onDelete}
            skuMapping={skuMapping}
          />
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No Results Found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}

export default RecordsSection;
