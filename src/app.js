const express = require('express');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');
const scheduler = require('./services/scheduler');
const appleStoreChecker = require('./services/appleStoreChecker');
const twilioService = require('./services/twilioService');

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Log requests in development
if (config.server.env === 'development') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });
}

// API Routes

// Get current status
app.get('/api/status', (req, res) => {
  const status = {
    scheduler: scheduler.getStatus(),
    checker: appleStoreChecker.getStatus(),
    notifications: twilioService.getStats(),
    config: {
      product: config.product,
      stores: config.stores,
      checkInterval: Math.floor(config.checking.interval / 60000)
    }
  };

  res.json(status);
});

// Trigger manual check
app.post('/api/check', async (req, res) => {
  logger.info('Manual check requested via API');

  const result = await scheduler.runImmediateCheck();
  res.json(result);
});

// Get check history
app.get('/api/history', (req, res) => {
  const status = appleStoreChecker.getStatus();
  res.json({
    history: status.recentChecks || [],
    currentAvailability: status.currentAvailability || {}
  });
});

// Update check interval
app.post('/api/config/interval', (req, res) => {
  const { minutes } = req.body;

  if (!minutes || minutes < 1 || minutes > 60) {
    return res.status(400).json({
      error: 'Invalid interval. Must be between 1 and 60 minutes.'
    });
  }

  scheduler.updateInterval(minutes);
  res.json({ success: true, message: `Interval updated to ${minutes} minutes` });
});

// Pause/Resume scheduler
app.post('/api/scheduler/pause', (req, res) => {
  scheduler.pause();
  res.json({ success: true, message: 'Scheduler paused' });
});

app.post('/api/scheduler/resume', (req, res) => {
  scheduler.resume();
  res.json({ success: true, message: 'Scheduler resumed' });
});

// Send test SMS
app.post('/api/test-sms', async (req, res) => {
  logger.info('Test SMS requested via API');

  const success = await twilioService.sendTestMessage();
  res.json({
    success,
    message: success ? 'Test SMS sent successfully' : 'Failed to send test SMS'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.server.env === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = config.server.port || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Dashboard available at http://localhost:${PORT}`);

  // Start scheduler if enabled
  if (config.checking.enabled) {
    logger.info('Auto-checking is enabled, starting scheduler...');
    scheduler.start();
  } else {
    logger.warn('Auto-checking is disabled. Use the dashboard to run manual checks.');
  }
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  logger.info('Shutting down gracefully...');

  scheduler.stop();
  await appleStoreChecker.cleanup();

  process.exit(0);
}

module.exports = app;