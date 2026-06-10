require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for undefined routes (so router page reloads fall back gracefully)
app.get('*', (req, res, next) => {
  // If request is for an API endpoint that doesn't exist, don't serve index.html
  if (req.path.startsWith('/api/')) {
    res.status(404);
    return next(new Error(`API Endpoint not found: ${req.path}`));
  }
  // Otherwise serve the main entrypoint (though normally browsers browse page.html directly)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handler Middleware
app.use(errorHandler);

// Port Configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
