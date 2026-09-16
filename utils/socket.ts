import type { Account } from '@/entities/account'
import type { Settings } from '@/entities/settings'
import type { Timeline } from '@/entities/timeline'
import generator, { type Entity, type WebSocketInterface } from '@cutls/megalodon'
import { listAccts } from './storage'

const stripForVoice = (html: string) => {
	const div = document.createElement('div')
	div.innerHTML = html
	const text = div.textContent || div.innerText || ''
	const protomatch = /(https?|ftp)(:\/\/[\w/:%#$&?()~.=+-]+)/g
	const b = text.replace(protomatch, '')
	return b
}
// 'home' | 'notifications' | 'local' | 'public' | 'favourites' | 'list' | 'bookmarks' | 'direct' | 'tag'
type StreamingArray = [string, WebSocketInterface, string]
export const speech = (text: string, timelineConfig: Settings['timeline']) => {}
export const start = async (timelines: Array<[Timeline, Account]>, generateStreaming: boolean) => {
	const fn = async () => {
		const userStreamings: StreamingArray[] = !generateStreaming ? globalThis.userStreamings : []
		if (generateStreaming) {
			const accts = await listAccts()
			for (const account of accts) {
				const noStreaming = account.noStreaming
				const isSubscribable = !account.cannotSubscribe
				try {
					const client = generator(account.sns, `https://${account.domain}`, account?.accessToken)
					const streaming = !noStreaming && (isSubscribable || account) ? await client.userStreamingSubscription() : undefined
					if (streaming) userStreamings.push([account.id, streaming, 'home'])
				} catch (e) {
					console.error(e)
					console.error('skipped user streaming')
				}
			}
		}

		const streamings: StreamingArray[] = []
		for (const [timeline, account] of timelines) {
			if (!account) continue

			let streaming: StreamingArray | null = null
			try {
				const client = generator(account.sns, `https://${account.domain}`, account?.accessToken, 'TheDesk(mobile)')
				const noStreaming = account.noStreaming
				const isSubscribable = !account.cannotSubscribe
				if (noStreaming) continue
				const targetSocketIndex = userStreamings.findIndex(([id]) => id === account.id)
				const targetSocket = targetSocketIndex >= 0 ? userStreamings[targetSocketIndex][1] : undefined
				let newStreaming: WebSocketInterface | null = null
				if (!targetSocket) continue
				if (timeline.kind === 'public') newStreaming = isSubscribable ? await client.publicStreamingSubscription(targetSocket) : await client.publicStreaming()
				if (timeline.kind === 'local') newStreaming = isSubscribable ? await client.localStreamingSubscription(targetSocket) : await client.localStreaming()
				if (timeline.kind === 'direct') newStreaming = isSubscribable ? await client.directStreamingSubscription(targetSocket) : await client.directStreaming()
				if (timeline.kind === 'list' && timeline.listId)
					newStreaming = isSubscribable ? await client.listStreamingSubscription(targetSocket, timeline.listId) : await client.listStreaming(timeline.listId)
				if (timeline.kind === 'tag') newStreaming = isSubscribable ? await client.tagStreamingSubscription(targetSocket, timeline.name) : await client.tagStreaming(timeline.name)
				if (!newStreaming) continue
				if (timeline.kind === 'public') streaming = [timeline.id, newStreaming, 'public']
				if (timeline.kind === 'local') streaming = [timeline.id, newStreaming, 'public:local']
				if (timeline.kind === 'direct') streaming = [timeline.id, newStreaming, 'direct']
				if (timeline.kind === 'list') streaming = [timeline.id, newStreaming, 'list']
				if (timeline.kind === 'tag') streaming = [timeline.id, newStreaming, 'tag']
			} catch {
				console.error('skipped')
			}
			if (streaming) streamings.push(streaming || [timeline.id, undefined, timeline.kind])
		}
		globalThis.streamings = streamings
		globalThis.userStreamings = userStreamings
		console.log('resolver')
	}
	await fn()
	return () => {
		allClose()
		return null
	}
}
export const listenTimelineWaiter = async (timelineId: string) => {
	while ((globalThis.streamings || []).findIndex((s: [string, WebSocketInterface, string]) => s[0] === timelineId) < 0) {
		console.log('waiting for timeline listener')
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}
}
export const listenTimeline = async <T>(channel: string, callback: (a: { payload: T; kind?: string }) => void, timelineConfig: Settings['timeline'], tts: boolean) => {
	const useStreaming = globalThis.streamings
	if (channel === 'receive-timeline-status') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			const timelineKind = useStreaming[i][2]
			if (!streaming) continue
			streaming.on('update', (status: Entity.Status, ch: string) => {
				if (tts) {
					const html = status.content
					const b = stripForVoice(html)
					speech(b, timelineConfig)
				}
				if (!ch || ch.includes(timelineKind)) callback({ payload: { status: status, tlId: useStreaming[i][0] } as T, kind: ch })
			})
		}
	}
	if (channel === 'receive-timeline-conversation') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			const timelineKind = useStreaming[i][2]
			if (!streaming) continue
			streaming.on('conversation', (status: Entity.Conversation, ch: string) => {
				if (!ch || ch.includes(timelineKind)) callback({ payload: { conversation: status, tlId: useStreaming[i][0] } as T, kind: ch })
			})
		}
	}
	if (channel === 'receive-timeline-status-update') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			const timelineKind = useStreaming[i][2]
			if (!streaming) continue
			streaming.on('status.update', (status: Entity.Status, ch: string) => {
				if (!ch || ch.includes(timelineKind)) callback({ payload: { status: status, tlId: useStreaming[i][0] } as T, kind: ch })
			})
		}
	}
	if (channel === 'delete-timeline-status') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			if (!streaming) continue
			streaming.on('delete', (id: string) => {
				callback({ payload: { statusId: id, tlId: useStreaming[i][0] } as T })
			})
		}
	}
}
export const listenUserWaiter = async (serverId: string) => {
	while ((globalThis.userStreamings || []).findIndex((s: [string, WebSocketInterface, string]) => s[0] === serverId) < 0) {
		console.log('waiting for server listener')
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}
}
export const listenUser = async <T>(channel: string, callback: (a: { payload: T }) => void, timelineConfig: Settings['timeline'], tts: boolean) => {
	const userStreamings = globalThis.userStreamings
	if (channel === 'receive-home-status') {
		for (let i = 0; i < userStreamings.length; i++) {
			const streaming = userStreamings[i][1]
			if (!streaming) continue
			streaming.on('update', (status: Entity.Status, ch: string) => {
				if (tts) {
					const html = status.content
					const b = stripForVoice(html)
					speech(b, timelineConfig)
				}
				if (!ch || ch.includes('user')) callback({ payload: { status: status, acctId: userStreamings[i][0] } as T })
			})
		}
	}
	if (channel === 'receive-home-status-update') {
		for (let i = 0; i < userStreamings.length; i++) {
			const streaming = userStreamings[i][1]
			if (!streaming) continue
			streaming.on('status_update', (status: Entity.Status, ch: string) => {
				if (!ch || ch.includes('user')) callback({ payload: { status: status, acctId: userStreamings[i][0] } as T })
			})
		}
	}
	if (channel === 'delete-home-status') {
		for (let i = 0; i < userStreamings.length; i++) {
			const streaming = userStreamings[i][1]
			if (!streaming) continue
			streaming.on('delete', (id: string) => {
				callback({ payload: { statusId: id, acctId: userStreamings[i][0] } as T })
			})
		}
	}
	if (channel === 'receive-notification') {
		for (let i = 0; i < userStreamings.length; i++) {
			const streaming = userStreamings[i][1]
			if (!streaming) continue
			streaming.on('notification', (mes: any) => {
				callback({ payload: { notification: mes, acctId: userStreamings[i][0] } as T })
			})
		}
	}
}
export const allUnsubscribe = async () => {
	const streamingState = globalThis.userStreamings
	for (const streaming of streamingState) {
		const str: WebSocketInterface = streaming[1]
		if (!str) continue
		const chs = str.channelSubscriptions || []
		for (const ch of chs) {
			if (ch.stream !== 'user') str.unsubscribe(ch.stream)
		}
	}
	if (!streamingState || streamingState.length === 0) return
	for (const streaming of streamingState) streaming[1]?.removeAllListeners()
	globalThis.streamings = []
}
export const allClose = async () => {
	const streamingState = globalThis.streamings
	console.log('allClosed', streamingState)
	if (!streamingState || streamingState.length === 0) return
	for (const streaming of streamingState) streaming[1]?.removeAllListeners()
	for (const streaming of streamingState) streaming[1]?.stop()
	globalThis.streamings = []
	const userStreamingState = globalThis.userStreamings
	if (!userStreamingState || userStreamingState.length === 0) return
	for (const streaming of userStreamingState) streaming[1]?.removeAllListeners()
	for (const streaming of userStreamingState) streaming[1]?.stop()
	globalThis.userStreamings = []

	await new Promise((resolve) => setTimeout(resolve, 1000))
	return
}
