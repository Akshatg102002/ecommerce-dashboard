const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['myntra', 'amazon', 'flipkart', 'nykaa', 'ajio', 'delhi_warehouse']
  },
  reportType: {
    type: String,
    required: true,
    enum: ['orders', 'returns', 'inventory', 'sjit', 'ppmp', 'rtv']
  },
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  dateRange: {
    type: String,
    required: true
  },
  fileName: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  // Summary fields
  totalOrders: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalReturns: { type: Number, default: 0 },
  totalRefundAmount: { type: Number, default: 0 },
  totalStock: { type: Number, default: 0 },
  totalFreeStock: { type: Number, default: 0 },
  
  // Myntra specific return fields
  sjitReturns: { type: Number, default: 0 },
  ppmpReturns: { type: Number, default: 0 },
  rtvReturns: { type: Number, default: 0 },
  
  // Aggregated data stored as Maps for better performance
  categories: {
    type: Map,
    of: Number,
    default: new Map()
  },
  skus: {
    type: Map,
    of: Number,
    default: new Map()
  },
  cities: {
    type: Map,
    of: Number,
    default: new Map()
  },
  warehouses: {
    type: Map,
    of: Number,
    default: new Map()
  },
  parentSkus: {
    type: Map,
    of: Number,
    default: new Map()
  },
  returnReasons: {
    type: Map,
    of: Number,
    default: new Map()
  },
  returnTypes: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Enhanced warehouse-SKU mapping for inventory tracking
  warehouseSkuData: {
    type: Map,
    of: Map,
    default: new Map()
  },
  skuWarehouseData: {
    type: Map,
    of: Map,
    default: new Map()
  },
  skuCategories: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // Raw data storage for detailed analysis
  rawData: [{
    type: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Create indexes for better query performance
recordSchema.index({ platform: 1, reportType: 1, dateRange: 1 });
recordSchema.index({ startDate: 1, endDate: 1 });
recordSchema.index({ uploadedAt: -1 });

module.exports = mongoose.model('Record', recordSchema);
