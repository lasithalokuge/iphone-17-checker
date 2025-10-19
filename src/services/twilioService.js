const twilio = require('twilio');
const config = require('../config/config');
const logger = require('../utils/logger');

class TwilioService {
  constructor() {
    this.client = null;
    this.lastNotificationTime = {};
    this.notificationCount = 0;
    this.dailyNotificationReset = new Date();

    this.initialize();
  }

  initialize() {
    try {
      if (config.twilio.accountSid && config.twilio.authToken) {
        this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
        logger.info('Twilio client initialized successfully');
      } else {
        logger.warn('Twilio credentials not configured - SMS notifications disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize Twilio client:', error);
    }
  }

  /**
   * Check if we should send a notification based on cooldown and daily limits
   */
  shouldSendNotification(storeId) {
    // Reset daily counter if it's a new day
    const now = new Date();
    if (now.toDateString() !== this.dailyNotificationReset.toDateString()) {
      this.notificationCount = 0;
      this.dailyNotificationReset = now;
      logger.info('Daily notification counter reset');
    }

    // Check daily limit
    if (this.notificationCount >= config.notification.maxPerDay) {
      logger.warn(`Daily notification limit reached (${config.notification.maxPerDay})`);
      return false;
    }

    // Check cooldown period for this specific store
    const lastNotification = this.lastNotificationTime[storeId];
    if (lastNotification) {
      const cooldownMs = config.notification.cooldownMinutes * 60 * 1000;
      const timeSinceLastNotification = now - lastNotification;

      if (timeSinceLastNotification < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastNotification) / 60000);
        logger.debug(`Cooldown active for store ${storeId} - ${remainingMinutes} minutes remaining`);
        return false;
      }
    }

    return true;
  }

  /**
   * Send SMS notification when iPhone is available
   */
  async sendAvailabilityNotification(storeInfo, productInfo) {
    if (!this.client) {
      logger.error('Twilio client not initialized - cannot send SMS');
      return false;
    }

    if (!this.shouldSendNotification(storeInfo.id)) {
      return false;
    }

    const message = this.formatNotificationMessage(storeInfo, productInfo);

    try {
      const result = await this.client.messages.create({
        body: message,
        from: config.twilio.phoneFrom,
        to: config.twilio.phoneTo
      });

      logger.info('SMS notification sent successfully', {
        messageId: result.sid,
        store: storeInfo.name,
        storeId: storeInfo.id
      });

      // Update tracking
      this.lastNotificationTime[storeInfo.id] = new Date();
      this.notificationCount++;

      return true;
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      return false;
    }
  }

  /**
   * Format the notification message
   */
  formatNotificationMessage(storeInfo, productInfo) {
    const message = `
🚨 iPhone AVAILABLE! 🚨

${productInfo.name} ${productInfo.storage} (${productInfo.color})
Store: ${storeInfo.name}
Address: ${storeInfo.address || 'Check Apple Store'}

Quick link: ${productInfo.purchaseUrl || config.product.baseUrl}

Act fast - limited stock!
Time: ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}
`.trim();

    return message;
  }

  /**
   * Send a test SMS to verify configuration
   */
  async sendTestMessage() {
    if (!this.client) {
      logger.error('Twilio client not initialized - cannot send test SMS');
      return false;
    }

    try {
      const result = await this.client.messages.create({
        body: 'iPhone Checker Test Message - Your notifications are working! 📱',
        from: config.twilio.phoneFrom,
        to: config.twilio.phoneTo
      });

      logger.info('Test SMS sent successfully', { messageId: result.sid });
      return true;
    } catch (error) {
      logger.error('Failed to send test SMS:', error);
      return false;
    }
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      dailyCount: this.notificationCount,
      dailyLimit: config.notification.maxPerDay,
      cooldownMinutes: config.notification.cooldownMinutes,
      lastNotifications: Object.entries(this.lastNotificationTime).map(([storeId, time]) => ({
        storeId,
        storeName: config.stores.names[storeId] || storeId,
        time: time.toISOString()
      }))
    };
  }
}

// Export singleton instance
module.exports = new TwilioService();