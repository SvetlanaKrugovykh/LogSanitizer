require('dotenv').config()
const LogSanitizer = require('./src/index.js')

async function testRotation() {
  console.log(`[${new Date().toISOString()}] Starting manual test rotation...`)

  const sanitizer = new LogSanitizer()

  // Manual rotation test
  await sanitizer.manualRotate()

  console.log(`[${new Date().toISOString()}] Manual test completed`)
  process.exit(0)
}

testRotation().catch(error => {
  console.error(`[${new Date().toISOString()}] ERROR: Test failed:`, error.message)
  process.exit(1)
})