const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

class PM2Manager {
  constructor() {
    this.isUbuntu = process.platform === 'linux'
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] PM2: ${message}`)
  }

  error(message, error = null) {
    const errorMsg = error ? `${message}: ${error.message}` : message
    console.error(`[${new Date().toISOString()}] PM2 ERROR: ${errorMsg}`)
  }

  async checkPM2Available() {
    try {
      const { stdout } = await execAsync('which pm2')
      return stdout.trim().length > 0
    } catch (error) {
      return false
    }
  }

  async getRunningServices() {
    try {
      const { stdout } = await execAsync('pm2 jlist')
      const services = JSON.parse(stdout)
      return services.map(service => ({
        name: service.name,
        status: service.pm2_env.status,
        pid: service.pid,
        uptime: service.pm2_env.pm_uptime
      }))
    } catch (error) {
      this.error('Failed to get PM2 services list', error)
      return []
    }
  }

  async restartService(serviceName) {
    try {
      this.log(`Attempting to restart service: ${serviceName}`)
      
      const { stdout, stderr } = await execAsync(`pm2 restart ${serviceName}`)
      
      if (stderr && !stderr.includes('successfully')) {
        throw new Error(stderr)
      }

      this.log(`Successfully restarted service: ${serviceName}`)
      return { success: true, output: stdout }
      
    } catch (error) {
      this.error(`Failed to restart service ${serviceName}`, error)
      return { success: false, error: error.message }
    }
  }

  async validateService(serviceName) {
    try {
      const services = await this.getRunningServices()
      const service = services.find(s => s.name === serviceName)
      
      if (!service) {
        this.error(`Service not found: ${serviceName}`)
        return false
      }

      if (service.status !== 'online') {
        this.error(`Service ${serviceName} is not online (status: ${service.status})`)
        return false
      }

      return true
    } catch (error) {
      this.error(`Failed to validate service ${serviceName}`, error)
      return false
    }
  }

  async executeRestart(serviceName, description) {
    if (!this.isUbuntu) {
      this.log('PM2 restart skipped - not running on Linux')
      return { success: false, reason: 'Not Linux platform' }
    }

    if (!await this.checkPM2Available()) {
      this.error('PM2 is not available on this system')
      return { success: false, reason: 'PM2 not found' }
    }

    // Validate service exists before restart
    if (!await this.validateService(serviceName)) {
      return { success: false, reason: 'Service validation failed' }
    }

    this.log(`Executing scheduled restart: ${description}`)
    return await this.restartService(serviceName)
  }
}

module.exports = PM2Manager