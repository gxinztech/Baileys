import { DEFAULT_CONNECTION_CONFIG } from '../Defaults'
import type { UserFacingSocketConfig } from '../Types'
import { makeCommunitiesSocket } from './communities'

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

	return sock
}

export default makeWASocket
