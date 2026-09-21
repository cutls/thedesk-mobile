import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'

export const uploadCallback = async (callback: (result: Entity.Attachment | Entity.AsyncAttachment) => void, status: (v: number) => void, client: MegalodonInterface | null) => {
	try {
		const granted = await ImagePicker.requestMediaLibraryPermissionsAsync()
		const mediaTypes: Array<'images' | 'videos'> = granted.status === 'granted' ? ['images', 'videos'] : ['images']
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: mediaTypes,
			allowsMultipleSelection: true,
			quality: 1
		})

		if (!result) {
			throw 'No selected image'
		}
		if (result.canceled) return
		if (!result.assets) throw 'No available image'
		const total = result.assets.length
		status(total)
		let uploaded = 0
		for (const asset of result.assets) {
			if (!client) throw 'No client'
			const uri = asset.uri
			console.log('uri', uri)
			const response = await fetch(uri)
			console.log('response', response)
			const blob = await response.blob()
			const result = await client.uploadMedia({
				uri: uri,
				type: blob.type,
				name: asset.fileName
			})
			uploaded += 1
			status(total - uploaded)
			callback(result.data)
		}
	} catch (e: any) {
		if (e.message) Alert.alert('Error', e.message)
		if (!e.message) Alert.alert('Error(e)', e)
		status(0)
	}
}
