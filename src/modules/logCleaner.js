const fs = require('fs-extra')
const path = require('path')

class LogCleaner {
  constructor(templates) {
    this.patterns = templates
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`)
  }

  error(message, error = null) {
    const errorMsg = error ? `${message}: ${error.message}` : message
    console.error(`[${new Date().toISOString()}] ERROR: ${errorMsg}`)
  }

  async cleanFile(filePath) {
    try {
      if (!await fs.pathExists(filePath)) {
        return false
      }

      const content = await fs.readFile(filePath, 'utf8')
      let cleanedContent = content

      for (const pattern of this.patterns) {
        // Escape special regex characters but preserve newlines
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedPattern, 'gi')
        const beforeLength = cleanedContent.length
        cleanedContent = cleanedContent.replace(regex, '')
        const afterLength = cleanedContent.length

        if (beforeLength !== afterLength) {
          this.log(`Pattern matched in ${path.basename(filePath)}: removed ${beforeLength - afterLength} characters`)
        }
      }

      // Remove multiple consecutive empty lines
      cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n')

      if (content !== cleanedContent) {
        await fs.writeFile(filePath, cleanedContent)
        return true
      }

      return false
    } catch (error) {
      this.error(`Error cleaning file ${filePath}`, error)
      return false
    }
  }

  async cleanDirectory(dirPath) {
    try {
      if (!await fs.pathExists(dirPath)) {
        this.log(`Directory not found: ${dirPath}`)
        return { cleaned: 0, errors: 0 }
      }

      const files = await fs.readdir(dirPath)
      const logFiles = files.filter(file => file.endsWith('.log'))

      let cleaned = 0
      let errors = 0

      for (const file of logFiles) {
        const filePath = path.join(dirPath, file)
        const result = await this.cleanFile(filePath)

        if (result === true) {
          cleaned++
          this.log(`Cleaned: ${file}`)
        } else if (result === false) {
          // File was processed but no changes needed
        } else {
          errors++
        }
      }

      return { cleaned, errors, total: logFiles.length }
    } catch (error) {
      this.error(`Error cleaning directory ${dirPath}`, error)
      return { cleaned: 0, errors: 1, total: 0 }
    }
  }
}

module.exports = LogCleaner