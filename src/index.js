require('dotenv').config()
const cron = require('node-cron')
const path = require('path')
const LogCleaner = require('./modules/logCleaner')
const LogRotator = require('./modules/logRotator')
const PM2Manager = require('./modules/pm2Manager')

class LogSanitizer {
  constructor() {
    this.logsDir = process.env.LOGS_DIR || '/root/.pm2/logs'
    this.legacyDir = process.env.LEGACY_DIR || '/root/.pm2/logs/legacy'
    this.archiveSubdir = process.env.ARCHIVE_SUBDIR || 'daily'
    this.rotationHour = process.env.ROTATION_HOUR || 5
    this.monitoringInterval = process.env.MONITORING_INTERVAL_MINUTES || 30
    this.keepLegacyDays = process.env.KEEP_LEGACY_DAYS || 30

    // Create archive path - simply join legacy dir with subdir
    this.archivePath = path.join(this.legacyDir, this.archiveSubdir)

    this.initializeModules()
    this.setupScheduler()
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`)
  }

  error(message, error = null) {
    const errorMsg = error ? `${message}: ${error.message}` : message
    console.error(`[${new Date().toISOString()}] ERROR: ${errorMsg}`)
  }

  initializeModules() {
    try {
      const templates = require('../templates.js')
      this.cleaner = new LogCleaner(templates)
    } catch (error) {
      this.log('Templates file not found, using empty patterns')
      this.cleaner = new LogCleaner([])
    }

    this.rotator = new LogRotator(this.logsDir, this.archivePath)
    this.pm2Manager = new PM2Manager()
    
    this.setupPM2Restarts()
  }

  setupScheduler() {
    // Daily log rotation at specified hour
    const rotationCron = `0 ${this.rotationHour} * * *`
    cron.schedule(rotationCron, async () => {
      this.log(`Starting daily log rotation`)
      await this.performRotation()
    })

    // Regular log cleaning
    const monitoringCron = `*/${this.monitoringInterval} * * * *`
    cron.schedule(monitoringCron, async () => {
      await this.performCleaning()
    })

    this.log(`Log Sanitizer started:`)
    this.log(`- Monitoring: every ${this.monitoringInterval} minutes`)
    this.log(`- Rotation: daily at ${this.rotationHour}:00`)
    this.log(`- Legacy retention: ${this.keepLegacyDays} days`)
    this.log(`- Logs directory: ${this.logsDir}`)
    this.log(`- Legacy directory: ${this.legacyDir}`)
    this.log(`- Archive directory (absolute): ${this.archivePath}`)
    this.log(`- Working directory: ${process.cwd()}`)
  }

  setupPM2Restarts() {
    try {
      const restartConfig = require('../pm2-restart-config.js')
      
      let scheduledCount = 0
      for (const config of restartConfig) {
        if (!config.enabled) {
          continue
        }

        cron.schedule(config.schedule, async () => {
          this.log(`PM2 scheduled restart triggered for: ${config.name}`)
          const result = await this.pm2Manager.executeRestart(config.name, config.description)
          
          if (result.success) {
            this.log(`PM2 restart completed successfully: ${config.name}`)
          } else {
            this.error(`PM2 restart failed for ${config.name}: ${result.reason || result.error}`)
          }
        })

        scheduledCount++
        this.log(`PM2 restart scheduled: ${config.name} - ${config.description}`)
      }

      this.log(`PM2 restart scheduler initialized: ${scheduledCount} services scheduled`)

    } catch (error) {
      this.log('PM2 restart config not found - PM2 restart feature disabled')
    }
  }

  async performCleaning() {
    try {
      const result = await this.cleaner.cleanDirectory(this.logsDir)

      if (result.cleaned > 0 || result.errors > 0) {
        this.log(`Cleaning completed: ${result.cleaned} files cleaned, ${result.errors} errors`)
      }
    } catch (error) {
      this.error('Error during cleaning', error)
    }
  }

  async performRotation() {
    try {
      this.log('Starting rotation process')

      // First, rotate original logs to legacy directory (BEFORE cleaning!)
      const rotateResult = await this.rotator.rotateToday()
      this.log(`Rotation completed: ${rotateResult.rotated} files rotated, ${rotateResult.errors} errors`)

      // Clean up old legacy logs
      const cleanupResult = await this.rotator.cleanupOldLogs(this.keepLegacyDays)
      this.log(`Cleanup completed: ${cleanupResult.deleted} old files deleted, ${cleanupResult.errors} errors`)

    } catch (error) {
      this.error('Error during rotation', error)
    }
  }

  // Manual operations
  async manualClean() {
    this.log('Starting manual cleaning...')
    return await this.performCleaning()
  }

  async manualRotate() {
    this.log('Starting manual rotation...')
    return await this.performRotation()
  }
}

// Start the application
const sanitizer = new LogSanitizer()

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Log Sanitizer shutting down...`)
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Log Sanitizer shutting down...`)
  process.exit(0)
})

module.exports = LogSanitizer