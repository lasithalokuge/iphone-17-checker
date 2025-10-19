# iPhone 17 Pro Max Availability Checker

An automated Node.js application that monitors iPhone 17 Pro Max availability in Singapore Apple Stores and sends SMS notifications when stock becomes available.

## Features

- **Real-time Availability Checking**: Monitors Apple Store inventory every minute
- **Dual Checking Methods**: Uses both Apple Store API and web scraping for reliability
- **SMS Notifications**: Instant Twilio SMS alerts when iPhone becomes available
- **Web Dashboard**: Real-time monitoring interface with manual check controls
- **Smart Notifications**: Cooldown periods to prevent spam, daily limits
- **Singapore Stores**: Monitors all 3 Apple Stores in Singapore
  - Apple Orchard Road
  - Apple Marina Bay Sands
  - Apple Jewel Changi Airport

## Prerequisites

- Node.js (v14 or higher)
- npm
- Twilio account for SMS notifications
- Singapore phone number for receiving alerts

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd iphone-checker
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your settings:
```env
# Twilio Configuration (required for SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_FROM=+1234567890  # Your Twilio phone number
PHONE_TO=+65XXXXXXXX          # Your Singapore phone number

# Product Configuration
PRODUCT_NAME=iPhone 17 Pro Max
PRODUCT_STORAGE=256GB
PRODUCT_COLOR=Silver

# Checking Configuration
CHECK_INTERVAL=1               # Minutes between checks
CHECK_ENABLED=true            # Enable automatic checking on startup

# Server Configuration
PORT=3000
NODE_ENV=production
```

## Usage

### Start the Application

```bash
# Production mode
npm start

# Development mode with auto-reload
npm run dev
```

The application will:
1. Start the Express server on port 3000
2. Begin checking availability every minute (if CHECK_ENABLED=true)
3. Send SMS notifications when iPhone becomes available
4. Provide a web dashboard at http://localhost:3000

### Web Dashboard

Access the dashboard at `http://localhost:3000` to:
- View real-time availability status for all stores
- Run manual checks
- Send test SMS to verify configuration
- Pause/resume automatic checking
- View check history
- Update check interval

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Get current system status |
| `/api/check` | POST | Trigger manual availability check |
| `/api/history` | GET | Get recent check history |
| `/api/config/interval` | POST | Update check interval |
| `/api/scheduler/pause` | POST | Pause automatic checking |
| `/api/scheduler/resume` | POST | Resume automatic checking |
| `/api/test-sms` | POST | Send test SMS |
| `/api/health` | GET | Health check endpoint |

## Setting up Twilio

1. Sign up for a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number capable of sending SMS to Singapore
4. Add your credentials to the `.env` file

## Configuration Options

### Check Interval
- Default: 1 minute
- Can be adjusted via dashboard or API
- Recommended: 1-5 minutes for best results

### Notification Settings
- **Cooldown Period**: 30 minutes between notifications for the same store
- **Daily Limit**: Maximum 10 notifications per day
- Both can be adjusted in `.env` file

### Product Configuration
The app is configured for:
- iPhone 17 Pro Max
- 256GB storage
- Silver color

To monitor a different configuration, update the `.env` file accordingly.

## How It Works

1. **Dual Checking Strategy**:
   - First attempts to use Apple Store API endpoints
   - Falls back to Puppeteer web scraping if API fails

2. **Store Monitoring**:
   - Checks all 3 Singapore Apple Stores simultaneously
   - Tracks availability status for each store

3. **Smart Notifications**:
   - Only sends SMS when status changes from unavailable to available
   - Implements cooldown to prevent duplicate notifications
   - Daily limits to control SMS costs

4. **Reliability Features**:
   - Automatic retry on failures
   - Detailed logging for debugging
   - Graceful error handling

## Logs

Logs are stored in the `logs/` directory:
- `app.log` - All application logs
- `error.log` - Error logs only

## Troubleshooting

### SMS not sending
- Verify Twilio credentials in `.env`
- Check Twilio account balance
- Ensure phone numbers are in correct format
- Run test SMS from dashboard

### No availability data
- Check internet connection
- Verify Apple Store website is accessible
- Check logs for error messages
- Try running manual check from dashboard

### High CPU usage
- Puppeteer (for web scraping) can be resource-intensive
- Consider increasing check interval
- Ensure you have sufficient system resources

## Important Notes

- This tool is for personal use only
- Be respectful of Apple's servers - don't set check intervals too low
- SMS charges apply based on your Twilio pricing
- Stock availability changes rapidly - act fast when notified

## Security Considerations

- Never commit `.env` file with real credentials
- Keep Twilio credentials secure
- Consider using environment variables in production
- Implement rate limiting if exposing API publicly

## Development

### Project Structure
```
iphone-checker/
├── src/
│   ├── services/
│   │   ├── appleStoreChecker.js    # Availability checking logic
│   │   ├── twilioService.js        # SMS notifications
│   │   └── scheduler.js            # Cron job management
│   ├── config/
│   │   └── config.js               # Configuration loader
│   ├── utils/
│   │   └── logger.js               # Winston logger setup
│   └── app.js                      # Express server
├── public/
│   └── index.html                  # Web dashboard
├── logs/                           # Log files (created on first run)
├── .env                            # Environment variables
├── package.json
└── README.md
```

### Adding New Features
- Store monitoring logic: `src/services/appleStoreChecker.js`
- Notification logic: `src/services/twilioService.js`
- API endpoints: `src/app.js`
- Dashboard UI: `public/index.html`

## License

MIT

## Disclaimer

This tool is not affiliated with Apple Inc. iPhone, Apple Store, and related trademarks are properties of Apple Inc.

---

Happy iPhone hunting! May you get your iPhone 17 Pro Max soon!