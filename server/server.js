const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/database');
const recordRoutes = require('./routes/records');
const projectionRoutes = require('./routes/projections'); // Move this up

const app = express();
const PORT = process.env.PORT || 8080;

// Connect to MongoDB Atlas
connectDB();

// Define allowed origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://ecommerce-dashboard-1-vbsj.onrender.com',
      'https://ecommerce-dashboard-h5pa.onrender.com'
    ]
  : ['http://localhost:3000'];

// Log environment info for debugging
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🌐 Allowed Origins:', allowedOrigins);

// Enhanced CORS Middleware
app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 Request Origin:', origin);
    if (!origin) {
      console.log('✅ No origin - allowing request');
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  next();
});

// API Routes - MUST come before static file serving
app.use('/api/records', recordRoutes);
app.use('/api/projections', projectionRoutes); // Move this BEFORE static files

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'Connected',
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'undefined',
    allowedOrigins: allowedOrigins,
    requestOrigin: req.get('Origin') || 'none'
  });
});

// CORS preflight handler
app.options('*', (req, res) => {
  console.log('🔄 CORS Preflight request from:', req.get('Origin'));
  res.sendStatus(200);
});

// Serve static files from React build (for production) - AFTER API routes
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.get('Origin'),
      allowedOrigins: allowedOrigins
    });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 CORS Origins: ${allowedOrigins.join(', ')}`);
});
