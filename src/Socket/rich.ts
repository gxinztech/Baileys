import { proto } from '../../WAProto/index.js'
import { generateWAMessageFromContent } from '../Utils/messages'

type SocketRich = {
user?: { id?: string }
relayMessage: (jid: string, message: any, opts: any) => Promise<any>
}

type Opsi = { atas?: string; bawah?: string; quoted?: any }

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

export const bikinRich = (sock: SocketRich) => {
const kirim = async (jid: string, submessages: any[], quoted?: any) => {
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

const sendTable = (jid: string, title: string, header: string[], baris: string[][], opsi: Opsi = {}) =>
kirim(jid, rakit([tabel(title, header, baris)], opsi), opsi.quoted)

const sendList = (jid: string, title: string, item: [string, string][], opsi: Opsi = {}) => {
const isi = item.map(([label, nilai]) => `• ${label}: ${nilai}`).join('\n')
return kirim(jid, rakit([teks(`${title}\n${isi}`)], opsi), opsi.quoted)
}

const sendCodeBlock = (jid: string, isi: string, opsi: Opsi & { language?: string } = {}) =>
kirim(jid, rakit([kode(isi, opsi.language ?? 'text')], opsi), opsi.quoted)

return { sendTable, sendList, sendCodeBlock }
}
