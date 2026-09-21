import type { Settings } from '@/entities/settings'
import { downloadImage } from '@/utils/download'
import { Galeria } from '@cutls/galeria'
import type { Entity } from '@cutls/megalodon'
import { Image } from 'expo-image'
import { SymbolView } from 'expo-symbols'
import { openBrowserAsync } from 'expo-web-browser'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlatformColor, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Text } from '../themed/Text'

type IConfig = Settings['timeline']
interface IProps {
	attachments: Entity.Attachment[]
	width: number
	isSensitive: boolean
	config: IConfig
}
export const Attachment = (props: IProps) => {
	const { t } = useTranslation()
	const { attachments, width, isSensitive, config } = props
	const [isOpen, setIsOpen] = useState(!isSensitive)
	const theme = useColorScheme()
	const isDark = theme === 'dark'
	const txtColor = isDark ? 'white' : 'black'
	const fontSize = 16

	const height = config.maxImageHeight
	const getPreviewUrl = (attachment: Entity.Attachment) => {
		if (attachment.type === 'image') {
			return { uri: attachment.preview_url || attachment.url }
		} else if (attachment.type === 'video' || attachment.type === 'gifv') {
			return attachment.preview_url ? { uri: attachment.preview_url } : require('../../assets/images/circle-play-bg.png')
		}
	}
	if (!attachments || attachments.length === 0) return null
	if (!isOpen) {
		return (
			<TouchableOpacity activeOpacity={0.7} onPress={() => setIsOpen(true)} style={{ display: 'flex', flexDirection: 'row', marginVertical: 5, gap: 5 }}>
				{attachments.map((a, index) => (
					<Image key={a.id} source={{ blurhash: a.blurhash || '' }} contentFit={config.cropImage} style={{ height, width: width / attachments.length - 5, ...styles.common }} />
				))}
				<View style={[{ top: height / 2 - 15, right: width / 2 - 60 }, styles.open]}>
					<Text style={{ color: 'white', textAlign: 'center' }}>{t('timeline.status.mediaHidden')}</Text>
				</View>
			</TouchableOpacity>
		)
	}
	const getImageIndex = (id: string) => attachments.filter((a) => a.type === 'image').findIndex((a) => a.id === id)
	const galeriaList = attachments.filter((a) => a.type === 'image').map((a) => a.url)
	return (
		<Galeria
			urls={galeriaList}
			actions={[
				{ icon: 'download', onPress: (index) => downloadImage(galeriaList[index]) },
				{ icon: 'share', onPress: (index) => openBrowserAsync(galeriaList[index]) }
			]}
		>
			<View style={{ display: 'flex', flexDirection: 'row', marginVertical: 5, gap: 5 }}>
				{attachments.map((a, index) => {
					if (a.type !== 'image') {
						return (
							<TouchableOpacity key={a.id} activeOpacity={0.7} onPress={() => openBrowserAsync(a.url)}>
								<Image source={getPreviewUrl(a)} contentFit={config.cropImage} style={{ height, width: width / attachments.length - 5, ...styles.common }} />
								<View style={{ position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 2 }}>
									<SymbolView name="play.circle" type="monochrome" tintColor="white" size={24} />
								</View>
							</TouchableOpacity>
						)
					}
					return (
						<Galeria.Image index={getImageIndex(a.id)} key={a.id}>
							<Image source={getPreviewUrl(a)} contentFit={config.cropImage} style={{ height, width: width / attachments.length - 5, ...styles.common }} />
						</Galeria.Image>
					)
				})}
			</View>
		</Galeria>
	)
}

const styles = StyleSheet.create({
	open: {
		position: 'absolute',
		backgroundColor: 'rgba(0,0,0,0.5)',
		borderRadius: 10,
		padding: 5,
		height: 30,
		width: 120,
		justifyContent: 'center',
		alignItems: 'center'
	},
	common: {
		backgroundColor: PlatformColor('systemGray'),
		borderRadius: 5,
		borderWidth: 1,
		borderColor: PlatformColor('systemGray4')
	}
})
