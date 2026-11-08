const fs = require('fs')

const p = JSON.parse(fs.readFileSync('package.json', 'utf8'))

p.main = 'cjs/lib/index.js'
p.module = 'lib/index.js'
p.exports = {
'.': {
types: './lib/index.d.ts',
import: './lib/index.js',
require: './cjs/lib/index.js',
default: './lib/index.js'
},
'./package.json': './package.json'
}
p.files = [...new Set([...(p.files || []), 'cjs/**/*'])]
p.engines = { ...(p.engines || {}), node: '>=20.0.0' }
p.scripts = { ...p.scripts, 'build:cjs': 'node scripts/build-cjs.mjs' }

fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n')
console.log('package.json diperbarui')
