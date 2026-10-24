const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/paymentRoutes');
const connectDB = require('./config/db');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
    "https://educate-me.in"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
}));

// Database connection
connectDB();

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/user', require('./routes/userRoute'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/user/ug-applications', require('./routes/ugApplications'));
app.use('/user/pg-applications', require('./routes/pgApplications'));
app.use('/booking', bookingRoutes);
app.use('/ads', require('./routes/adsRoutes'));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
