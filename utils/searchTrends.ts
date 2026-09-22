import type { Entity } from '@cutls/megalodon'

/** Server history is newest-first, but may be incomplete or unordered. */
export function getTrendActivity(history: Entity.Tag['history']) {
	const days = [...(history ?? [])]
		.filter((day) => Number.isFinite(Number(day.day)) && Number.isFinite(Number(day.uses)) && Number(day.uses) >= 0)
		.sort((a, b) => Number(b.day) - Number(a.day))
		.slice(0, 7)
	const values = days.map((day) => Number(day.uses)).reverse()
	const latest = days[0]
	return {
		values,
		posts: latest ? Number(latest.uses) : null,
		people: latest && Number.isFinite(Number(latest.accounts)) ? Math.max(0, Number(latest.accounts)) : null
	}
}
