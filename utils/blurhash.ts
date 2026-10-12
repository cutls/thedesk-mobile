const BASE83 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'

const decodeBase83 = (value: string): number => {
	let decoded = 0
	for (const character of value) {
		const digit = BASE83.indexOf(character)
		if (digit === -1) throw new Error('Invalid BlurHash character')
		decoded = decoded * 83 + digit
	}
	return decoded
}

const toLinear = (channel: number): number => {
	const srgb = channel / 255
	return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

/**
 * Returns true for white text and false for black text, choosing the higher
 * contrast against the BlurHash's average color. Local image contrast may vary.
 * Throws an Error for an invalid BlurHash.
 */
export const shouldUseWhiteText = (blurhash: string): boolean => {
	if (blurhash.length < 6) throw new Error('Invalid BlurHash length')

	const size = decodeBase83(blurhash[0])
	const componentsX = (size % 9) + 1
	const componentsY = Math.floor(size / 9) + 1
	if (size > 80 || blurhash.length !== 4 + 2 * componentsX * componentsY) {
		throw new Error('Invalid BlurHash size or length')
	}

	decodeBase83(blurhash[1])
	const color = decodeBase83(blurhash.slice(2, 6))
	if (color > 0xffffff) throw new Error('Invalid BlurHash average color')
	for (let offset = 6; offset < blurhash.length; offset += 2) {
		if (decodeBase83(blurhash.slice(offset, offset + 2)) >= 19 ** 3) {
			throw new Error('Invalid BlurHash AC component')
		}
	}

	const red = toLinear((color >> 16) & 255)
	const green = toLinear((color >> 8) & 255)
	const blue = toLinear(color & 255)
	const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
	const whiteContrast = 1.05 / (luminance + 0.05)
	const blackContrast = (luminance + 0.05) / 0.05
	return whiteContrast > blackContrast
}
