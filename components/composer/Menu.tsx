import { useWindowSize } from '@/hooks/useWindowSize'
import { nowplaying, NowPlayingContext } from '@/utils/nowplaying'
import { useConfigStore } from '@/utils/store/config'
import type { ComposeMode, IState } from '@/utils/type'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import Fontisto from '@expo/vector-icons/Fontisto'
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, PlatformColor, StyleSheet, useColorScheme, View } from 'react-native'
import { Text } from '../themed/Text'
import { Button, CustomButton } from '../ui/Button'

interface Props {
	changeMode: (m: ComposeMode) => void
	client: MegalodonInterface | null
	npSet: { setText: IState<string>; setUploaded: IState<Array<Entity.Attachment | Entity.AsyncAttachment>> }
	inSheet?: boolean
}
export default function Menu({ changeMode, npSet, client, inSheet }: Props) {
	const { t } = useTranslation()
	const { config } = useConfigStore()
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const { playing } = useContext(NowPlayingContext)
	const [isSpotifyLoading, setIsSpotifyLoading] = useState(false)
	const np = async (type: 'apple' | 'spotify') => {
		if (!client) return
		try {
			npSet.setUploaded([])
			if (type === 'spotify') setIsSpotifyLoading(true)
			const data = await nowplaying(client, type, playing, config.nowPlaying)
			if (type === 'spotify') setIsSpotifyLoading(false)
			if (!data || !data.text) throw new Error('No data')
			npSet.setText(data.text)
			if (data.image) npSet.setUploaded((u) => [...u, data.image])
			changeMode('compose')
		} catch (e) {
			if (type === 'spotify') setIsSpotifyLoading(false)
			console.error(e)
			if (type === 'apple') {
				Alert.alert(t('config.nowPlaying.appleMusicFailedTitle'), t('config.nowPlaying.appleMusicFailedMessage'))
			}
		}
	}
	return (
		<View style={{ minHeight: inSheet ? 320 : undefined }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
				<Text style={{ fontWeight: 'bold', fontSize: 18 }}>NowPlaying</Text>
				<CustomButton onPress={() => np('apple')} style={{ marginVertical: 5, width: 100, height: 50 }}>
					<Fontisto name="applemusic" size={24} color={isDark ? 'white' : 'black'} />
				</CustomButton>
				<CustomButton onPress={() => np('spotify')} style={{ marginVertical: 5, width: 100, height: 50 }}>
					{isSpotifyLoading ? <ActivityIndicator /> : <Fontisto name="spotify" size={24} color={isDark ? 'white' : 'black'} />}
				</CustomButton>
			</View>
			<View style={{ height: 5 }} />
			<Button width={width - 40} isDark={isDark} onPress={() => changeMode('poll')} style={{ height: 50 }}>
				{t('composer.menu.poll')}
			</Button>
			<Button width={width - 40} isDark={isDark} onPress={() => changeMode('schedule')} style={{ marginVertical: 10, height: 50 }}>
				{t('composer.menu.schedule')}
			</Button>
			{inSheet && <Button isPrimary={true} width={width - 40} isDark={isDark} onPress={() => changeMode('compose')} style={{ height: 50 }}>
				{t('composer.menu.return')}
			</Button>}
		</View>
	)
}
const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		btn: {
			height: 50,
			marginVertical: 10,
			display: 'flex',
			justifyContent: 'center',
			alignContent: 'center',
			width: width - 40
		}
	})
