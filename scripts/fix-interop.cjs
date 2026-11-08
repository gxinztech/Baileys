const fs = require('fs')
const path = require('path')

const akar = 'cjs'
const lewati = path.join(akar, 'vendor')

const telusuri = dir =>
fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
const p = path.join(dir, e.name)
if (p === lewati) return []
if (e.isDirectory()) return telusuri(p)
return p.endsWith('.js') ? [p] : []
})

let jumlah = 0
for (const file of telusuri(akar)) {
const isi = fs.readFileSync(file, 'utf8')
const baru = isi.replace(/(__toESM\(require\([^)]*\))\s*,\s*1\s*\)/g, '$1)')
if (baru !== isi) {
fs.writeFileSync(file, baru)
jumlah++
}
}

console.log('interop diperbaiki di', jumlah, 'file')
