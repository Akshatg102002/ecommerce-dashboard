import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// API service for MongoDB operations
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const apiService = {
  async saveRecord(recordData) {
    try {
      console.log('🔄 Saving record to MongoDB...', recordData.platform);
      const response = await fetch(`${API_BASE_URL}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Record saved successfully:', result.message);
      return result.data;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw new Error(`Failed to save record: ${error.message}`);
    }
  },

  async getRecords(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${API_BASE_URL}/records?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }
};

function UploadSection({ onUpload, reportType, currentRecords = [] }) {
  const [platform, setPlatform] = useState('myntra');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [myntraReportType, setMyntraReportType] = useState('sjit');
  const [isLoading, setIsLoading] = useState(false);

  // Enhanced duplicate check function
  const checkForDuplicateData = (platform, dateRange, reportType, myntraReportType = null) => {
    return currentRecords.some(record => {
      const basicMatch = record.platform === platform && record.dateRange === dateRange;

      if (platform.toLowerCase() === 'myntra' && myntraReportType) {
        return basicMatch && record.reportType === myntraReportType;
      }

      return basicMatch;
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert('No file selected. Please choose a file to upload.');
      return;
    }

    setIsLoading(true);
    const fileType = file.name.split('.').pop().toLowerCase();

    try {
      let data;
      if (fileType === 'json') {
        data = await readJsonFile(file);
      } else if (fileType === 'csv') {
        const results = await readCsvFile(file);
        data = results.data;
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        data = await readExcelFile(file);
      } else {
        alert('Unsupported file type. Please upload CSV, XLSX, or JSON.');
        setIsLoading(false);
        return;
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('File contains no valid data or is empty');
      }

      const processed = processData(data, file.name);

      if (!processed || !processed.id) {
        throw new Error('Failed to process the file data correctly');
      }

      // Enhanced duplicate check for Myntra
      const isDuplicate = checkForDuplicateData(
        processed.platform,
        processed.dateRange,
        reportType,
        platform === 'myntra' ? myntraReportType : null
      );

      if (isDuplicate) {
        let duplicateMessage = `⚠️ Data already exists for:\n\n` +
          `Platform: ${processed.platform}\n` +
          `Date Range: ${processed.dateRange}\n`;

        if (platform === 'myntra' && myntraReportType) {
          duplicateMessage += `Report Type: ${myntraReportType.toUpperCase()}\n`;
        }

        duplicateMessage += `\nDo you want to replace the existing data?`;

        const confirmReplace = window.confirm(duplicateMessage);
        if (!confirmReplace) {
          alert('Upload cancelled. Existing data preserved.');
          setIsLoading(false);
          return;
        }
      }

      const enrichedProcessedData = {
        ...processed,
        reportType: platform === 'myntra' ? myntraReportType : reportType,
        uploadedAt: new Date().toISOString(),
        originalFileName: file.name,
        fileSize: file.size,
        recordCount: data.length
      };

      // Save to MongoDB
      const savedRecord = await apiService.saveRecord(enrichedProcessedData);
      
      // Update local state through parent component
      await onUpload(savedRecord);

      // Clear the file input
      event.target.value = '';

      console.log(`✅ File processed successfully: ${data.length} records from ${file.name}`);
      alert('File uploaded and saved to database successfully!');

    } catch (error) {
      console.error('❌ Error processing file:', error);

      let userMessage = 'Error processing file: ';
      if (error.message.includes('no valid data')) {
        userMessage += 'The file appears to be empty or contains no readable data.';
      } else if (error.message.includes('Failed to save record')) {
        userMessage += 'Database error - please check your connection and try again.';
      } else if (error.message.includes('Unsupported file type')) {
        userMessage += 'Please upload a CSV, Excel, or JSON file.';
      } else if (error.message.includes('Failed to process')) {
        userMessage += 'The file format may not match the expected structure for this report type.';
      } else {
        userMessage += error.message;
      }

      alert(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const readJsonFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read JSON file'));
      reader.readAsText(file);
    });
  };

  const readCsvFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => resolve(results),
        error: (error) => reject(error),
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [',', ';', '\t', '|']
      });
    });
  };

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Failed to parse Excel file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processData = (rawData, fileName) => {
    if (!Array.isArray(rawData)) {
      throw new Error('Invalid data format: Expected an array of records');
    }

    const formatDateRange = () => {
      if (startDate === endDate) {
        return startDate;
      }
      return `${startDate} to ${endDate}`;
    };

    let processedData = {
      id: generateId(),
      platform,
      startDate,
      endDate,
      dateRange: formatDateRange(),
      fileName,
      totalOrders: 0,
      totalSales: 0,
      totalReturns: 0,
      totalRefundAmount: 0,
      totalStock: 0,
      totalFreeStock: 0,
      categories: {},
      skus: {},
      cities: {},
      warehouses: {},
      parentSkus: {},
      returnReasons: {},
      returnTypes: {},
      returnStatuses: {},
      returnModes: {},
      refundedItems: {},
      rawData: [],
      reportType: reportType === 'orders' ? myntraReportType : reportType,
      styleName: '',
      productName: '',
      skuCategories: {},
      // Enhanced warehouse tracking for MongoDB
      warehouseSkuData: {},
      skuWarehouseData: {},
      // Myntra specific return fields
      rtvReturns: 0,
      sjitReturns: 0,
      ppmpReturns: 0
    };

    if (reportType === 'orders') {
      const columnConfig = getColumnNames(platform, reportType);

      rawData.forEach((row) => {
        if (!row || typeof row !== 'object') return;

        const amount = parseFloat(getColumnValue(row, columnConfig.salesColumn)) || 0;

        let sku;
        if (platform === 'myntra' && myntraReportType === 'rtv') {
          sku = getColumnValue(row, columnConfig.vanColumn) || 'Unknown';
        } else {
          sku = getColumnValue(row, columnConfig.skuColumn) || 'Unknown';
        }

        const orderDate = getColumnValue(row, columnConfig.orderDateColumn) || '';
        const category = getColumnValue(row, columnConfig.articleTypeColumn) ||
          getColumnValue(row, columnConfig.productNameColumn) || 'Unknown';
        const city = columnConfig.cityColumn ? getColumnValue(row, columnConfig.cityColumn) || 'Unknown' : 'N/A';
        const style = columnConfig.styleNameColumn ? getColumnValue(row, columnConfig.styleNameColumn) || 'Unknown' : 'N/A';

        if (amount > 0 && sku !== 'Unknown') {
          processedData.totalOrders += 1;
          processedData.totalSales += amount;

          processedData.categories[category] = (processedData.categories[category] || 0) + amount;
          processedData.skus[sku] = (processedData.skus[sku] || 0) + amount;

          if (columnConfig.cityColumn) {
            processedData.cities[city] = (processedData.cities[city] || 0) + amount;
          }

          if (columnConfig.styleNameColumn) {
            processedData.styleName = style;
          }

          if (columnConfig.productNameColumn) {
            processedData.productName = category;
          }
        }
      });
    } else if (reportType === 'returns') {
      const columnConfig = getColumnNames(platform, reportType);

      rawData.forEach((row) => {
        if (!row || typeof row !== 'object') return;

        let refundAmount = 0;
        if (columnConfig.refundAmountColumn && getColumnValue(row, columnConfig.refundAmountColumn)) {
          refundAmount = parseFloat(getColumnValue(row, columnConfig.refundAmountColumn)) || 0;
        } else if (getColumnValue(row, columnConfig.isRefundedColumn) === '1' ||
          getColumnValue(row, columnConfig.isRefundedColumn) === 'true') {
          refundAmount = 1;
        }

        let sku;
        if (platform === 'myntra' && myntraReportType === 'rtv') {
          sku = getColumnValue(row, columnConfig.vanColumn) || 'Unknown';
        } else {
          sku = getColumnValue(row, columnConfig.skuColumn) || 'Unknown';
        }

        const category = getColumnValue(row, columnConfig.articleTypeColumn) ||
          getColumnValue(row, columnConfig.productNameColumn) || 'Unknown';
        const city = columnConfig.cityColumn ? getColumnValue(row, columnConfig.cityColumn) || 'Unknown' : 'N/A';
        const style = columnConfig.styleNameColumn ? getColumnValue(row, columnConfig.styleNameColumn) || 'Unknown' : 'N/A';
        const returnReason = columnConfig.returnReasonColumn ? getColumnValue(row, columnConfig.returnReasonColumn) || 'Unknown' : 'N/A';
        const returnType = columnConfig.returnTypeColumn ? getColumnValue(row, columnConfig.returnTypeColumn) || 'Unknown' : 'N/A';
        const returnStatus = columnConfig.returnStatusColumn ? getColumnValue(row, columnConfig.returnStatusColumn) || 'Unknown' : 'N/A';
        const returnMode = columnConfig.returnModeColumn ? getColumnValue(row, columnConfig.returnModeColumn) || 'Unknown' : 'N/A';

        processedData.totalReturns += 1;
        processedData.totalRefundAmount += refundAmount;

        if (platform === 'myntra') {
          if (myntraReportType === 'sjit') {
            processedData.sjitReturns += 1;
          } else if (myntraReportType === 'ppmp') {
            processedData.ppmpReturns += 1;
          } else if (myntraReportType === 'rtv') {
            processedData.rtvReturns += 1;
          }
        }

        processedData.categories[category] = (processedData.categories[category] || 0) + refundAmount;
        processedData.skus[sku] = (processedData.skus[sku] || 0) + 1;

        if (columnConfig.cityColumn) {
          processedData.cities[city] = (processedData.cities[city] || 0) + refundAmount;
        }

        if (columnConfig.returnReasonColumn) {
          processedData.returnReasons[returnReason] = (processedData.returnReasons[returnReason] || 0) + 1;
        }

        if (columnConfig.returnTypeColumn) {
          processedData.returnTypes[returnType] = (processedData.returnTypes[returnType] || 0) + 1;
        }

        if (columnConfig.returnStatusColumn) {
          processedData.returnStatuses = processedData.returnStatuses || {};
          processedData.returnStatuses[returnStatus] = (processedData.returnStatuses[returnStatus] || 0) + 1;
        }

        if (columnConfig.returnModeColumn) {
          processedData.returnModes = processedData.returnModes || {};
          processedData.returnModes[returnMode] = (processedData.returnModes[returnMode] || 0) + 1;
        }
      });
    } else if (reportType === 'inventory') {
      const columnConfig = getColumnNames(platform, reportType);

      // Initialize enhanced warehouse tracking for MongoDB
      processedData.warehouseSkuData = {};
      processedData.skuWarehouseData = {};

      rawData.forEach((row) => {
        if (!row || typeof row !== 'object') return;

        const stock = parseInt(String(getColumnValue(row, columnConfig.stockColumn) || '0').replace(/,/g, '')) || 0;
        const freeStock = columnConfig.freeStockColumn ?
          parseInt(String(getColumnValue(row, columnConfig.freeStockColumn) || '0').replace(/,/g, '')) || 0 : 0;

        const sku = String(getColumnValue(row, columnConfig.skuColumn) || 'Unknown').trim();
        const parentSku = columnConfig.parentSkuColumn ?
          String(getColumnValue(row, columnConfig.parentSkuColumn) || 'Unknown').trim() : 'N/A';
        const childSku = columnConfig.childSkuColumn ?
          String(getColumnValue(row, columnConfig.childSkuColumn) || 'Unknown').trim() : 'N/A';

        const category = columnConfig.categoryColumn ?
          String(getColumnValue(row, columnConfig.categoryColumn) || 'Unknown').trim() : 'Unknown';

        // Enhanced warehouse information handling
        let warehouse = 'Unknown';
        if (platform === 'delhi_warehouse') {
          warehouse = 'Delhi';
        } else if (platform === 'myntra') {
          warehouse = String(getColumnValue(row, columnConfig.warehouseColumn) || 'Unknown').trim();
        } else if (columnConfig.warehouseColumn) {
          warehouse = String(getColumnValue(row, columnConfig.warehouseColumn) || 'Unknown').trim();
        }

        if (stock === 0 && freeStock === 0) return;

        processedData.totalStock += stock;
        processedData.totalFreeStock += freeStock;

        // Enhanced warehouse-SKU tracking for MongoDB
        if (warehouse !== 'Unknown') {
          processedData.warehouses[warehouse] = (processedData.warehouses[warehouse] || 0) + stock;
          
          // Create warehouse-SKU mapping for detailed tracking
          if (!processedData.warehouseSkuData[warehouse]) {
            processedData.warehouseSkuData[warehouse] = {};
          }
          
          const trackingSku = platform === 'delhi_warehouse' ? childSku : sku;
          if (trackingSku !== 'Unknown') {
            processedData.warehouseSkuData[warehouse][trackingSku] = 
              (processedData.warehouseSkuData[warehouse][trackingSku] || 0) + stock;
            
            // Create SKU-warehouse reverse mapping
            if (!processedData.skuWarehouseData[trackingSku]) {
              processedData.skuWarehouseData[trackingSku] = {};
            }
            processedData.skuWarehouseData[trackingSku][warehouse] = 
              (processedData.skuWarehouseData[trackingSku][warehouse] || 0) + stock;
          }
        }

        const skuKey = platform === 'delhi_warehouse' ? childSku : sku;
        if (skuKey !== 'Unknown') {
          processedData.skus[skuKey] = (processedData.skus[skuKey] || 0) + stock;
          
          // Store category information for each SKU
          if (!processedData.skuCategories) {
            processedData.skuCategories = {};
          }
          processedData.skuCategories[skuKey] = category;
        }

        if (platform === 'delhi_warehouse' && parentSku !== 'N/A' && parentSku !== 'Unknown') {
          processedData.parentSkus[parentSku] = (processedData.parentSkus[parentSku] || 0) + stock;
        }

        const categoryKey = category !== 'Unknown' ? category : 'General';
        processedData.categories[categoryKey] = (processedData.categories[categoryKey] || 0) + stock;
      });

      // Debug logging for warehouse data
      console.log('✅ Inventory processing complete:');
      console.log('📦 Total warehouses:', Object.keys(processedData.warehouses).length);
      console.log('🏪 Warehouse data:', processedData.warehouses);
      console.log('📊 Warehouse-SKU mapping:', Object.keys(processedData.warehouseSkuData).length, 'warehouses');
    }

    processedData.rawData = rawData;
    return processedData;
  };

  // Helper function to get column value with case-insensitive matching
  const getColumnValue = (row, columnNames) => {
    if (!columnNames || !row) return null;

    const columns = Array.isArray(columnNames) ? columnNames : [columnNames];

    for (const columnName of columns) {
      if (row[columnName] !== undefined) {
        return row[columnName];
      }

      const keys = Object.keys(row);
      const matchedKey = keys.find(key => key.toLowerCase() === columnName.toLowerCase());
      if (matchedKey && row[matchedKey] !== undefined) {
        return row[matchedKey];
      }
    }

    return null;
  };

  const getColumnNames = (platform, reportType) => {
    if (reportType === 'orders') {
      switch (platform) {
        case 'myntra':
          if (myntraReportType === 'sjit') {
            return {
              salesColumn: ['final amount', 'Final Amount'],
              skuColumn: ['myntra sku code', 'Seller SKU Code'],
              articleTypeColumn: ['article type', 'Article Type'],
              cityColumn: ['city', 'City'],
              styleNameColumn: ['style_name', 'Style Name'],
              orderDateColumn: ['order date', 'Order Date']
            };
          } else if (myntraReportType === 'ppmp') {
            return {
              salesColumn: ['final amount', 'Final Amount'],
              skuColumn: ['myntra sku code', 'Seller SKU Code'],
              articleTypeColumn: ['article type', 'Article Type'],
              cityColumn: ['city', 'City'],
              styleNameColumn: ['style_name', 'Style Name'],
              orderDateColumn: ['order date', 'Order Date']
            };
          } else if (myntraReportType === 'rtv') {
            return {
              salesColumn: ['final amount', 'Final Amount'],
              skuColumn: ['myntra sku code', 'Seller SKU Code'],
              articleTypeColumn: ['article type', 'Article Type'],
              cityColumn: ['city', 'City'],
              styleNameColumn: ['style_name', 'Style Name'],
              orderDateColumn: ['order date', 'Order Date'],
              rstnBarcodeColumn: ['rstn_barcode', 'RSTN Barcode'],
              rstnTypeColumn: ['rstn_type', 'RSTN Type'],
              vanColumn: ['van', 'VAN']
            };
          }
          break;
        case 'nykaa':
          return {
            salesColumn: ['LineItemTotal', 'lineitemtotal'],
            skuColumn: ['SKUCode', 'skucode'],
            orderDateColumn: ['OrderDate', 'orderdate'],
            articleTypeColumn: ['Category', 'category'],
            productNameColumn: ['Product Name', 'product name']
          };
        case 'amazon':
          return {
            salesColumn: ['item-price', 'Item Price'],
            skuColumn: ['sku', 'SKU'],
            orderDateColumn: ['purchase-date', 'Purchase Date'],
            articleTypeColumn: ['product-name', 'Product Name'],
            cityColumn: ['ship-city', 'Ship City']
          };
        case 'ajio':
          return {
            salesColumn: ['Total Value', 'total value'],
            skuColumn: ['Seller SKU', 'seller sku'],
            orderDateColumn: ['Cust Order Date', 'cust order date'],
            articleTypeColumn: ['Product Name', 'product name'],
            cityColumn: ['Ship City', 'ship city']
          };
        default:
          return {};
      }
    } else if (reportType === 'returns') {
      switch (platform) {
        case 'myntra':
          if (myntraReportType === 'sjit') {
            return {
              refundAmountColumn: ['refund amount', 'Refund Amount'],
              skuColumn: ['seller_sku_code', 'Seller SKU Code'],
              articleTypeColumn: ['article type', 'Article Type'],
              cityColumn: ['city', 'City'],
              styleNameColumn: ['style_name', 'Style Name'],
              returnReasonColumn: ['return_reason', 'Return Reason'],
              returnTypeColumn: ['type', 'Type']
            };
          } else if (myntraReportType === 'ppmp') {
            return {
              refundAmountColumn: ['refund amount', 'Refund Amount'],
              skuColumn: ['sku_code', 'Seller SKU Code'],
              articleTypeColumn: ['article type', 'Article Type'],
              cityColumn: ['city', 'City'],
              styleNameColumn: ['style_name', 'Style Name'],
              returnReasonColumn: ['return_reason', 'Return Reason'],
              returnTypeColumn: ['type', 'Type']
            };
          } else if (myntraReportType === 'rtv') {
            return {
              refundAmountColumn: ['refund amount', 'Refund Amount'],
              skuColumn: ['seller_sku_code', 'Seller SKU Code'],
              articleTypeColumn: ['article type', 'Article Type'],
              cityColumn: ['city', 'City'],
              styleNameColumn: ['style_name', 'Style Name'],
              returnReasonColumn: ['return_reason', 'Return Reason'],
              returnTypeColumn: ['type', 'Type'],
              rstnBarcodeColumn: ['rstn_barcode', 'RSTN Barcode'],
              rstnTypeColumn: ['rstn_type', 'RSTN Type'],
              vanColumn: ['van', 'VAN']
            };
          }
          break;
        case 'nykaa':
          return {
            refundAmountColumn: ['Refund Amount', 'refund amount'],
            skuColumn: ['SKUCode', 'skucode'],
            returnReasonColumn: ['Return Reason', 'return reason'],
            orderDateColumn: ['Return Date', 'return date']
          };
        case 'amazon':
          return {
            refundAmountColumn: ['refund-amount', 'Refund Amount'],
            skuColumn: ['sku', 'SKU'],
            returnReasonColumn: ['return-reason', 'Return Reason'],
            orderDateColumn: ['return-date', 'Return Date']
          };
        case 'ajio':
          return {
            refundAmountColumn: ['Refund Amount', 'refund amount'],
            skuColumn: ['Seller SKU', 'seller sku'],
            returnReasonColumn: ['Return Reason', 'return reason'],
            orderDateColumn: ['Return Date', 'return date']
          };
        default:
          return {};
      }
    } else if (reportType === 'inventory') {
      switch (platform) {
        case 'myntra':
          return {
            stockColumn: ['inventory count', 'Inventory Count'],
            skuColumn: ['sku code', 'Seller SKU Code'],
            warehouseColumn: ['warehouse name', 'Warehouse Name', 'warehouse_name', 'Warehouse_Name']
          };
        case 'amazon':
          return {
            stockColumn: ['available_quantity', 'Available Quantity'],
            skuColumn: ['seller_sku', 'Seller SKU'],
            warehouseColumn: ['warehouse_name', 'Warehouse Name']
          };
        case 'flipkart':
          return {
            stockColumn: ['inventory_count', 'Inventory Count'],
            skuColumn: ['sku', 'SKU'],
            warehouseColumn: ['warehouse_name', 'Warehouse Name']
          };
        case 'ajio':
          return {
            stockColumn: ['stock_quantity', 'Stock Quantity'],
            skuColumn: ['seller_sku', 'Seller SKU'],
            warehouseColumn: ['warehouse_name', 'Warehouse Name']
          };
        case 'nykaa':
          return {
            stockColumn: ['stock_count', 'Stock Count'],
            skuColumn: ['sku_code', 'SKU Code'],
            warehouseColumn: ['warehouse_name', 'Warehouse Name']
          };
        case 'delhi_warehouse':
          return {
            stockColumn: ['Total Stock', 'total stock'],
            skuColumn: ['internal code', 'Internal Code'],
            warehouseColumn: ['Warehouse', 'warehouse'],
            freeStockColumn: ['Free Stock', 'free stock'],
            parentSkuColumn: ['Style code', 'style code'],
            childSkuColumn: ['internal code', 'Internal Code'],
            categoryColumn: ['Department', 'department']
          };
        default:
          return {
            stockColumn: ['inventory count', 'Inventory Count'],
            skuColumn: ['seller sku code', 'Seller SKU Code'],
            warehouseColumn: ['warehouse name', 'Warehouse Name']
          };
      }
    }

    return {};
  };

  const isUploadDisabled = () => {
    if (isLoading) return true;

    if (platform === 'myntra' && (reportType === 'orders' || reportType === 'returns') && !myntraReportType) {
      return true;
    }

    return false;
  };

  const getDateRangeLabel = () => {
    if (startDate === endDate) {
      return `Date: ${startDate}`;
    }
    return `Date Range: ${startDate} to ${endDate}`;
  };

  const getFileInfoText = () => {
    if (reportType === 'orders') {
      switch (platform) {
        case 'myntra':
          if (myntraReportType === 'sjit') {
            return `SJIT Orders Report: Will read columns - "seller sku code", "article type", "final amount", "city", "style_name", "order date"`;
          } else if (myntraReportType === 'ppmp') {
            return `PPMP Orders Report: Will read columns - "seller sku code", "article type", "final amount", "city", "style_name", "order date"`;
          } else if (myntraReportType === 'rtv') {
            return `RTV Orders Report: Will read local SKUs from "van" field, columns - "van", "article type", "final amount", "city", "style_name", "order date", "rstn_barcode", "rstn_type"`;
          }
          break;
        case 'nykaa':
          return `Nykaa Orders Report: Will read columns - "SKUCode", "OrderDate", "LineItemTotal" for sales total`;
        case 'amazon':
          return `Amazon Orders Report: Will read columns - "sku", "purchase-date", "item-price" for sales total`;
        case 'ajio':
          return `AJIO Orders Report: Will read columns - "Seller SKU", "Cust Order Date", "Total Value" for sales total`;
        default:
          return `Orders Report: Please select a platform`;
      }
    } else if (reportType === 'returns') {
      switch (platform) {
        case 'myntra':
          if (myntraReportType === 'sjit') {
            return `SJIT Returns Report: Will read columns - "seller_sku_code", "article type", "refund amount", "city", "style_name", "return_reason", "type"`;
          } else if (myntraReportType === 'ppmp') {
            return `PPMP Returns Report: Will read columns - "seller_sku_code", "article type", "refund amount", "city", "style_name", "return_reason", "type"`;
          } else if (myntraReportType === 'rtv') {
            return `RTV Returns Report: Will read local SKUs from "van" field, columns - "van", "article type", "refund amount", "city", "style_name", "return_reason", "type", "rstn_barcode", "rstn_type"`;
          }
          break;
        case 'nykaa':
          return `Nykaa Returns Report: Will read columns - "SKUCode", "Refund Amount", "Return Reason", "Return Date"`;
        case 'amazon':
          return `Amazon Returns Report: Will read columns - "sku", "refund-amount", "return-reason", "return-date"`;
        case 'ajio':
          return `AJIO Returns Report: Will read columns - "Seller SKU", "Refund Amount", "Return Reason", "Return Date"`;
        default:
          return `Returns Report: Please select a platform`;
      }
    } else if (reportType === 'inventory') {
      switch (platform) {
        case 'myntra':
          return `Myntra Inventory Report: Will read columns - "seller sku code", "warehouse name", "inventory count" and create detailed warehouse-SKU mapping for search functionality`;
        case 'amazon':
          return `Amazon Inventory Report: Will read columns - "seller_sku", "warehouse_name", "available_quantity"`;
        case 'flipkart':
          return `Flipkart Inventory Report: Will read columns - "sku", "warehouse_name", "inventory_count"`;
        case 'ajio':
          return `AJIO Inventory Report: Will read columns - "seller_sku", "warehouse_name", "stock_quantity"`;
        case 'nykaa':
          return `Nykaa Inventory Report: Will read columns - "sku_code", "warehouse_name", "stock_count"`;
        case 'delhi_warehouse':
          return `Delhi Warehouse Inventory Report: Will read columns - "Department", "Style code", "internal code", "Total Stock", "Free Stock" (Warehouse: Delhi)`;
        default:
          return `Inventory Report: Please select a platform`;
      }
    }

    return `Report: Please select a platform`;
  };

  return (
    <div className="upload-section">
      <div className="upload-controls">

        {/* Date Range Section */}
        <div className="date-range-section">
          <h3>{getDateRangeLabel()}</h3>
          <div className="date-inputs">
            <div className="date-input-group">
              <label htmlFor="start-date">Start Date:</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="end-date">End Date:</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Platform Section */}
        <div className="platform-section">
          <div className="platform-selection">
            <label htmlFor="platform-select">Platform:</label>
            <select
              id="platform-select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={isLoading}
            >
              <option value="myntra">Myntra</option>
              <option value="nykaa">Nykaa</option>
              <option value="amazon">Amazon</option>
              <option value="ajio">AJIO</option>
              <option value="flipkart">Shopify</option>
              <option value="delhi_warehouse">Delhi Warehouse</option>
            </select>
          </div>

          {/* Myntra Specific Report Type */}
          {platform === 'myntra' && (reportType === 'orders' || reportType === 'returns') && (
            <div className="myntra-report-type">
              <label htmlFor="myntra-type-select">Myntra Report Type:</label>
              <select
                id="myntra-type-select"
                value={myntraReportType}
                onChange={(e) => setMyntraReportType(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select Report Type</option>
                <option value="sjit">SJIT</option>
                <option value="ppmp">PPMP</option>
                <option value="rtv">RTV (Return to Vendor)</option>
              </select>
            </div>
          )}
        </div>

        {/* File Upload Section */}
        <div className="file-upload-section">
          <div className="file-input-container">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileUpload}
              disabled={isUploadDisabled()}
              className="file-input"
              id="file-upload"
            />
            <button
              onClick={() => document.getElementById('file-upload').click()}
              disabled={isUploadDisabled()}
              className="upload-btn"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-cloud-upload-alt me-2"></i>
                  Choose File
                </>
              )}
            </button>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="loading-indicator">
              <div className="d-flex align-items-center">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mb-0">Processing file and saving to database...</p>
              </div>
            </div>
          )}
        </div>

      </div>
      <div className="file-info">
        <p><i className="fas fa-info-circle me-2"></i>{getFileInfoText()}</p>
      </div>
    </div>
  );
}

export default UploadSection;
