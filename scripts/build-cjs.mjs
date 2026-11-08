import { build } from 'esbuild'
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'

const OUT = 'cjs'

// paket ESM-only yang di-bundle ke cjs/vendor supaya bisa di-require
const VENDOR = [
{ nama: 'p-queue', default: true },
{ nama: 'whatsapp-rust-bridge', default: false }
]

const cari = (dir, ekstensi) =>
readdirSync(dir, { recursive: true })
.filter(f => extname(f) === ekstensi)
.map(f => join(dir, f))

rmSync(OUT, { recursive: true, force: true })

await build({
entryPoints: [...cari('lib', '.js'), 'WAProto/index.js'],
outdir: OUT,
outbase: '.',
format: 'cjs',
platform: 'node',
target: 'node20',
logLevel: 'warning'
})

for (const v of VENDOR) {
const kode = [`export * from '${v.nama}'`, v.default && `export { default } from '${v.nama}'`]
.filter(Boolean)
.join('\n')

await build({
stdin: { contents: kode, resolveDir: process.cwd(), loader: 'js' },
outfile: join(OUT, 'vendor', `${v.nama}.cjs`),
bundle: true,
format: 'cjs',
platform: 'node',
target: 'node20',
logLevel: 'warning'
})
}

for (const file of cari(OUT, '.js')) {
if (file.startsWith(join(OUT, 'vendor'))) continue
let isi = readFileSync(file, 'utf8')
let berubah = false
for (const v of VENDOR) {
const pola = new RegExp(`require\\((["'])${v.nama}\\1\\)`, 'g')
let rel = relative(dirname(file), join(OUT, 'vendor', `${v.nama}.cjs`)).split('\\').join('/')
if (!rel.startsWith('.')) rel = './' + rel
isi = isi.replace(pola, () => {
berubah = true
return `require("${rel}")`
})
}
if (berubah) writeFileSync(file, isi)
}

for (const f of cari('lib', '.json')) {
const tujuan = join(OUT, f)
mkdirSync(dirname(tujuan), { recursive: true })
cpSync(f, tujuan)
}

writeFileSync(join(OUT, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n')
console.log('cjs selesai')
