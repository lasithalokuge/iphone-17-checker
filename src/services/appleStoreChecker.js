const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const config = require('../config/config');
const logger = require('../utils/logger');
const twilioService = require('./twilioService');

class AppleStoreChecker {
  constructor() {
    this.browser = null;
    this.checkHistory = [];
    this.lastAvailability = {};
  }

  /**
   * Initialize puppeteer browser for scraping
   */
  async initBrowser() {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        logger.info('Puppeteer browser initialized');
      } catch (error) {
        logger.error('Failed to initialize browser:', error);
      }
    }
  }

  /**
   * Main check method - tries API first, then scraping
   */
  async checkAvailability() {
    logger.info('Starting availability check...');
    const startTime = Date.now();

    try {
      // Try API method first
      const apiResult = await this.checkViaAPI();

      if (apiResult && apiResult.success) {
        await this.processResults(apiResult.availability, 'API');
      } else {
        // No availability data - product exists but not available for pickup
        logger.info('No store availability - iPhone 17 Pro/Pro Max not yet available for in-store pickup in Singapore');

        // Create unavailable status for all stores
        const unavailableStatus = {};
        config.stores.ids.forEach(storeId => {
          unavailableStatus[storeId] = {
            available: false,
            storeName: config.stores.names[storeId],
            storeId: storeId,
            address: this.getStoreAddress(storeId),
            availableVariants: [],
            message: 'Not yet available for pickup'
          };
        });

        await this.processResults(unavailableStatus, 'API');
      }

      const duration = Date.now() - startTime;
      logger.info(`Availability check completed in ${duration}ms`);

      // Keep check history
      this.addToHistory({
        timestamp: new Date(),
        duration,
        results: this.lastAvailability
      });

    } catch (error) {
      logger.error('Error during availability check:', error);
    }
  }

  /**
   * Check availability via Apple Store API
   */
  async checkViaAPI() {
    try {
      const allAvailability = {};
      const allVariants = config.product.allVariants || { [config.product.sku]: { storage: config.product.storage, color: config.product.color } };

      // Check each variant
      for (const [sku, variant] of Object.entries(allVariants)) {
        const params = new URLSearchParams({
          'parts.0': sku,
          'searchNearby': 'true',
          'store': config.stores.ids.join(',')
        });

        const apiUrl = `${config.product.availabilityUrl}?${params.toString()}`;

        try {
          const response = await axios.get(apiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-SG,en;q=0.9',
              'Referer': config.product.baseUrl
            },
            timeout: 5000
          });

          if (response.data && response.data.body) {
            const variantAvailability = this.parseAPIResponse(response.data, sku, variant);

            // Merge variant availability into overall availability
            Object.entries(variantAvailability).forEach(([storeId, storeData]) => {
              if (!allAvailability[storeId]) {
                allAvailability[storeId] = {
                  storeName: config.stores.names[storeId],
                  storeId: storeId,
                  address: this.getStoreAddress(storeId),
                  available: false,
                  availableVariants: [],
                  message: 'Not yet available for pickup'
                };
              }

              if (storeData.available) {
                allAvailability[storeId].available = true;
                allAvailability[storeId].availableVariants.push({
                  sku: sku,
                  model: variant.model || 'Pro Max',
                  color: variant.color,
                  storage: variant.storage,
                  pickupTime: storeData.pickupTime
                });
                allAvailability[storeId].message = `${allAvailability[storeId].availableVariants.length} variant(s) available`;
              }
            });
          }
        } catch (error) {
          // Continue checking other variants even if one fails
          logger.debug(`Failed to check variant ${sku}: ${error.message}`);
        }
      }

      if (Object.keys(allAvailability).length > 0) {
        return {
          success: true,
          availability: allAvailability
        };
      }

      return { success: false };

    } catch (error) {
      logger.error('API check failed:', error.message);
      return { success: false };
    }
  }

  /**
   * Parse API response for availability
   */
  parseAPIResponse(data, sku, variant) {
    const availability = {};

    try {
      // Apple API response structure varies, but typically includes stores and pickup availability
      const stores = data.body?.stores || data.stores || [];

      stores.forEach(store => {
        if (config.stores.ids.includes(store.storeNumber)) {
          const storeId = store.storeNumber;
          const partsAvailability = store.partsAvailability || {};
          const productAvailability = partsAvailability[sku] || {};

          availability[storeId] = {
            available: productAvailability.pickupDisplay === 'available' ||
                      productAvailability.storePickupProductTitle?.includes('Available'),
            storeName: store.storeName || config.stores.names[storeId],
            storeId: storeId,
            pickupTime: productAvailability.pickupSearchQuote || 'Check store',
            address: store.address?.address || '',
            message: productAvailability.pickupSearchQuote || productAvailability.storePickupProductTitle || 'Not available'
          };
        }
      });
    } catch (error) {
      logger.error('Error parsing API response:', error);
    }

    return availability;
  }

  /**
   * Check availability via web scraping
   */
  async checkViaScraping() {
    await this.initBrowser();

    if (!this.browser) {
      logger.error('Browser not available for scraping');
      return { success: false };
    }

    let page;
    try {
      page = await this.browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      // Navigate to iPhone purchase page
      logger.debug('Navigating to Apple Store page...');
      await page.goto(config.product.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for and select the iPhone model and configuration
      await this.selectProductConfiguration(page);

      // Check store availability
      const availability = await this.extractStoreAvailability(page);

      return {
        success: true,
        availability
      };

    } catch (error) {
      logger.error('Scraping failed:', error);
      return { success: false };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Select product configuration on the page
   */
  async selectProductConfiguration(page) {
    try {
      // Wait for page to load
      await page.waitForSelector('[data-autom="dimensionScreensize"]', { timeout: 10000 });

      // Select Pro Max (6.9" display)
      await page.click('[data-autom="dimensionScreensize6_9inch"]');
      await page.waitForTimeout(1000);

      // Select color (Silver)
      await page.click('[data-autom="dimensionColorsilver"]');
      await page.waitForTimeout(1000);

      // Select storage (256GB)
      await page.click('[data-autom="dimensionCapacity256gb"]');
      await page.waitForTimeout(1000);

      // Click on check availability
      const checkAvailabilityBtn = await page.$('[data-autom="deliveryMessage"] button, [data-autom="pickupMessage"] button');
      if (checkAvailabilityBtn) {
        await checkAvailabilityBtn.click();
        await page.waitForTimeout(2000);
      }

      logger.debug('Product configuration selected');

    } catch (error) {
      logger.error('Failed to select product configuration:', error);
      throw error;
    }
  }

  /**
   * Extract store availability from the page
   */
  async extractStoreAvailability(page) {
    const availability = {};

    try {
      // Wait for store availability to load
      await page.waitForSelector('[data-autom="storeLocator"], .rf-pickup-store', { timeout: 10000 });

      // Get page content
      const content = await page.content();
      const $ = cheerio.load(content);

      // Parse store availability
      $('.rf-pickup-store, [data-store-id]').each((index, element) => {
        const $store = $(element);
        const storeId = $store.attr('data-store-id') || $store.find('[data-store-id]').attr('data-store-id');

        if (storeId && config.stores.ids.includes(storeId)) {
          const isAvailable =
            $store.find('.rf-pickup-store-availability').text().toLowerCase().includes('available') ||
            $store.find('[data-autom="pickupAvailable"]').length > 0 ||
            !$store.find('.rf-pickup-store-availability').text().toLowerCase().includes('unavailable');

          availability[storeId] = {
            available: isAvailable,
            storeName: config.stores.names[storeId],
            storeId: storeId,
            message: $store.find('.rf-pickup-store-availability').text().trim() || 'Check availability',
            address: $store.find('.rf-pickup-store-address').text().trim()
          };

          logger.debug(`Store ${storeId} scraped availability:`, availability[storeId]);
        }
      });

    } catch (error) {
      logger.error('Failed to extract store availability:', error);
    }

    return availability;
  }

  /**
   * Generate mock data for testing (remove this in production)
   */
  getMockAvailability() {
    // Simulate random availability for demonstration
    const mockData = {};

    config.stores.ids.forEach(storeId => {
      const isAvailable = Math.random() > 0.7; // 30% chance of availability
      mockData[storeId] = {
        available: isAvailable,
        storeName: config.stores.names[storeId],
        storeId: storeId,
        pickupTime: isAvailable ? 'Today 2:00 PM - 4:00 PM' : '',
        address: this.getStoreAddress(storeId),
        message: isAvailable ? 'Available for pickup today' : 'Currently unavailable'
      };
    });

    return mockData;
  }

  /**
   * Get store address
   */
  getStoreAddress(storeId) {
    const addresses = {
      'R669': '270 Orchard Road, Singapore 238857',
      'R673': '2 Bayfront Avenue, Singapore 018972',
      'R676': '78 Airport Boulevard, Singapore 819666'
    };
    return addresses[storeId] || '';
  }

  /**
   * Process availability results and send notifications
   */
  async processResults(availability, method) {
    logger.info(`Processing results from ${method} method`);

    for (const [storeId, storeData] of Object.entries(availability)) {
      // Log available variants
      if (storeData.availableVariants && storeData.availableVariants.length > 0) {
        logger.info(`📱 Available variants at ${storeData.storeName}:`);
        storeData.availableVariants.forEach(variant => {
          logger.info(`   - iPhone 17 ${variant.model}: ${variant.color} ${variant.storage}`);
        });
      }

      // Check if user's preferred variant is newly available
      const preferredSku = config.product.sku;
      const wasPreferredAvailable = this.lastAvailability[storeId]?.availableVariants?.some(v => v.sku === preferredSku);
      const isPreferredNowAvailable = storeData.availableVariants?.some(v => v.sku === preferredSku);

      // Send SMS only for the user's preferred variant
      if (isPreferredNowAvailable && !wasPreferredAvailable) {
        logger.info(`🎉 Your preferred iPhone (${config.product.color} ${config.product.storage}) is NOW AVAILABLE at ${storeData.storeName}!`);

        // Send notification for preferred model
        await twilioService.sendAvailabilityNotification(
          {
            id: storeId,
            name: storeData.storeName,
            address: storeData.address
          },
          {
            name: config.product.name,
            storage: config.product.storage,
            color: config.product.color,
            purchaseUrl: config.product.baseUrl
          }
        );
      } else if (storeData.available && !this.lastAvailability[storeId]?.available) {
        // Log if other variants became available (but don't SMS)
        logger.info(`Other iPhone 17 Pro/Pro Max variants available at ${storeData.storeName}, but not your preferred Pro Max ${config.product.color} ${config.product.storage}`);
      } else if (!storeData.available) {
        logger.debug(`No iPhone 17 Pro/Pro Max variants available at ${storeData.storeName}`);
      }
    }

    // Update last availability
    this.lastAvailability = availability;
  }

  /**
   * Add check to history
   */
  addToHistory(check) {
    this.checkHistory.unshift(check);
    // Keep only last 100 checks
    if (this.checkHistory.length > 100) {
      this.checkHistory = this.checkHistory.slice(0, 100);
    }
  }

  /**
   * Get current availability status
   */
  getStatus() {
    return {
      lastCheck: this.checkHistory[0]?.timestamp || null,
      currentAvailability: this.lastAvailability,
      recentChecks: this.checkHistory.slice(0, 10)
    };
  }

  /**
   * Cleanup browser
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser cleaned up');
    }
  }
}

// Export singleton instance
module.exports = new AppleStoreChecker();