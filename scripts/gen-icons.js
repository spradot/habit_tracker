const fs = require('fs')
const path = require('path')

// Minimal valid 1x1 transparent PNG as placeholder — replace with real icons for prod
// This is a real 192x192 green square PNG (base64)
const icon192 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

fs.mkdirSync(path.join(__dirname, '../public/icons'), { recursive: true })
fs.writeFileSync(path.join(__dirname, '../public/icons/icon-192.png'), icon192)
fs.writeFileSync(path.join(__dirname, '../public/icons/icon-512.png'), icon192)
console.log('Icon placeholders created (replace with real 192x192 and 512x512 PNGs for production)')
