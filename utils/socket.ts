import type { Account } from '@/entities/account'
import type { Settings } from '@/entities/settings'
import type { Timeline } from '@/entities/timeline'
import generator, { type Entity, type WebSocketInterface } from '@cutls/megalodon'
import { NitroWebSocket } from 'react-native-nitro-websockets'
import { listAccts } from './storage'

type MastodonSubscription = { stream: string; list?: string; tag?: string }
const mastodonConnections = new Set<MastodonStreaming>()
const connectionListeners = new Set<() => void>()

export const subscribeStreamingConnection = (listener: () => void) => {
	connectionListeners.add(listener)
	return () => {
		connectionListeners.delete(listener)
	}
}
const notifyStreamingConnection = () => {
	for (const listener of connectionListeners) listener()
}

export const getTimelineStreamingConnected = (timeline: Pick<Timeline, 'id' | 'acctId' | 'kind'>) => {
	const isUserStream = timeline.kind === 'home' || timeline.kind === 'notifications'
	const streamings: StreamingArray[] = (isUserStream ? globalThis.userStreamings : globalThis.streamings) || []
	const streaming = streamings.find(([id]) => id === (isUserStream ? timeline.acctId : timeline.id))?.[1]
	return streaming instanceof MastodonStreaming && streaming.isConnected
}

let streamingGeneration = 0
type MastodonStatus = Omit<Entity.Status, 'quote' | 'reblog'> & {
	quote?: MastodonStatus | { state: Entity.Status['quote_status_state']; quoted_status?: MastodonStatus | null } | null
	reblog?: MastodonStatus | null
}

// Keep the status shape consumed by the UI without using Megalodon's converters.
const mastodonStatus = (status: MastodonStatus): Entity.Status => {
	const quote = status.quote
	const quotedStatus = quote && ('id' in quote ? quote : quote.quoted_status)
	return {
		...status,
		plain_content: null,
		reblog: status.reblog ? mastodonStatus(status.reblog) : null,
		emojis: status.emojis || [],
		media_attachments: status.media_attachments || [],
		mentions: status.mentions || [],
		card: status.card || null,
		poll: status.poll || null,
		application: status.application || null,
		bookmarked: status.bookmarked || false,
		emoji_reactions: status.emoji_reactions || [],
		quote: !!quote,
		quote_status: quotedStatus ? mastodonStatus(quotedStatus) : null,
		quote_status_state: quote ? ('id' in quote ? 'accepted' : quote.state) : undefined
	}
}

class MastodonStreaming {
	private socket?: NitroWebSocket
	private retry?: ReturnType<typeof setTimeout>
	private connectionTimeout?: ReturnType<typeof setTimeout>
	private retryDelay = 1000
	private stopped = false
	private listeners = new Map<string, Array<(payload: any, channel: string) => void>>()
	private streams = new Set<MastodonStreaming>()
	private owner: MastodonStreaming

	constructor(
		private account: Account,
		private subscription: MastodonSubscription,
		owner?: MastodonStreaming
	) {
		this.owner = owner || this
		const subscribed = this.owner.hasSubscription(subscription)
		this.owner.streams.add(this)
		if (!owner) {
			mastodonConnections.add(this)
			this.connect()
		} else if (!subscribed) owner.sendSubscription('subscribe', subscription)
	}

	private hasSubscription(subscription: MastodonSubscription) {
		return [...this.streams].some((stream) => stream.subscription.stream === subscription.stream && stream.subscription.list === subscription.list && stream.subscription.tag === subscription.tag)
	}

	get channelSubscriptions() {
		return [...this.owner.streams].map((stream) => stream.subscription)
	}

	get isConnected() {
		return !this.stopped && !this.owner.stopped && this.owner.socket?.readyState === 'OPEN'
	}

	subscribeTimeline(subscription: MastodonSubscription) {
		return new MastodonStreaming(this.account, subscription, this.account.cannotSubscribe ? undefined : this.owner)
	}

	on(event: string, listener: (payload: any, channel: string) => void) {
		const listeners = this.listeners.get(event) || []
		listeners.push(listener)
		this.listeners.set(event, listeners)
		return this
	}

	removeAllListeners() {
		this.listeners.clear()
		return this
	}

	unsubscribe(channel: string) {
		for (const stream of [...this.owner.streams]) {
			if (stream.subscription.stream === channel) stream.stop()
		}
	}

	stop() {
		if (this.stopped) return
		this.stopped = true
		this.removeAllListeners()
		if (this.owner !== this) {
			this.owner.streams.delete(this)
			if (!this.owner.hasSubscription(this.subscription)) this.owner.sendSubscription('unsubscribe', this.subscription)
			notifyStreamingConnection()
			return
		}
		if (this.retry) clearTimeout(this.retry)
		this.retry = undefined
		mastodonConnections.delete(this)
		for (const stream of this.streams) {
			stream.stopped = true
			stream.removeAllListeners()
		}
		this.streams.clear()
		this.closeSocket()
	}

	private closeSocket() {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout)
		this.connectionTimeout = undefined
		const socket = this.socket
		this.socket = undefined
		notifyStreamingConnection()
		if (!socket) return
		socket.onopen = null
		socket.onmessage = null
		socket.onerror = null
		socket.onclose = null
		socket.close()
	}

	private reconnect = () => {
		if (this.stopped || this.retry) return
		this.closeSocket()
		this.retry = setTimeout(() => {
			this.retry = undefined
			this.connect()
		}, this.retryDelay)
		this.retryDelay = Math.min(this.retryDelay * 2, 30000)
	}

	private sendSubscription(type: 'subscribe' | 'unsubscribe', subscription: MastodonSubscription) {
		if (this.socket?.readyState !== 'OPEN' || this.account.cannotSubscribe) return
		try {
			this.socket.send(JSON.stringify({ type, ...subscription }))
		} catch {
			this.reconnect()
		}
	}

	private connect() {
		if (this.stopped) return
		try {
			// Account setup has already discovered the instance's streaming hostname.
			const url = new URL(this.account.streamingUrl || `wss://${this.account.domain}`)
			url.protocol = url.protocol === 'http:' || url.protocol === 'ws:' ? 'ws:' : 'wss:'
			url.pathname = `${url.pathname.replace(/\/$/, '').replace(/\/api\/v1\/streaming$/, '')}/api/v1/streaming`
			url.search = ''
			url.hash = ''
			if (this.account.cannotSubscribe) {
				for (const [key, value] of Object.entries(this.subscription)) url.searchParams.set(key, value)
			}
			const socket = new NitroWebSocket(url.toString(), undefined, { Authorization: `Bearer ${this.account.accessToken}` })
			this.socket = socket
			this.connectionTimeout = setTimeout(this.reconnect, 30000)
			socket.onopen = () => {
				if (this.stopped || this.socket !== socket) return
				if (this.connectionTimeout) clearTimeout(this.connectionTimeout)
				this.connectionTimeout = undefined
				this.retryDelay = 1000
				const subscriptions = new Map(this.channelSubscriptions.map((subscription) => [JSON.stringify(subscription), subscription]))
				for (const subscription of subscriptions.values()) this.sendSubscription('subscribe', subscription)
				notifyStreamingConnection()
			}
			socket.onmessage = (message) => {
				if (this.stopped || this.socket !== socket || message.isBinary || !message.data) return
				this.receive(message.data)
			}
			socket.onerror = () => {
				if (this.socket === socket) this.reconnect()
			}
			socket.onclose = () => {
				if (this.socket === socket) this.reconnect()
			}
		} catch {
			this.reconnect()
		}
	}

	private receive(data: string) {
		let event: string
		let channel: string[] | undefined
		let payload: any
		try {
			const message = JSON.parse(data)
			if (!message || typeof message.event !== 'string') return
			event = message.event
			channel = Array.isArray(message.stream) ? message.stream : undefined
			payload = message.payload
			if (payload !== undefined && event !== 'delete' && event !== 'announcement.delete') payload = JSON.parse(payload)
			if (event === 'update' || event === 'status.update') payload = mastodonStatus(payload)
			if (event === 'notification') {
				payload = { ...payload, type: payload.type === 'poll' ? 'poll_expired' : payload.type }
				if (payload.status) payload.status = mastodonStatus(payload.status)
			}
			if (event === 'conversation') {
				payload = { ...payload, accounts: payload.accounts || [], last_status: payload.last_status ? mastodonStatus(payload.last_status) : null }
			}
		} catch {
			console.warn('Ignored malformed Mastodon streaming event')
			return
		}
		for (const stream of this.streams) {
			const subscription = stream.subscription
			const parameter = subscription.list ?? subscription.tag
			if (channel && (channel[0] !== subscription.stream || (parameter !== undefined && channel[1] !== parameter))) continue
			// A multiplexed message without a stream cannot be routed safely.
			if (!channel && !this.account.cannotSubscribe) continue
			const events = event === 'status.update' ? ['status.update', 'status_update'] : [event]
			for (const name of events) {
				for (const listener of stream.listeners.get(name) || []) listener(payload, subscription.stream)
			}
		}
	}
}

const stripForVoice = (html: string) => {
	const div = document.createElement('div')
	div.innerHTML = html
	const text = div.textContent || div.innerText || ''
	const protomatch = /(https?|ftp)(:\/\/[\w/:%#$&?()~.=+-]+)/g
	const b = text.replace(protomatch, '')
	return b
}
// 'home' | 'notifications' | 'local' | 'public' | 'favourites' | 'list' | 'bookmarks' | 'direct' | 'tag'
type StreamingArray = [string, WebSocketInterface | MastodonStreaming, string]
const closeMastodonStreams = (includeUser: boolean) => {
	// Include connections created by a start() that is still awaiting another SNS.
	if (includeUser) for (const streaming of mastodonConnections) streaming.stop()
	const timelines: StreamingArray[] = globalThis.streamings || []
	const users: StreamingArray[] = globalThis.userStreamings || []
	for (const [, streaming] of includeUser ? [...timelines, ...users] : timelines) {
		if (streaming instanceof MastodonStreaming) streaming.stop()
	}
	globalThis.streamings = timelines.filter(([, streaming]) => !(streaming instanceof MastodonStreaming))
	if (includeUser) globalThis.userStreamings = users.filter(([, streaming]) => !(streaming instanceof MastodonStreaming))
}
export const speech = (text: string, timelineConfig: Settings['timeline']) => {}
export const start = async (timelines: Array<[Timeline, Account]>, generateStreaming: boolean) => {
	const generation = ++streamingGeneration
	closeMastodonStreams(generateStreaming)
	const fn = async () => {
		const userStreamings: StreamingArray[] = !generateStreaming ? globalThis.userStreamings || [] : []
		if (generateStreaming) {
			const accts = await listAccts()
			if (generation !== streamingGeneration) return
			for (const account of accts) {
				if (generation !== streamingGeneration) return
				const noStreaming = account.noStreaming
				const isSubscribable = !account.cannotSubscribe
				try {
					if (account.sns === 'mastodon') {
						if (!noStreaming) userStreamings.push([account.id, new MastodonStreaming(account, { stream: 'user' }), 'home'])
						continue
					}
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
			if (generation !== streamingGeneration) return
			if (!account) continue

			let streaming: StreamingArray | null = null
			try {
				if (account.sns === 'mastodon') {
					if (account.noStreaming) continue
					const userStreaming = userStreamings.find(([id]) => id === account.id)?.[1]
					if (!(userStreaming instanceof MastodonStreaming)) continue
					let subscription: MastodonSubscription | undefined
					if (timeline.kind === 'public') subscription = { stream: 'public' }
					if (timeline.kind === 'local') subscription = { stream: 'public:local' }
					if (timeline.kind === 'direct') subscription = { stream: 'direct' }
					if (timeline.kind === 'list' && timeline.listId) subscription = { stream: 'list', list: timeline.listId }
					if (timeline.kind === 'tag') subscription = { stream: 'hashtag', tag: timeline.tagName || timeline.name }
					if (subscription) streamings.push([timeline.id, userStreaming.subscribeTimeline(subscription), subscription.stream])
					continue
				}
				const client = generator(account.sns, `https://${account.domain}`, account?.accessToken, 'TheDesk(mobile)')
				const noStreaming = account.noStreaming
				const isSubscribable = !account.cannotSubscribe
				if (noStreaming) continue
				const targetSocketIndex = userStreamings.findIndex(([id]) => id === account.id)
				const targetSocket = targetSocketIndex >= 0 ? userStreamings[targetSocketIndex][1] : undefined
				let newStreaming: WebSocketInterface | null = null
				if (!targetSocket || targetSocket instanceof MastodonStreaming) continue
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
		if (generation !== streamingGeneration) return
		globalThis.streamings = streamings
		globalThis.userStreamings = userStreamings
		notifyStreamingConnection()
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
	closeMastodonStreams(false)
	const streamingState = globalThis.userStreamings
	for (const streaming of streamingState) {
		const str: StreamingArray[1] = streaming[1]
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
	++streamingGeneration
	const streamingState = globalThis.streamings
	// Home-only accounts and dedicated sockets must also cancel their Nitro retries.
	closeMastodonStreams(true)
	console.log('allClosed')
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
