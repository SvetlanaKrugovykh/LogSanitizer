# Log Sanitizer

Node.js application for automated PM2 log management - cleaning, rotation, and archival.

## Features

- **Automated Log Cleaning**: Removes template error patterns from log files
- **Daily Log Rotation**: Moves logs to legacy directory with date stamps
- **Old Log Cleanup**: Automatically deletes logs older than specified days
- **Scheduled Operations**: Configurable monitoring and rotation schedules
- **PM2 Integration**: Designed for PM2 log directory structure

## Installation

```bash
git clone <repository-url>
cd LogSanitizer
npm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```env
LOGS_DIR=/root/.pm2/logs
LEGACY_DIR=logs/legacy
ROTATION_HOUR=5
MONITORING_INTERVAL_MINUTES=30
KEEP_LEGACY_DAYS=30
```

3. Create and customize `templates.js` with error patterns to remove:
```javascript
module.exports = [
  "Error: Timeout",
  "ECONNRESET",
  // Add your patterns here
]
```

## Usage

### Start the service:
```bash
npm start
```

### Development mode:
```bash
npm run dev
```

### Manual operations:
```javascript
const LogSanitizer = require('./src/index.js')
const sanitizer = new LogSanitizer()

// Manual cleaning
await sanitizer.manualClean()

// Manual rotation
await sanitizer.manualRotate()
```

## Directory Structure

```
LogSanitizer/
├── src/
│   ├── index.js           # Main application
│   └── modules/
│       ├── logCleaner.js  # Log cleaning logic
│       └── logRotator.js  # Log rotation logic
├── templates.js           # Error patterns (gitignored)
├── .env                   # Environment config (gitignored)
└── .env.example          # Example configuration
```

## How It Works

### Monitoring
- Runs every X minutes (configurable)
- Scans all `.log` files in the logs directory
- Removes lines matching patterns from `templates.js`

### Daily Rotation
- Runs at specified hour (default: 5:00 AM)
- Copies non-empty log files to legacy directory
- Adds date stamp to filenames: `project-name-YYYY-MM-DD.log`
- Truncates original log files

### Legacy Cleanup
- Runs during daily rotation
- Deletes legacy files older than specified days
- Based on date in filename

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOGS_DIR` | `/root/.pm2/logs` | Source logs directory |
| `LEGACY_DIR` | `logs/legacy` | Archive directory |
| `ROTATION_HOUR` | `5` | Hour for daily rotation (0-23) |
| `MONITORING_INTERVAL_MINUTES` | `30` | Cleaning interval |
| `KEEP_LEGACY_DAYS` | `30` | Legacy retention period |

## PM2 Integration

To run as a PM2 service:

```bash
pm2 start src/index.js --name log-sanitizer
pm2 save
pm2 startup
```

## License

MIT