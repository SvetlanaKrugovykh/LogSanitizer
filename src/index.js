require('dotenv').config()
const cron = require('node-cron')
const LogCleaner = require('./modules/logCleaner')
const LogRotator = require('./modules/logRotator')

class LogSanitizer {
  constructor() {
    this.logsDir = process.env.LOGS_DIR || '/root/.pm2/logs'
    this.legacyDir = process.env.LEGACY_DIR || 'logs/legacy'
    this.rotationHour = process.env.ROTATION_HOUR || 5
    this.monitoringInterval = process.env.MONITORING_INTERVAL_MINUTES || 30
    this.keepLegacyDays = process.env.KEEP_LEGACY_DAYS || 30

    this.initializeModules()
    this.setupScheduler()
  }

  initializeModules() {
    try {
      const templates = require('../templates.js')
      this.cleaner = new LogCleaner(templates)
    } catch (error) {
      console.log('Templates file not found, using empty patterns')
      this.cleaner = new LogCleaner([])
    }

    this.rotator = new LogRotator(this.logsDir, this.legacyDir)
  }

  setupScheduler() {
    // Daily log rotation at specified hour
    const rotationCron = `0 ${this.rotationHour} * * *`
    cron.schedule(rotationCron, async () => {
      console.log(`Starting daily log rotation at ${new Date().toISOString()}`)
      await this.performRotation()
    })

    // Regular log cleaning
    const monitoringCron = `*/${this.monitoringInterval} * * * *`
    cron.schedule(monitoringCron, async () => {
      await this.performCleaning()
    })

    console.log(`Log Sanitizer started:`)
    console.log(`- Monitoring: every ${this.monitoringInterval} minutes`)
    console.log(`- Rotation: daily at ${this.rotationHour}:00`)
    console.log(`- Legacy retention: ${this.keepLegacyDays} days`)
    console.log(`- Logs directory: ${this.logsDir}`)
    console.log(`- Legacy directory: ${this.legacyDir}`)
  }

  async performCleaning() {
    try {
      const result = await this.cleaner.cleanDirectory(this.logsDir)

      if (result.cleaned > 0) {
        console.log(`Cleaning completed: ${result.cleaned} files cleaned, ${result.errors} errors`)
      }
    } catch (error) {
      console.error('Error during cleaning:', error.message)
    }
  }

  async performRotation() {
    try {
      // First, clean logs before rotation
      await this.performCleaning()

      // Rotate logs to legacy directory
      const rotateResult = await this.rotator.rotateToday()
      console.log(`Rotation completed: ${rotateResult.rotated} files rotated, ${rotateResult.errors} errors`)

      // Clean up old legacy logs
      const cleanupResult = await this.rotator.cleanupOldLogs(this.keepLegacyDays)
      console.log(`Cleanup completed: ${cleanupResult.deleted} old files deleted, ${cleanupResult.errors} errors`)

    } catch (error) {
      console.error('Error during rotation:', error.message)
    }
  }

  // Manual operations
  async manualClean() {
    console.log('Starting manual cleaning...')
    return await this.performCleaning()
  }

  async manualRotate() {
    console.log('Starting manual rotation...')
    return await this.performRotation()
  }
}

// Start the application
const sanitizer = new LogSanitizer()

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Log Sanitizer shutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Log Sanitizer shutting down...')
  process.exit(0)
})

module.exports = LogSanitizer