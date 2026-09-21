

type LocaleType = 'ja' | 'en'
type FormBoolean = 'yes' | 'no'
export type Settings = {
	appearance: {
		fontSize: number
		language: LocaleType
		colorTheme: ThemeType
		font: string
	}
	timeline: {
		time: 'relative' | 'absolute' | '12h'
		animation: FormBoolean
		maxLength: number
		maxImageHeight: number
		cropImage: 'cover' | 'contain'
		widthInTablet: number
	}
	compose: {
		display: 'sheet' | 'screen'
		floating: FormBoolean
		btnPosition: 'left' | 'right'
		afterPost: 'close' | 'stay'
		secondaryToot: 'no' | 'public' | 'unlisted' | 'private' | 'direct'
	},
	nowPlaying: {
		attachArtwork: FormBoolean
		template: string
	}
}

export type ThemeType = 'dark' | 'light' | 'high-contrast'

export const defaultSetting: Settings = {
	appearance: {
		fontSize: 14,
		language: 'en',
		colorTheme: 'dark',
		font: 'sans-serif'
	},
	timeline: {
		time: 'relative',
		animation: 'yes',
		maxImageHeight: 100,
		maxLength: 500,
		cropImage: 'cover',
		widthInTablet: 350
	},
	compose: {
		display: 'sheet',
		floating: 'yes',
		btnPosition: 'right',
		afterPost: 'close',
		secondaryToot: 'no'
	},
	nowPlaying: {
		attachArtwork: 'yes',
		template: '#NowPlaying {song} / {album} / {artist}\n{url} #{Source}WithTheDesk'
	}
}
