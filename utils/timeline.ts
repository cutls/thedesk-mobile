import type { TimelineKind } from '@/entities/timeline'
import type { Entity, MegalodonInterface, Response } from '@cutls/megalodon'
import { parseHeader } from './parseHeader'
interface Statuses {
	data: Array<Entity.Status>
	maxId: string | null
}
export const getStatuses = async (client: MegalodonInterface, type: TimelineKind, options?: Record<string, any>, targetId?: string | null): Promise<Statuses> => {
	try {
		let response: Response<Array<Entity.Status>> | null = null
		if (type === 'home') response = await client.getHomeTimeline(options)
		if (type === 'local') response = await client.getLocalTimeline(options)
		if (type === 'public') response = await client.getPublicTimeline(options)
		if (type === 'bookmarks') response = await client.getBookmarks(options)
		if (type === 'favourites') response = await client.getFavourites(options)
		if (type === 'list' && targetId) response = await client.getListTimeline(targetId, options)
		if (type === 'tag' && targetId) response = await client.getTagTimeline(targetId, options)
		if (!response || !response.data) throw new Error('Invalid timeline type or missing targetId')
		if (type !== 'bookmarks' && type !== 'favourites') {
			const maxId = response.data.length > 0 ? response.data[response.data.length - 1].id : null
			return { data: response.data, maxId }
		} else {
			const link = parseHeader(response.headers.link)
			const maxId = link.next?.urlParams?.max_id
			return { data: response.data, maxId }
		}
	} catch (e) {
		console.log(e)
		return { data: [], maxId: null }
	}
}

export const getNotifications = async (client: MegalodonInterface, options?: Record<string, any>): Promise<Array<Entity.Notification>> => {
	try {
		const response: Response<Array<Entity.Notification>> = await client.getNotifications(options)
		if (!response || !response.data) throw new Error('Invalid timeline type or missing targetId')
		return response.data
	} catch (e) {
		console.log(e)
		return []
	}
}

const TIMELINE_STATUSES_COUNT = 20
export const getConversations = async (client: MegalodonInterface, options?: Record<string, any>): Promise<Array<Entity.Conversation>> => {
	try {
		const response: Response<Array<Entity.Conversation>> = await client.getConversationTimeline(options)
		if (!response || !response.data) throw new Error('Invalid timeline type or missing targetId')
		return response.data
	} catch (e) {
		console.log(e)
		return []
	}
}

export const prependStatus = (statuses: Array<Entity.Status>, status: Entity.Status): Array<Entity.Status> => {
	if (statuses.find((s) => s.id === status.id && s.uri === status.uri)) {
		return statuses
	}
	return [status].concat(statuses)
}

export const appendStatus = (statuses: Array<Entity.Status>, status: Entity.Status): Array<Entity.Status> => {
	if (statuses.find((s) => s.id === status.id && s.uri === status.uri)) {
		return statuses
	}
	return [status].concat(statuses).slice(0, TIMELINE_STATUSES_COUNT)
}

export const deleteStatus = (statuses: Array<Entity.Status>, deletedId: string): Array<Entity.Status> => {
	return statuses.filter((status) => {
		if (status.reblog !== null && status.reblog.id === deletedId) {
			return false
		}
		return status.id !== deletedId
	})
}
export const updateStatuses = (statuses: Array<Entity.Status>, status: Entity.Status): Array<Entity.Status> => {
	const renew = statuses.map((s) => {
		if (s.id === status.id) {
			return status
		}
		if (s.reblog && s.reblog.id === status.id) {
			return Object.assign({}, s, { reblog: status })
		}
		if (status.reblog && s.id === status.reblog.id) {
			return status.reblog
		}
		if (status.reblog && s.reblog && s.reblog.id === status.reblog.id) {
			return Object.assign({}, s, { reblog: status.reblog })
		}
		return s
	})
	return renew
}

export const getAllMentions = (status: Entity.Status): string => {
	const mentions: string[] = []
	status.mentions.forEach((m) => {
		mentions.push(`@${m.acct}`)
	})
	if (status.mentions.length) return `${mentions.join(' ')} `
	return ''
}
export const getSourceText = async (status: Entity.Status, client: MegalodonInterface | null) => {
	if (!client) return ''
	const r = await client.getStatusSource(status.id)
	return r.data.text
}

export const calcFromNow = (time: Date, isJa: boolean) => {
	const sec = (Date.now() - time.getTime()) / 1000
	if (sec < 60) return isJa ? '1分未満' : '< 1 min'
	if (sec < 3600) {
		const m = Math.floor(sec / 60)
		return isJa ? `${m}分前` : `${m} min`
	}
	if (sec < 86400) {
		const h = Math.floor(sec / 3600)
		return isJa ? `${h}時間前` : `${h} h`
	}
	if (sec < 86400 * 30) {
		const d = Math.floor(sec / 86400)
		return isJa ? `${d}日前` : `${d} d`
	}
	if (sec < 86400 * 365) {
		const m = Math.floor(sec / (86400 * 30))
		return isJa ? `${m}ヶ月前` : `${m} mo`
	}
	const y = Math.floor(sec / (86400 * 365))
	return isJa ? `${y}年前` : `${y} y`
}
