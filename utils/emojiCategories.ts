import type { Entity } from '@cutls/megalodon'

export type EmojiCategoryItem = { type: 'header'; key: string; category: string | null } | { type: 'row'; key: string; emojis: Entity.Emoji[] }

export function buildEmojiCategoryItems(emojis: Entity.Emoji[], columns: number): EmojiCategoryItem[] {
	const categories = new Map<string | null, Entity.Emoji[]>()
	for (const emoji of emojis) {
		const category = emoji.category?.trim() || null
		const group = categories.get(category) ?? []
		group.push(emoji)
		categories.set(category, group)
	}
	const items: EmojiCategoryItem[] = []
	for (const [category, group] of categories) {
		items.push({ type: 'header', key: JSON.stringify([category, 'header']), category })
		for (let index = 0; index < group.length; index += columns) {
			items.push({ type: 'row', key: JSON.stringify([category, index]), emojis: group.slice(index, index + columns) })
		}
	}
	return items
}
