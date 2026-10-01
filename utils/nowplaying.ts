import type { Settings } from '@/entities/settings'
import type { MegalodonInterface } from '@cutls/megalodon'
import type { NowPlayingState } from '@edualm/react-native-now-playing'
import axios from 'axios'
import * as ImageManipulator from 'expo-image-manipulator'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { t } from 'i18next'
import { createContext } from 'react'
import { Alert } from 'react-native'
import { confirmDialog } from './alert'
import { clearSpotifyToken, getSpotifyToken, saveSpotifyToken } from './storage'

const apiGateway = 'https://ep9jquu2w4.execute-api.ap-northeast-1.amazonaws.com/thedesk/spotify'
type PlayingSource = NowPlayingState | null

const template = '#NowPlaying {song} / {album} / {artist}\n{url} #{Source}WithTheDesk'
export const nowplaying = async (client: MegalodonInterface, source: 'apple' | 'spotify', playing: PlayingSource, config: Settings['nowPlaying']) => {
	if (source === 'apple') {
		const state = playing
		if (!state || !state.item) return { text: '', image: null }
		const item = state.item
		let result = config.template || template
		result = result.replace('{song}', item.title ?? 'Unknown Title')
		result = result.replace('{album}', item.album ?? 'Unknown Album')
		result = result.replace('{artist}', item.artist ?? 'Unknown Artist')
		result = result.replace('{url}', '')
		result = result.replace('{Source}', 'AppleMusic')
		const b64 = state.item.artwork
		try {
			if (config.attachArtwork !== 'yes') return { text: result, image: null }
			if (!b64) throw new Error('No artwork found')
			const r = await ImageManipulator.manipulateAsync(`data:image/png;base64,${b64}`, [], { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 })
			const image = await client.uploadMedia({
				uri: r.uri,
				type: 'image/jpeg',
				name: 'cover.png'
			})
			return { text: result, image: image.data }
		} catch (e) {
			console.log('nowplaying upload error', e)
			return { text: result, image: null }
		}
	} else if (source === 'spotify') {
		try {
			const tokenData = await getSpotifyToken()
			if (tokenData) {
				const unixTime = Date.now()
				if (parseInt(tokenData.expires, 10) > unixTime / 1000) {
					return await spotify(tokenData.accessToken, client, config)
				} else {
					// refresh token
					const api = await fetch(`${apiGateway}?state=refresh&refreshToken=${tokenData.refreshToken}`, {
						headers: {
							'content-type': 'application/json'
						}
					})
					const json = await api.json()
					const { accessToken, refreshToken, expiresIn } = json
					saveSpotifyToken(accessToken, refreshToken, expiresIn)
					return await spotify(accessToken, client, config)
				}
			} else {
				const accessToken = await spotifyAuth()
				if (accessToken) return await spotify(accessToken, client, config)
			}
		} catch (e: any) {
			Alert.alert('Spotify', `Reason: ${e.message || e.toString()}`)
		}
	}
	return { text: '', image: null }
}
async function spotify(accessToken: string, client: MegalodonInterface, config: Settings['nowPlaying']) {
	const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	})
	if (res.status !== 200) {
		console.log('nowplaying spotify fetch error', res.status)
		if ((res.status >= 400 && res.status < 410) || res.status === 500) {
			const result = await confirmDialog(
				t('config.nowPlaying.spotify.reauthenticateTitle'),
				t('config.nowPlaying.spotify.reauthenticateMessage'),
				[{ text: 'cancel', style: 'cancel' }, { text: 'config.nowPlaying.spotify.authenticate' }],
				(s) => t(s)
			)
			if (result === 1) {
				await clearSpotifyToken()
				await spotifyAuth()
			}
		}
		return { text: '', image: null }
	}
	const json = await res.json()
	if (!json || !json.item) {
		console.log('nowplaying spotify item error')
		return { text: '', image: null }
	}
	const item = json.item
	let result = config.template || template
	const regExp1 = /{song}/g
	result = result.replace(regExp1, item.name)
	const regExp2 = /{album}/g
	result = result.replace(regExp2, item.album.name)
	const regExp3 = /{artist}/g
	result = result.replace(regExp3, item.artists[0].name)
	const regExp4 = /{url}/g
	result = result.replace(regExp4, item.external_urls.spotify)
	result = result.replace('{Source}', 'Spotify')
	const img = item.album.images[0].url
	try {
		if (config.attachArtwork !== 'yes') return { text: result, image: null }
		if (!img) throw new Error('No artwork found')
		const blobr = await axios.get(img, { responseType: 'arraybuffer' })
		const blob = blobr.data
		const b64 = require('buffer').Buffer.from(blob, 'binary').toString('base64')
		const r = await ImageManipulator.manipulateAsync(`data:image/png;base64,${b64}`, [], { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 })
		const image = await client.uploadMedia({
			uri: r.uri,
			type: 'image/jpeg',
			name: 'cover.png'
		})
		return { text: result, image: image.data }
	} catch (e) {
		console.log('nowplaying upload error', e)
		return { text: result, image: null }
	}
}
export async function spotifyAuth(): Promise<string | null> {
	try {
		const a = await WebBrowser.openAuthSessionAsync(`${apiGateway}?state=connectTootdesk`)
		if (a.type === 'success') {
			const { queryParams } = Linking.parse(a.url)
			if (!queryParams) throw new Error('No available code found.')
			const { spotify: spotifyCode } = queryParams
			if (!spotifyCode) throw new Error('No available code found.')
			const api = await fetch(`${apiGateway}?state=auth&code=${spotifyCode?.toString().replace(/\n/g, '')}`, {
				headers: {
					'content-type': 'application/json'
				}
			})
			if (!api.ok) throw new Error(`Authentication failed (${api.status}).`)
			const json = await api.json()
			const { accessToken, refreshToken } = json
			if (!accessToken || !refreshToken) throw new Error('No tokens received.')
			await saveSpotifyToken(accessToken, refreshToken, 3600)
			return accessToken
		} else {
			return null
		}
	} catch (e: any) {
		Alert.alert('Spotify', `Reason: ${e.message || e.toString()}`)
		return null
	}
}

export const NowPlayingContext = createContext({
	playing: null as NowPlayingState | null
})
