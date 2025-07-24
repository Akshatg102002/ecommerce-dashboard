import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import RecordCard from './records/RecordCard';
import SearchSection from './records/SearchSection';
import SearchResults from './records/SearchResults';
import RecordModal from './records/RecordModal';

function RecordsSection({ records, onDelete, reportType }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [skuMapping, setSkuMapping] = useState(new Map());
  const [mappingLoaded, setMappingLoaded] = useState(false);

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
          dynamicTyping: false,
          complete: (results) => {
            const mapping = new Map();

            results.data.forEach(row => {

              const cleanedRow = {};
              Object.keys(row).forEach(key => {
                const cleanKey = key.trim();
                cleanedRow[cleanKey] = row[key] ? row[key].trim() : '';
              });

              const localSku = cleanedRow['Local_SKU'] || cleanedRow['Local SKU'] || cleanedRow['local_sku'];
              const myntraSku = cleanedRow['Myntra_SKU'] || cleanedRow['Myntra SKU'] || cleanedRow['myntra_sku'];
              const skuId = cleanedRow['SKU_ID'] || cleanedRow['SKU ID'] || cleanedRow['sku_id'];
              const categories = cleanedRow['Categories'] || cleanedRow['categories'] || cleanedRow['Category'];
              const nykaaSku = cleanedRow['Nykaa_SKU'] || cleanedRow['Nykaa SKU'] || cleanedRow['nykaa_sku'];

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

                if (skuId) {
                  mappingData.platforms.sku_id = skuId;
                  mapping.set(`sku_id_${skuId.toLowerCase()}`, mappingData);
                }

                if (nykaaSku) {
                  mappingData.platforms.nykaa = nykaaSku;
                  mapping.set(`nykaa_${nykaaSku.toLowerCase()}`, mappingData);
                }

                mapping.set(`local_${localSku.toLowerCase()}`, mappingData);
              }
            });

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

      if (record.skus && typeof record.skus === 'object') {
        const enhancedSkus = {};
        const enhancedParentSkus = {};
        const skuCategories = {};
        const originalSkus = { ...record.skus };

        Object.entries(record.skus).forEach(([sku, value]) => {
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

          if (enhancedSkus[localSku]) {
            enhancedSkus[localSku] += Number(value) || 0;
          } else {
            enhancedSkus[localSku] = Number(value) || 0;
          }

          if (category) {
            skuCategories[localSku] = category;
          }
        });

        if (record.parentSkus && typeof record.parentSkus === 'object') {
          Object.entries(record.parentSkus).forEach(([parentSku, value]) => {
            let mappingResult;

            switch (platformName) {
              case 'myntra':
                mappingResult = getLocalSkuMapping(parentSku, 'myntra');
                break;
              case 'nykaa':
                mappingResult = getLocalSkuMapping(parentSku, 'nykaa');
                break;
              default:
                mappingResult = getLocalSkuMapping(parentSku, 'local');
                break;
            }

            const { localSku, category } = mappingResult;

            if (enhancedParentSkus[localSku]) {
              enhancedParentSkus[localSku] += Number(value) || 0;
            } else {
              enhancedParentSkus[localSku] = Number(value) || 0;
            }

            if (category) {
              skuCategories[localSku] = category;
            }
          });
        }

        const categoriesFromSkus = {};
        Object.entries(skuCategories).forEach(([sku, category]) => {
          if (category) {
            const skuValue = enhancedSkus[sku] || enhancedParentSkus[sku] || 0;
            if (categoriesFromSkus[category]) {
              categoriesFromSkus[category] += skuValue;
            } else {
              categoriesFromSkus[category] = skuValue;
            }
          }
        });

        const mergedCategories = { ...record.categories };
        Object.entries(categoriesFromSkus).forEach(([category, value]) => {
          if (mergedCategories[category]) {
            mergedCategories[category] += value;
          } else {
            mergedCategories[category] = value;
          }
        });

        return {
          ...standardizedRecord,
          skus: enhancedSkus,
          parentSkus: Object.keys(enhancedParentSkus).length > 0 ? enhancedParentSkus : record.parentSkus,
          originalSkus: originalSkus, 
          categories: Object.keys(mergedCategories).length > 0 ? mergedCategories : record.categories,
          skuCategories: skuCategories, 
        };
      }

      return standardizedRecord;
    });
  };

  const enhancedRecords = useMemo(() => {
    return enhanceRecordsWithMapping(records);
  }, [records, skuMapping, mappingLoaded]);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      onDelete(id);
    }
  };

  const handleDownload = (record) => {
    const data = [record];

    const headers = [
      { label: 'Platform', key: 'platform' },
      { label: 'Date Range', key: 'dateRange' },
      { label: 'Report Type', key: 'reportType' },
      { label: 'Product/Style Name', key: record.platform === 'myntra' ? 'styleName' : 'productName' },
      { label: 'Total Orders', key: 'totalOrders' },
      { label: 'Total Sales', key: 'totalSales' },
      { label: 'Total Returns', key: 'totalReturns' },
      { label: 'Total Refund Amount', key: 'totalRefundAmount' },
      { label: 'Total Stock', key: 'totalStock' },
      { label: 'SKU Count', key: 'skuCount' }
    ];

    const enhancedRecord = {
      ...record,
      skuCount: record.skus ? Object.keys(record.skus).length : 0
    };

    const csvLink = document.createElement('a');
    const csvData = new Blob([Papa.unparse({ 
      fields: headers.map(header => header.label), 
      data: [enhancedRecord]
    })], { type: 'text/csv;charset=utf-8;' });

    csvLink.href = URL.createObjectURL(csvData);
    csvLink.target = '_blank';
    csvLink.download = `${record.platform}_${record.dateRange}_${record.reportType || reportType}.csv`;
    csvLink.click();
  };

  const formatCurrency = (amount) => {
    return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num) => {
    return Number(num).toLocaleString('en-IN');
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { status: 'Out of Stock', className: 'critical' };
    if (stock < 50) return { status: 'Low Stock', className: 'warning' };
    if (stock < 100) return { status: 'Medium Stock', className: 'medium' };
    return { status: 'Good Stock', className: 'good' };
  };

  const getTopItems = (items, limit = 3) => {
    if (!items || typeof items !== 'object') return [];

    return Object.entries(items)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  };

  const formatDateDisplay = (record) => {
    if (record.dateRange) {
      return record.dateRange;
    }

    if (record.startDate && record.endDate) {
      if (record.startDate === record.endDate) {
        return record.startDate;
      }
      return `${record.startDate} to ${record.endDate}`;
    }

    if (record.date) {
      return new Date(record.date).toLocaleDateString('en-IN');
    }

    return 'Date not available';
  };

const searchResults = useMemo(() => {
  if (!searchTerm.trim()) return [];

  const term = searchTerm.toLowerCase();
  const results = [];

  if (reportType === 'orders') {
    const platformData = {};

    enhancedRecords.forEach(record => {
      const platform = record.platform?.toLowerCase();

      if (record.platform?.toLowerCase().includes(term) || 
          record.productName?.toLowerCase().includes(term) || 
          record.styleName?.toLowerCase().includes(term)) {

        if (!platformData[platform]) {
          platformData[platform] = {
            platform: record.platform,
            totalOrders: 0,
            totalSales: 0,
            records: []
          };
        }

        platformData[platform].totalOrders += record.totalOrders || 0;
        platformData[platform].totalSales += record.totalSales || 0;
        platformData[platform].records.push(record);
      }

      if (record.skus && typeof record.skus === 'object') {
        Object.entries(record.skus).forEach(([sku, sales]) => {
          if (sku.toLowerCase().includes(term)) {
            if (!platformData[platform]) {
              platformData[platform] = {
                platform: record.platform,
                totalOrders: 0,
                totalSales: 0,
                records: []
              };
            }

            const category = record.skuCategories && record.skuCategories[sku] ? record.skuCategories[sku] : '';
            results.push({
              type: 'orderSku',
              record,
              matchType: 'sku',
              matchText: sku,
              sales: sales,
              sku: sku,
              category: category,
              platform: record.platform,
              priority: 1
            });
          }
        });
      }

      if (record.categories && typeof record.categories === 'object') {
        Object.entries(record.categories).forEach(([category, sales]) => {
          if (category.toLowerCase().includes(term)) {
            results.push({
              type: 'orderCategory',
              record,
              matchType: 'category',
              matchText: category,
              sales: sales,
              category: category,
              platform: record.platform,
              priority: 2
            });
          }
        });
      }

      if (record.cities && typeof record.cities === 'object') {
        Object.entries(record.cities).forEach(([city, sales]) => {
          if (city.toLowerCase().includes(term)) {
            results.push({
              type: 'orderCity',
              record,
              matchType: 'city',
              matchText: city,
              sales: sales,
              city: city,
              platform: record.platform,
              priority: 3
            });
          }
        });
      }
    });

    Object.values(platformData).forEach(data => {
      if (data.records.length > 0) {
        results.unshift({
          type: 'platformOrdersAggregate',
          matchType: 'platform',
          matchText: `${data.platform} - Total Sales`,
          platform: data.platform,
          totalOrders: data.totalOrders,
          totalSales: data.totalSales,
          recordCount: data.records.length,
          priority: 0
        });
      }
    });
  }

  else if (reportType === 'returns') {
    const platformData = {};

    enhancedRecords.forEach(record => {
      const platform = record.platform?.toLowerCase();

      if (record.platform?.toLowerCase().includes(term) || 
          record.productName?.toLowerCase().includes(term) || 
          record.styleName?.toLowerCase().includes(term)) {

        if (!platformData[platform]) {
          platformData[platform] = {
            platform: record.platform,
            totalReturns: 0,
            totalRefundAmount: 0,
            sjitReturns: 0,
            ppmpReturns: 0,
            rtvReturns: 0,
            records: []
          };
        }

        platformData[platform].totalReturns += record.totalReturns || 0;
        platformData[platform].totalRefundAmount += record.totalRefundAmount || 0;

        if (record.platform?.toLowerCase() === 'myntra') {
          platformData[platform].sjitReturns += record.sjitReturns || 0;
          platformData[platform].ppmpReturns += record.ppmpReturns || 0;
          platformData[platform].rtvReturns += record.rtvReturns || 0;
        }

        platformData[platform].records.push(record);
      }

      if (record.returnReasons && typeof record.returnReasons === 'object') {
        Object.entries(record.returnReasons).forEach(([reason, count]) => {
          if (reason.toLowerCase().includes(term)) {
            results.push({
              type: 'returnReason',
              record,
              matchType: 'returnReason',
              matchText: reason,
              count: count,
              reason: reason,
              platform: record.platform,
              priority: 1
            });
          }
        });
      }

      if (record.returnTypes && typeof record.returnTypes === 'object') {
        Object.entries(record.returnTypes).forEach(([type, count]) => {
          if (type.toLowerCase().includes(term)) {
            results.push({
              type: 'returnType',
              record,
              matchType: 'returnType',
              matchText: type,
              count: count,
              returnType: type,
              platform: record.platform,
              priority: 2
            });
          }
        });
      }

      if (record.skus && typeof record.skus === 'object') {
        Object.entries(record.skus).forEach(([sku, returnCount]) => {
          if (sku.toLowerCase().includes(term)) {
            const category = record.skuCategories && record.skuCategories[sku] ? record.skuCategories[sku] : '';
            results.push({
              type: 'returnSku',
              record,
              matchType: 'sku',
              matchText: sku,
              returnCount: returnCount,
              sku: sku,
              category: category,
              platform: record.platform,
              priority: 3
            });
          }
        });
      }

      if (record.categories && typeof record.categories === 'object') {
        Object.entries(record.categories).forEach(([category, refundAmount]) => {
          if (category.toLowerCase().includes(term)) {
            results.push({
              type: 'returnCategory',
              record,
              matchType: 'category',
              matchText: category,
              refundAmount: refundAmount,
              category: category,
              platform: record.platform,
              priority: 4
            });
          }
        });
      }
    });

    Object.values(platformData).forEach(data => {
      if (data.records.length > 0) {
        results.unshift({
          type: 'platformReturnsAggregate',
          matchType: 'platform',
          matchText: `${data.platform} - Total Returns`,
          platform: data.platform,
          totalReturns: data.totalReturns,
          totalRefundAmount: data.totalRefundAmount,
          sjitReturns: data.sjitReturns,
          ppmpReturns: data.ppmpReturns,
          rtvReturns: data.rtvReturns,
          recordCount: data.records.length,
          priority: 0
        });
      }
    });
  }

  else if (reportType === 'inventory') {
    enhancedRecords.forEach(record => {

      if (record.platform?.toLowerCase().includes(term) || 
          record.productName?.toLowerCase().includes(term) || 
          record.styleName?.toLowerCase().includes(term)) {
        results.push({
          type: 'record',
          record,
          matchType: 'basic',
          matchText: record.platform || record.productName || record.styleName
        });
      }

      if (record.parentSkus && typeof record.parentSkus === 'object') {
        Object.entries(record.parentSkus).forEach(([parentSku, stock]) => {
          if (parentSku.toLowerCase().includes(term)) {
            const category = record.skuCategories && record.skuCategories[parentSku] ? record.skuCategories[parentSku] : '';
            results.push({
              type: 'parentSku',
              record,
              matchType: 'parentSku',
              matchText: parentSku,
              stock: stock,
              parentSku: parentSku,
              category: category,
              priority: 1
            });
          }
        });
      }

      if (record.skus && typeof record.skus === 'object') {
        Object.entries(record.skus).forEach(([sku, stock]) => {
          if (sku.toLowerCase().includes(term)) {
            const category = record.skuCategories && record.skuCategories[sku] ? record.skuCategories[sku] : '';
            const isOriginalSku = record.originalSkus && record.originalSkus[sku];
            results.push({
              type: 'sku',
              record,
              matchType: 'sku',
              matchText: sku,
              stock: stock,
              sku: sku,
              category: category,
              priority: 2,
              isMapped: !isOriginalSku && skuMapping.size > 0
            });
          }
        });
      }

    });
  }

  return results.sort((a, b) => {
    if (a.priority !== b.priority) {
      return (a.priority || 5) - (b.priority || 5);
    }

    const aValue = a.sales || a.totalSales || a.returnCount || a.totalReturns || a.stock || 0;
    const bValue = b.sales || b.totalSales || b.returnCount || b.totalReturns || b.stock || 0;
    return bValue - aValue;
  });
}, [searchTerm, enhancedRecords, skuMapping, reportType]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setShowSearchResults(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setShowSearchResults(false);
    setSelectedRecord(null);
  };

  return (
    <div className="records-section">
      <div className="records-header">
        <h2>Historical Records - {reportType.charAt(0).toUpperCase() + reportType.slice(1)}</h2>

        {}
        <SearchSection 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          showSearchResults={showSearchResults}
          reportType={reportType}
          skuMapping={skuMapping}
          mappingLoaded={mappingLoaded}
        />

        {}
        {showSearchResults && (
          <SearchResults 
            searchResults={searchResults}
            searchTerm={searchTerm}
            reportType={reportType}
            getLocalSkuMapping={getLocalSkuMapping}
            formatNumber={formatNumber}
            formatCurrency={formatCurrency}
            formatDateDisplay={formatDateDisplay}
          />
        )}

        {}
        <RecordModal 
          selectedRecord={selectedRecord}
          reportType={reportType}
          onClose={() => setSelectedRecord(null)}
          onDelete={handleDelete}
          onDownload={handleDownload}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
          getTopItems={getTopItems}
          getStockStatus={getStockStatus}
          formatDateDisplay={formatDateDisplay}
        />
      </div>

      {}
      {!showSearchResults && (
        <div className="records-grid">
          {enhancedRecords.length === 0 ? (
            <div className="no-records">
              <p>No records found for {reportType}.</p>
              <p>Upload some files to see historical data here.</p>
            </div>
          ) : (
            enhancedRecords.map(record => (
              <RecordCard 
                key={record.id}
                record={record}
                reportType={reportType}
                onDelete={handleDelete}
                onDownload={handleDownload}
                getLocalSkuMapping={getLocalSkuMapping}
                formatNumber={formatNumber}
                formatCurrency={formatCurrency}
                getTopItems={getTopItems}
                getStockStatus={getStockStatus}
                formatDateDisplay={formatDateDisplay}
                standardizedView={true} 
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default RecordsSection;