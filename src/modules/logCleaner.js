const fs = require('fs-extra')
const path = require('path')

class LogCleaner {
  constructor(templates) {
    this.patterns = templates
  }

  async cleanFile(filePath) {
    try {
      if (!await fs.pathExists(filePath)) {
        return false
      }

      const content = await fs.readFile(filePath, 'utf8')
      let cleanedContent = content

      for (const pattern of this.patterns) {
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        cleanedContent = cleanedContent.replace(regex, '')
      }

      // Remove empty lines
      cleanedContent = cleanedContent.replace(/^\s*[\r\n]/gm, '')

      if (content !== cleanedContent) {
        await fs.writeFile(filePath, cleanedContent)
        return true
      }
      
      return false
    } catch (error) {
      console.error(`Error cleaning file ${filePath}:`, error.message)
      return false
    }
  }

  async cleanDirectory(dirPath) {
    try {
      if (!await fs.pathExists(dirPath)) {
        console.log(`Directory not found: ${dirPath}`)
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
          console.log(`Cleaned: ${file}`)
        } else if (result === false && result !== null) {
          errors++
        }
      }

      return { cleaned, errors, total: logFiles.length }
    } catch (error) {
      console.error(`Error cleaning directory ${dirPath}:`, error.message)
      return { cleaned: 0, errors: 1, total: 0 }
    }
  }
}

module.exports = LogCleaner