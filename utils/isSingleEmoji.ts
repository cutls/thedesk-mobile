import emojiReg from './emojiReg'

// Remove the global flag so repeated validation does not depend on lastIndex.
const singleEmoji = new RegExp(`^(?:${emojiReg.source})$`, emojiReg.flags.replace('g', ''))

export function isSingleEmoji(value: string): boolean {
	// The parser also matches standalone variation selectors, which are not reactions.
	if (!value || value === '\uFE0F') return false
	return singleEmoji.exec(value)?.[0] === value
}
