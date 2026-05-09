const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Relax for Electron
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['app://.' , 'file://', /^http:\/\/localhost/]
    : '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many login attempts, please try again in 15 minutes.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/license', require('./routes/license'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MAX_PORT_RETRIES = 10;
const shouldRetryPorts = process.env.NODE_ENV === 'production' || process.env.ALLOW_PORT_RETRY === 'true';

function startServerWithPortRetry(startPort, retriesLeft) {
  const server = app.listen(startPort, () => {
    console.log(`Server running on http://localhost:${startPort}`);
    console.log(`Duka Profit API v1.0.0`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !shouldRetryPorts) {
      console.error(
        `Port ${startPort} is already in use. Set a different PORT in backend/.env (and update frontend proxy target) or stop the process using this port.`
      );
      process.exit(1);
    }

    if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = Number(startPort) + 1;
      console.warn(`Port ${startPort} is in use. Retrying on port ${nextPort}...`);
      startServerWithPortRetry(nextPort, retriesLeft - 1);
      return;
    }

    if (err.code === 'EADDRINUSE') {
      console.error(`No open port found after ${MAX_PORT_RETRIES + 1} attempts starting from ${PORT}.`);
    } else {
      console.error('Server failed to start:', err.message);
    }
    process.exit(1);
  });
}

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/duka-profit')
  .then(() => {
    console.log('MongoDB connected');
    startServerWithPortRetry(PORT, MAX_PORT_RETRIES);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
