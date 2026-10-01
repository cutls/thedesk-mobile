import { mockAccount, type Account } from '@/entities/account'
import type { Settings } from '@/entities/settings'
import type { Timeline } from '@/entities/timeline'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import Storage from 'expo-sqlite/kv-store'

export const listAccts = async () => {
	const value = (await Storage.getItem('acct')) || '[]'
	return JSON.parse(value) as Account[]
}
export const saveAccts = async (accts: Account[]) => {
	await Storage.setItem('acct', JSON.stringify(accts))
}
export const updateAcct = async (targetId: string, updatedFields: Partial<Account>) => {
	const accts = await listAccts()
	const updatedAccts = accts.map((a) => (a.id === targetId ? { ...a, ...updatedFields } : a))
	await saveAccts(updatedAccts)
}
export const removeAcct = async (targetId: string) => {
	const accts = await listAccts()
	const updatedAccts = accts.filter((a) => a.id !== targetId)
	await saveAccts(updatedAccts)
}
export const getAcctById = async (id: string): Promise<Account | null> => {
	const accts = await listAccts()
	return accts.find((a) => a.id === id) || null
}

export const getUsualAcct = async (): Promise<Account> => {
	const accts = await listAccts()
	const id = (await Storage.getItem('usualAcct')) || null
	if (!id) return accts[0] || mockAccount
	return accts.find((a) => a.id === id) || mockAccount
}

export const getTimelines = async (): Promise<Timeline[]> => {
	const value = (await Storage.getItem('timelines')) || '[]'
	return JSON.parse(value) as Timeline[]
}
export const saveTimelines = async (timelines: Timeline[]) => {
	await Storage.setItem('timelines', JSON.stringify(timelines))
}
export const removeTimelinesByAcctId = async (acctId: string) => {
	const timelines = await getTimelines()
	const updatedTimelines = timelines.filter((t) => t.acctId !== acctId)
	await saveTimelines(updatedTimelines)
}
export const getTimelineAccount = async (): Promise<Array<[Timeline, Account]>> => {
	const timelines = await getTimelines()
	const accounts = await listAccts()
	const result: Array<[Timeline, Account]> = []
	for (const timeline of timelines) {
		const acct = accounts.find((a) => a.id === timeline.acctId)
		if (acct) result.push([timeline, acct])
	}
	return result
}

export const cachedGetEmojis = async (acctId: string, client: MegalodonInterface) => {
	const acct = await getAcctById(acctId)
	if (!acct) return []
	const value = (await Storage.getItem(`emoji-${acct.domain}`)) || '{"emojis":[],"updated":0}'
	const parsed = JSON.parse(value) as { emojis: Array<Entity.Emoji>; updated: number }
	const unixTime = Date.now()
	if (parsed.updated + 24 * 60 * 60 * 1000 < unixTime) {
		try {
			const res = await client.getInstanceCustomEmojis()
			const toStore = {
				emojis: res.data,
				updated: unixTime
			}
			await Storage.setItem(`emoji-${acct.domain}`, JSON.stringify(toStore))
			return res.data
		} catch (e) {
			return parsed.emojis
		}
	} else {
		return parsed.emojis
	}
}
export const saveSpotifyToken = async (accessToken: string, refreshToken: string, expiresIn: number) => {
	const unixTime = Date.now()
	await Storage.setItem('spotify', JSON.stringify({ accessToken, refreshToken, expires: (unixTime / 1000 + expiresIn).toString() }))
}
export const getSpotifyToken = async (): Promise<{ accessToken: string; refreshToken: string; expires: string } | null> => {
	const value = (await Storage.getItem('spotify')) || null
	if (!value) return null
	return JSON.parse(value) as { accessToken: string; refreshToken: string; expires: string }
}
export const clearSpotifyToken = async () => {
	await Storage.removeItem('spotify')
}

export const allReset = async () => {
	await Storage.clear()
}

export const getSettings = async (): Promise<Settings | null> => {
	const value = await Storage.getItem('settings')
	if (!value) return null
	return JSON.parse(value) as Settings
}

export const saveSettings = async (settings: Settings): Promise<void> => {
	await Storage.setItem('settings', JSON.stringify(settings))
}
