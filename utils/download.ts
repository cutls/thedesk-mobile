import { randomUUID } from 'expo-crypto'
import { Directory, File, Paths } from 'expo-file-system'
import { Asset, requestPermissionsAsync } from 'expo-media-library'

export const downloadImage = async (url: string): Promise<Asset> => {
	if (new URL(url).protocol !== 'https:') {
		throw new Error('Image URL must use HTTPS.')
	}

	const { granted } = await requestPermissionsAsync(true)
	if (!granted) {
		throw new Error('Permission to save images to the photo library was denied.')
	}

	const directory = new Directory(Paths.cache, `image-download-${randomUUID()}`)
	directory.create()
	try {
		// Let the response headers or URL determine the image filename and extension.
		const file = await File.downloadFileAsync(url, directory)
		return await Asset.create(file.uri)
	} finally {
		try {
			if (directory.exists) directory.delete()
		} catch (error) {
			// A cleanup failure must not hide a save error or report a saved image as failed.
			console.warn('Failed to remove the temporary image download:', error)
		}
	}
}
