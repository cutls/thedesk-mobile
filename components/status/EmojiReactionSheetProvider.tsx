import { createContext, type ReactNode, useContext, useState } from 'react'
import EmojiReactionSheet, { type EmojiReactionSheetProps } from './EmojiReactionSheet'

type ReactionTarget = Omit<EmojiReactionSheetProps, 'close'>
const EmojiReactionContext = createContext<((target: ReactionTarget) => void) | null>(null)

export function useEmojiReactionSheet() {
	const open = useContext(EmojiReactionContext)
	if (!open) throw new Error('EmojiReactionSheetProvider is required')
	return open
}

export function EmojiReactionSheetProvider({ children }: { children: ReactNode }) {
	const [target, setTarget] = useState<ReactionTarget | null>(null)
	return (
		<EmojiReactionContext.Provider value={setTarget}>
			{children}
			{target && <EmojiReactionSheet {...target} close={() => setTarget(null)} />}
		</EmojiReactionContext.Provider>
	)
}
