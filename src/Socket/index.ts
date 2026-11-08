import { proto } from '../../WAProto/index.js'
import { DEFAULT_CONNECTION_CONFIG } from '../Defaults'
import type { UserFacingSocketConfig } from '../Types'
import { generateWAMessageFromContent } from '../Utils/messages'
import { makeCommunitiesSocket } from './communities'
import { bikinRich } from './rich'

type AlbumItem = { image?: any; video?: any; caption?: string }

type TombolInteraktif =
| { type: 'reply'; text: string; id: string }
| { type: 'url'; text: string; url: string }
| { type: 'copy'; text: string; code: string }
| { type: 'call'; text: string; phone: string }

type OpsiInteraktif = {
text: string
footer?: string
title?: string
buttons: TombolInteraktif[]
}

const bikinTombol = (b: TombolInteraktif) => {
switch (b.type) {
case 'reply':
return {
name: 'quick_reply',
buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id })
}
case 'url':
return {
name: 'cta_url',
buttonParamsJson: JSON.stringify({ display_text: b.text, url: b.url, merchant_url: b.url })
}
case 'copy':
return {
name: 'cta_copy',
buttonParamsJson: JSON.stringify({ display_text: b.text, copy_code: b.code })
}
case 'call':
return {
name: 'cta_call',
buttonParamsJson: JSON.stringify({ display_text: b.text, phone_number: b.phone })
}
default:
throw new Error('Tipe tombol tidak dikenal')
}
}

// export the last socket layer
const makeWASocket = (config: UserFacingSocketConfig) => {
const newConfig = {
...DEFAULT_CONNECTION_CONFIG,
...config
}

const sock = makeCommunitiesSocket(newConfig)

const channel = newConfig.autoFollowChannel
if (channel) {
let sudahFollow = false
sock.ev.on('connection.update', async ({ connection }) => {
if (connection === 'open' && !sudahFollow) {
sudahFollow = true
try {
await sock.newsletterFollow(channel)
console.log('[auto-follow] berhasil follow channel')
} catch (e) {
console.log('[auto-follow] gagal:', (e as Error).message)
}
}
})
}

const cekIDSaluran = async (link: string) => {
const kode = link.match(/channel\/([A-Za-z0-9_-]+)/)?.[1] ?? link.trim()
return sock.newsletterMetadata('invite', kode)
}

const sendAlbum = async (jid: string, items: AlbumItem[], options?: any) => {
if (!items || items.length < 2) {
throw new Error('Album minimal 2 media')
}

const expectedImageCount = items.filter(i => i.image).length
const expectedVideoCount = items.filter(i => i.video).length

const parent = await sock.sendMessage(
jid,
{ album: { expectedImageCount, expectedVideoCount } } as any,
options
)

const hasil = [parent]
for (const item of items) {
const msg = await sock.sendMessage(
jid,
{ ...item, albumParentKey: parent!.key } as any,
options
)
hasil.push(msg)
await new Promise(r => setTimeout(r, 500))
}

return hasil
}

const sendInteractive = async (jid: string, opsi: OpsiInteraktif, options?: any) => {
if (!opsi?.buttons?.length) {
throw new Error('Minimal 1 tombol')
}

const interactiveMessage: any = proto.Message.InteractiveMessage.create({
body: proto.Message.InteractiveMessage.Body.create({ text: opsi.text }),
footer: proto.Message.InteractiveMessage.Footer.create({ text: opsi.footer ?? '' }),
header: proto.Message.InteractiveMessage.Header.create({
title: opsi.title ?? '',
subtitle: '',
hasMediaAttachment: false
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: opsi.buttons.map(bikinTombol),
messageParamsJson: ''
})
})

const quoted = options?.quoted
if (quoted?.message) {
interactiveMessage.contextInfo = {
stanzaId: quoted.key.id,
participant: quoted.key.participant || quoted.key.remoteJid,
quotedMessage: quoted.message
}
}

const msg: any = (generateWAMessageFromContent as any)(
jid,
{
viewOnceMessage: {
message: {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2
},
interactiveMessage
}
}
},
{ userJid: sock.user?.id ?? '' }
)

const nodes: any[] = [
{
tag: 'biz',
attrs: {},
content: [
{
tag: 'interactive',
attrs: { type: 'native_flow', v: '1' },
content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
}
]
}
]

if (!jid.endsWith('@g.us')) {
nodes.push({ tag: 'bot', attrs: { biz_bot: '1' } })
}

await sock.relayMessage(jid, msg.message, {
messageId: msg.key.id,
additionalNodes: nodes
} as any)

return msg
}

return { ...sock, cekIDSaluran, sendAlbum, sendInteractive, ...bikinRich(sock) }
}

export default makeWASocket
