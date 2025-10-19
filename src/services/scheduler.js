const cron = require('node-cron');
const config = require('../config/config');
const logger = require('../utils/logger');
const appleStoreChecker = require('./appleStoreChecker');

class Scheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;
    this.checkCount = 0;
    this.startTime = null;
  }

  /**
   * Start the scheduled checking
   */
  start() {
    if (this.job) {
      logger.warn('Scheduler already running');
      return;
    }

    // Convert interval to cron expression
    // For every minute: '* * * * *'
    // For every 5 minutes: '*/5 * * * *'
    const intervalMinutes = Math.floor(config.checking.interval / 60000);
    const cronExpression = intervalMinutes === 1 ? '* * * * *' : `*/${intervalMinutes} * * * *`;

    logger.info(`Starting scheduler with ${intervalMinutes} minute interval (${cronExpression})`);

    this.startTime = new Date();

    this.job = cron.schedule(cronExpression, async () => {
      if (this.isRunning) {
        logger.warn('Previous check still running, skipping this interval');
        return;
      }

      this.isRunning = true;
      this.checkCount++;

      logger.info(`Running scheduled check #${this.checkCount}`);

      try {
        await appleStoreChecker.checkAvailability();
      } catch (error) {
        logger.error('Error during scheduled check:', error);
      } finally {
        this.isRunning = false;
      }
    });

    this.job.start();
    logger.info('Scheduler started successfully');

    // Run an immediate check on startup
    this.runImmediateCheck();
  }

  /**
   * Stop the scheduled checking
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Run an immediate check outside of schedule
   */
  async runImmediateCheck() {
    if (this.isRunning) {
      logger.warn('Check already in progress');
      return { success: false, message: 'Check already in progress' };
    }

    this.isRunning = true;
    logger.info('Running immediate check');

    try {
      await appleStoreChecker.checkAvailability();
      return { success: true, message: 'Check completed successfully' };
    } catch (error) {
      logger.error('Error during immediate check:', error);
      return { success: false, message: 'Check failed: ' + error.message };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.job !== null,
      currentlyChecking: this.isRunning,
      checkCount: this.checkCount,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      intervalMinutes: Math.floor(config.checking.interval / 60000),
      enabled: config.checking.enabled
    };
  }

  /**
   * Update check interval
   */
  updateInterval(minutes) {
    const wasRunning = this.job !== null;

    if (wasRunning) {
      this.stop();
    }

    // Update config
    config.checking.interval = minutes * 60 * 1000;

    if (wasRunning) {
      this.start();
    }

    logger.info(`Check interval updated to ${minutes} minutes`);
  }

  /**
   * Pause checking temporarily
   */
  pause() {
    if (this.job) {
      this.job.stop();
      logger.info('Scheduler paused');
    }
  }

  /**
   * Resume checking
   */
  resume() {
    if (this.job) {
      this.job.start();
      logger.info('Scheduler resumed');
    }
  }
}

// Export singleton instance
module.exports = new Scheduler();