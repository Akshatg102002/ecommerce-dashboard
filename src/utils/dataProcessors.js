export const processUploadedData = (data, platform, date) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid or empty data');
  }

  const processed = {
    id: Date.now(),
    platform: platform,
    date: date,
    timestamp: new Date().toISOString(),
    totalOrders: 0,
    totalSales: 0,
    uniqueSKUs: new Set(),
    salesBySKU: {},
    salesByCategory: {},
    salesByCity: {},
    rawData: data
  };

  data.forEach((item, index) => {
    try {
      let sku, category, city, sales, quantity;

      switch (platform) {
        case 'amazon':
          // Amazon specific processing
          sku = item['seller-sku'] || item['Seller SKU'] || `AMZ_${index}`;
          category = item['product-group'] || 'Uncategorized';
          city = item['ship-city'] || 'Unknown';
          sales = parseFloat(item['item-price'] || 0);
          quantity = parseInt(item['quantity'] || 1);
          break;

        case 'myntra':
          // Myntra specific processing
          sku = item['SKU Code'] || item['Seller SKU Code'] || `MYN_${index}`;
          category = item['Category'] || item['Department'] || 'Uncategorized';
          city = item['Shipping City'] || 'Unknown';
          sales = parseFloat(item['Amount'] || item['Final Amount'] || 0);
          quantity = parseInt(item['Quantity'] || 1);
          break;

        case 'nykaa':
          // Nykaa specific processing
          sku = item['SKUCode'] || `NYK_${index}`;
          category = item['Category'] || 'Uncategorized';
          city = item['City'] || 'Unknown';
          sales = parseFloat(item['SellingPrice'] || item['Mrp'] || 0);
          quantity = parseInt(item['OrderQty'] || 1);
          break;

        case 'flipkart':
          // Flipkart specific processing
          sku = item['SKU'] || item['Product ID'] || `FLP_${index}`;
          category = item['Vertical'] || item['Category'] || 'Uncategorized';
          city = item['Shipping City'] || 'Unknown';
          sales = parseFloat(item['Your Selling Price'] || item['Item Price'] || 0);
          quantity = parseInt(item['Quantity'] || 1);
          break;

        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Data validation and cleaning
      sku = String(sku).trim().toUpperCase();
      category = String(category).trim();
      city = String(city).trim();
      sales = isNaN(sales) ? 0 : sales;
      quantity = isNaN(quantity) ? 0 : quantity;

      const itemTotal = sales * quantity;

      if (itemTotal > 0 && quantity > 0) {
        processed.totalSales += itemTotal;
        processed.totalOrders += quantity;
        processed.uniqueSKUs.add(sku);

        // Track sales by SKU
        processed.salesBySKU[sku] = (processed.salesBySKU[sku] || 0) + itemTotal;

        // Track sales by category
        processed.salesByCategory[category] = (processed.salesByCategory[category] || 0) + itemTotal;

        // Track orders by city
        processed.salesByCity[city] = (processed.salesByCity[city] || 0) + quantity;
      }
    } catch (error) {
      console.error(`Error processing item ${index}:`, error);
    }
  });

  // Convert Set to count
  processed.uniqueSKUs = processed.uniqueSKUs.size;

  return processed;
};