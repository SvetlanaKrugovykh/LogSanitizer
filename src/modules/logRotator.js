const fs = require('fs-extra')
const path = require('path')

class LogRotator {
  constructor(logsDir, legacyDir) {
    this.logsDir = logsDir
    this.legacyDir = legacyDir
  }

  async rotateToday() {
    try {
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]

      await fs.ensureDir(this.legacyDir)

      if (!await fs.pathExists(this.logsDir)) {
        console.log(`Source directory not found: ${this.logsDir}`)
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

          // Copy to legacy directory
          await fs.copy(sourcePath, targetPath)

          // Truncate original file
          await fs.writeFile(sourcePath, '')

          rotated++
          console.log(`Rotated: ${file} -> ${legacyFileName}`)

        } catch (error) {
          console.error(`Error rotating ${file}:`, error.message)
          errors++
        }
      }

      return { rotated, errors, total: logFiles.length }

    } catch (error) {
      console.error('Error during log rotation:', error.message)
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
              console.log(`Deleted old log: ${file}`)
            }
          }

        } catch (error) {
          console.error(`Error deleting ${file}:`, error.message)
          errors++
        }
      }

      return { deleted, errors, total: legacyFiles.length }

    } catch (error) {
      console.error('Error during cleanup:', error.message)
      return { deleted: 0, errors: 1, total: 0 }
    }
  }
}

module.exports = LogRotator