require('dotenv').config()
const LogSanitizer = require('./src/index.js')

async function testCleaning() {
  console.log(`[${new Date().toISOString()}] Starting manual test cleaning...`)

  const sanitizer = new LogSanitizer()

  // Manual cleaning test
  await sanitizer.manualClean()

  console.log(`[${new Date().toISOString()}] Manual cleaning test completed`)
  process.exit(0)
}

testCleaning().catch(error => {
  console.error(`[${new Date().toISOString()}] ERROR: Test failed:`, error.message)
  process.exit(1)
})