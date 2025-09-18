const fs = require('fs-extra')
const path = require('path')

class LogRotator {
  constructor(logsDir, legacyDir, cleaner = null) {
    this.logsDir = logsDir
    this.legacyDir = legacyDir
    this.cleaner = cleaner
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`)
  }

  error(message, error = null) {
    const errorMsg = error ? `${message}: ${error.message}` : message
    console.error(`[${new Date().toISOString()}] ERROR: ${errorMsg}`)
  }

  async rotateToday() {
    try {
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]

      // Create the full archive directory path
      await fs.ensureDir(this.legacyDir)
      this.log(`Ensured archive directory exists: ${this.legacyDir}`)

      if (!await fs.pathExists(this.logsDir)) {
        this.log(`Source directory not found: ${this.logsDir}`)
        return { rotated: 0, errors: 0 }
      }

      const files = await fs.readdir(this.logsDir)
      const logFiles = files.filter(file => file.endsWith('.log'))

      let rotated = 0
      let errors = 0

      for (const file of logFiles) {
        try {
          const sourcePath = path.join(this.logsDir, file)

          // Skip if file is empty
          const stats = await fs.stat(sourcePath)
          if (stats.size === 0) {
            continue
          }

          // Create legacy filename with date
          const baseName = path.basename(file, '.log')
          const legacyFileName = `${baseName}-${dateStr}.log`
          const targetPath = path.join(this.legacyDir, legacyFileName)

          this.log(`Copying ${sourcePath} -> ${targetPath}`)

          // Copy to legacy directory
          await fs.copy(sourcePath, targetPath)

          // Truncate original file
          await fs.writeFile(sourcePath, '')

          rotated++
          this.log(`Rotated: ${file} -> ${legacyFileName} (saved to ${targetPath})`)

        } catch (error) {
          this.error(`Error rotating ${file}`, error)
          errors++
        }
      }

      return { rotated, errors, total: logFiles.length }

    } catch (error) {
      this.error('Error during log rotation', error)
      return { rotated: 0, errors: 1, total: 0 }
    }
  }

  async cleanupOldLogs(keepDays) {
    try {
      if (!await fs.pathExists(this.legacyDir)) {
        return { deleted: 0, errors: 0 }
      }

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - keepDays)

      const files = await fs.readdir(this.legacyDir)
      const legacyFiles = files.filter(file => file.endsWith('.log'))

      let deleted = 0
      let errors = 0

      for (const file of legacyFiles) {
        try {
          // Extract date from filename (format: name-YYYY-MM-DD.log)
          const dateMatch = file.match(/-(\d{4}-\d{2}-\d{2})\.log$/)

          if (dateMatch) {
            const fileDate = new Date(dateMatch[1])

            if (fileDate < cutoffDate) {
              const filePath = path.join(this.legacyDir, file)
              await fs.unlink(filePath)
              deleted++
              this.log(`Deleted old log: ${file}`)
            }
          }

        } catch (error) {
          this.error(`Error deleting ${file}`, error)
          errors++
        }
      }

      return { deleted, errors, total: legacyFiles.length }

    } catch (error) {
      this.error('Error during cleanup', error)
      return { deleted: 0, errors: 1, total: 0 }
    }
  }
}

module.exports = LogRotator