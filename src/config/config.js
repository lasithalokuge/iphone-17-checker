require('dotenv').config();

module.exports = {
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneFrom: process.env.TWILIO_PHONE_FROM,
    phoneTo: process.env.PHONE_TO
  },

  // Product Configuration
  product: {
    name: process.env.PRODUCT_NAME || 'iPhone 17 Pro Max',
    storage: process.env.PRODUCT_STORAGE || '256GB',
    color: process.env.PRODUCT_COLOR || 'Silver',
    sku: process.env.PRODUCT_SKU || 'MUFK3ZP/A',
    // URL patterns for iPhone 16 Pro Max
    baseUrl: 'https://www.apple.com/sg/shop/buy-iphone/iphone-16-pro',
    fulfillmentUrl: 'https://www.apple.com/sg/shop/fulfillment-messages',
    availabilityUrl: 'https://www.apple.com/sg/shop/retail/pickup-message',

    // All iPhone 17 Pro and Pro Max SKUs to check (different colors and storage)
    // Note: These are hypothetical SKUs for iPhone 17 (not yet released)
    allVariants: {
      // iPhone 17 Pro Max - 256GB variants
      'MZ7C3ZP/A': { model: 'Pro Max', storage: '256GB', color: 'Silver' },
      'MZ7E3ZP/A': { model: 'Pro Max', storage: '256GB', color: 'Graphite' },
      'MZ7J3ZP/A': { model: 'Pro Max', storage: '256GB', color: 'Gold' },
      'MZ7G3ZP/A': { model: 'Pro Max', storage: '256GB', color: 'Deep Purple' },

      // iPhone 17 Pro Max - 512GB variants
      'MZ7L3ZP/A': { model: 'Pro Max', storage: '512GB', color: 'Silver' },
      'MZ7N3ZP/A': { model: 'Pro Max', storage: '512GB', color: 'Graphite' },
      'MZ7T3ZP/A': { model: 'Pro Max', storage: '512GB', color: 'Gold' },
      'MZ7Q3ZP/A': { model: 'Pro Max', storage: '512GB', color: 'Deep Purple' },

      // iPhone 17 Pro Max - 1TB variants
      'MZ7V3ZP/A': { model: 'Pro Max', storage: '1TB', color: 'Silver' },
      'MZ7X3ZP/A': { model: 'Pro Max', storage: '1TB', color: 'Graphite' },
      'MZ833ZP/A': { model: 'Pro Max', storage: '1TB', color: 'Gold' },
      'MZ803ZP/A': { model: 'Pro Max', storage: '1TB', color: 'Deep Purple' },

      // iPhone 17 Pro - 128GB variants
      'MZ533ZP/A': { model: 'Pro', storage: '128GB', color: 'Silver' },
      'MZ553ZP/A': { model: 'Pro', storage: '128GB', color: 'Graphite' },
      'MZ593ZP/A': { model: 'Pro', storage: '128GB', color: 'Gold' },
      'MZ573ZP/A': { model: 'Pro', storage: '128GB', color: 'Deep Purple' },

      // iPhone 17 Pro - 256GB variants
      'MZ5C3ZP/A': { model: 'Pro', storage: '256GB', color: 'Silver' },
      'MZ5E3ZP/A': { model: 'Pro', storage: '256GB', color: 'Graphite' },
      'MZ5J3ZP/A': { model: 'Pro', storage: '256GB', color: 'Gold' },
      'MZ5G3ZP/A': { model: 'Pro', storage: '256GB', color: 'Deep Purple' },

      // iPhone 17 Pro - 512GB variants
      'MZ5L3ZP/A': { model: 'Pro', storage: '512GB', color: 'Silver' },
      'MZ5N3ZP/A': { model: 'Pro', storage: '512GB', color: 'Graphite' },
      'MZ5T3ZP/A': { model: 'Pro', storage: '512GB', color: 'Gold' },
      'MZ5Q3ZP/A': { model: 'Pro', storage: '512GB', color: 'Deep Purple' },

      // iPhone 17 Pro - 1TB variants
      'MZ5V3ZP/A': { model: 'Pro', storage: '1TB', color: 'Silver' },
      'MZ5X3ZP/A': { model: 'Pro', storage: '1TB', color: 'Graphite' },
      'MZ633ZP/A': { model: 'Pro', storage: '1TB', color: 'Gold' },
      'MZ603ZP/A': { model: 'Pro', storage: '1TB', color: 'Deep Purple' }
    }
  },

  // Store Configuration (Singapore Apple Stores)
  stores: {
    ids: process.env.STORE_IDS ? process.env.STORE_IDS.split(',') : ['R669', 'R673', 'R676'],
    names: {
      'R669': 'Apple Orchard Road',
      'R673': 'Apple Marina Bay Sands',
      'R676': 'Apple Jewel Changi Airport'
    }
  },

  // Checking Configuration
  checking: {
    interval: parseInt(process.env.CHECK_INTERVAL || '1') * 60 * 1000, // Convert minutes to milliseconds
    enabled: process.env.CHECK_ENABLED === 'true'
  },

  // Notification Configuration
  notification: {
    cooldownMinutes: parseInt(process.env.COOLDOWN_MINUTES || '30'),
    maxPerDay: parseInt(process.env.MAX_NOTIFICATIONS_PER_DAY || '10')
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development'
  }
};