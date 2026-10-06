import type { Entity } from '@cutls/megalodon'
import Storage from 'expo-sqlite/kv-store'
import { useEffect } from 'react'
import { create } from 'zustand'

const limit = 24
const empty: string[] = []
const key = (acctId: string) => `emoji-history-${acctId}`

function readHistory(acctId: string): string[] {
	try {
		const value: unknown = JSON.parse(Storage.getItemSync(key(acctId)) || '[]')
		return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))].slice(0, limit) : []
	} catch (error) {
		console.warn('Unable to load emoji history', error)
		return []
	}
}

const useHistoryStore = create<{
	histories: Record<string, string[]>
	load: (acctId: string) => void
	record: (acctId: string, shortcode: string) => void
}>((set, get) => ({
	histories: {},
	load: (acctId) => set((state) => ({ histories: { ...state.histories, [acctId]: readHistory(acctId) } })),
	record: (acctId, shortcode) => {
		const previous = get().histories[acctId] ?? readHistory(acctId)
		const history = [shortcode, ...previous.filter((item) => item !== shortcode)].slice(0, limit)
		try {
			Storage.setItemSync(key(acctId), JSON.stringify(history))
		} catch (error) {
			console.warn('Unable to save emoji history', error)
		}
		set((state) => ({ histories: { ...state.histories, [acctId]: history } }))
	}
}))

export function useEmojiHistory(acctId: string | null, emojis: Entity.Emoji[]) {
	const history = useHistoryStore((state) => (acctId ? (state.histories[acctId] ?? empty) : empty))
	const load = useHistoryStore((state) => state.load)
	const record = useHistoryStore((state) => state.record)
	useEffect(() => {
		if (acctId) load(acctId)
	}, [acctId, load])
	const byShortcode = new Map(emojis.map((emoji) => [emoji.shortcode, emoji]))
	return {
		recentEmojis: history.flatMap((shortcode) => {
			const emoji = byShortcode.get(shortcode)
			return emoji ? [emoji] : []
		}),
		recordEmoji: (shortcode: string) => {
			if (acctId && shortcode) record(acctId, shortcode)
		}
	}
}
