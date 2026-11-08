import { proto } from '../../WAProto/index.js'
import { generateWAMessageFromContent } from '../Utils/messages'

type SocketRich = {
user?: { id?: string }
relayMessage: (jid: string, message: any, opts: any) => Promise<any>
sendMessage: (jid: string, content: any, opts?: any) => Promise<any>
}

type Opsi = { atas?: string; bawah?: string; quoted?: any; rich?: boolean }

const TIPE = proto.AIRichResponseSubMessageType

const teks = (messageText: string) => ({
messageType: TIPE.AI_RICH_RESPONSE_TEXT,
messageText
})

const tabel = (title: string, header: string[], baris: string[][]) => ({
messageType: TIPE.AI_RICH_RESPONSE_TABLE,
tableMetadata: {
title,
rows: [
{ items: header, isHeading: true },
...baris.map(items => ({ items, isHeading: false }))
]
}
})

const kode = (isi: string, bahasa: string) => ({
messageType: TIPE.AI_RICH_RESPONSE_CODE,
codeMetadata: {
codeLanguage: bahasa,
codeBlocks: [
{
highlightType: proto.AIRichResponseCodeMetadata.AIRichResponseCodeHighlightType.AI_RICH_RESPONSE_CODE_HIGHLIGHT_DEFAULT,
codeContent: isi
}
]
}
})

const rakit = (inti: any[], opsi: Opsi) => [
...(opsi.atas ? [teks(opsi.atas)] : []),
...inti,
...(opsi.bawah ? [teks(opsi.bawah)] : [])
]

const gabung = (inti: string, opsi: Opsi) =>
[opsi.atas, inti, opsi.bawah].filter(Boolean).join('\n\n')

const tabelTeks = (title: string, header: string[], baris: string[][]) => {
const semua = [header, ...baris]
const lebar = header.map((_, i) => Math.max(...semua.map(r => (r[i] ?? '').length)))
const format = (r: string[]) => r.map((c, i) => (c ?? '').padEnd(lebar[i]!)).join(' | ')
const garis = lebar.map(l => '-'.repeat(l)).join('-+-')
return `*${title}*\n\`\`\`${[format(header), garis, ...baris.map(format)].join('\n')}\`\`\``
}

export const bikinRich = (sock: SocketRich) => {
const kirimRich = async (jid: string, submessages: any[], quoted?: any) => {
const msg: any = (generateWAMessageFromContent as any)(
jid,
{
richResponseMessage: {
messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
submessages
}
},
{ userJid: sock.user?.id ?? '', quoted }
)

await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
return msg
}

const kirimTeks = (jid: string, text: string, quoted?: any) =>
sock.sendMessage(jid, { text }, { quoted })

const sendTable = (jid: string, title: string, header: string[], baris: string[][], opsi: Opsi = {}) =>
opsi.rich
? kirimRich(jid, rakit([tabel(title, header, baris)], opsi), opsi.quoted)
: kirimTeks(jid, gabung(tabelTeks(title, header, baris), opsi), opsi.quoted)

const sendList = (jid: string, title: string, item: [string, string][], opsi: Opsi = {}) => {
const isi = `*${title}*\n${item.map(([label, nilai]) => `• ${label}: ${nilai}`).join('\n')}`
return opsi.rich
? kirimRich(jid, rakit([teks(isi)], opsi), opsi.quoted)
: kirimTeks(jid, gabung(isi, opsi), opsi.quoted)
}

const sendCodeBlock = (jid: string, isi: string, opsi: Opsi & { language?: string } = {}) =>
opsi.rich
? kirimRich(jid, rakit([kode(isi, opsi.language ?? 'text')], opsi), opsi.quoted)
: kirimTeks(jid, gabung(`\`\`\`${isi}\`\`\``, opsi), opsi.quoted)

return { sendTable, sendList, sendCodeBlock }
}
