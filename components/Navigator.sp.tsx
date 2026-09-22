import type { Account } from '@/entities/account'
import { defaultSetting } from '@/entities/settings'
import { useWindowSize } from '@/hooks/useWindowSize'
import { allClose, listenUser, start } from '@/utils/socket'
import { getTimelineAccount, listAccts } from '@/utils/storage'
import { useConfigStore } from '@/utils/store/config'
import { useTimelineStore } from '@/utils/store/timelines'
import { capitalizeFirst } from '@/utils/string'
import { icon } from '@/utils/timelineName'
import type { IState, ReceiveNotificationPayload } from '@/utils/type'
import type { FlashListRef } from '@shopify/flash-list'
import { GlassView } from 'expo-glass-effect'
import { useFocusEffect, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useCallback, useEffect, useState, type RefObject } from 'react'
import { PlatformColor, Pressable, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Text } from './themed/Text'
import TimelineConfig from './TimelineConfig'
import { IconButton } from './ui/Button'

interface Props {
	openComposer: () => void
	openAddTimeline: () => void
	context: {
		current: number
		setCurrent: IState<number>
		relayRef: RefObject<FlashListRef<any> | null>
	}
}

export default function Navigator({ openComposer, openAddTimeline, context }: Props) {
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	const colorScheme = useColorScheme()
	const [allAcctData, setAllAcctData] = useState<Account[]>([])
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const { timelines } = useTimelineStore()
	const [isTimelineConfigOpened, setIsTimelineConfigOpened] = useState(false)
	const [badge, setBadge] = useState<Record<string, ReceiveNotificationPayload['notification'] | null>>({})
	const currentTimeline = timelines[context.current]
	const router = useRouter()
	const composerDisplay = useConfigStore((state) => state.config.compose?.display ?? defaultSetting.compose.display)
	const compose = () => {
		if (composerDisplay === 'screen') router.push({ pathname: '/post', params: { acctId: currentTimeline?.acctId || '' } })
		else openComposer()
	}
	const load = async () => {
		const accounts = await listAccts()
		setAllAcctData(accounts)
		const tlAcct = await getTimelineAccount()
		await start(tlAcct, true)
		listenUser<ReceiveNotificationPayload>(
			'receive-notification',
			async (ev) => {
				const acctId = ev.payload.acctId
				const notification = ev.payload.notification
				setBadge((prev) => ({ ...prev, [acctId]: notification }))
			},
			defaultSetting.timeline,
			false
		)
	}
	useFocusEffect(
		useCallback(() => {
			load()
			return () => {
				allClose()
			}
		}, [])
	)
	useEffect(() => {
		allClose()
		load()
	}, [timelines])
	useEffect(() => {
		if (currentTimeline && currentTimeline.kind !== 'notifications') return
		setBadge((prev) => ({ ...prev, [currentTimeline?.acctId || '']: null }))
	}, [currentTimeline])
	const colorToSystem = (color: string | null | undefined) => (color ? PlatformColor(`system${capitalizeFirst(color)}`) : undefined)
	const getColor = (acctId: string) => colorToSystem(allAcctData.find((a) => a.id === acctId)?.color) || 'transparent'
	return (
		<>
		<GlassView style={styles.containerStyle}>
			<View style={{ width: width - 100, height: '100%', paddingLeft: 8 }}>
				<View style={styles.infoBar}>
					<View style={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
						<TouchableOpacity style={styles.glass20} onPress={() => router.push('/config')}>
							<SymbolView name="gearshape" type="monochrome" tintColor={textColor} size={20} />
						</TouchableOpacity>
						<TouchableOpacity onPress={() => setIsTimelineConfigOpened(true)} style={{ width: width - 175, alignItems: 'center', justifyContent: 'center' }}>
							<Text style={{ textAlign: 'center' }}>{currentTimeline?.name || 'No data'}</Text>
							<View style={{ position: 'absolute', top: 5, right: 10, width: 5, height: 5, borderRadius: 5, backgroundColor: badge[currentTimeline?.acctId || ''] ? 'red' : 'transparent' }} />
						</TouchableOpacity>
						<TouchableOpacity style={styles.glass20} onPress={() => context.relayRef.current?.scrollToOffset({ offset: 0, animated: true })}>
							<SymbolView name="arrow.up.to.line" type="monochrome" tintColor={textColor} size={20} />
						</TouchableOpacity>
					</View>
					<View style={styles.border} />
				</View>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Pressable onPress={() => router.push(`/search?acctId=${currentTimeline?.acctId || ''}`)}>
						<GlassView style={styles.glassAdd} isInteractive={true}>
							<SymbolView name="magnifyingglass" type="monochrome" tintColor={textColor} size={18} />
						</GlassView>
					</Pressable>
					<ScrollView style={styles.scrollBar} horizontal={true}>
						{timelines.map((tl, index) => (
							<Pressable key={tl.id} onPress={() => context.setCurrent(index)}>
								<GlassView style={[styles.glass30]} tintColor={context.current === index ? tl.color || 'teal' : undefined} isInteractive={true}>
									<SymbolView name={icon(tl.kind)} type="monochrome" tintColor={context.current === index ? 'white' : textColor} size={25} />
									{tl.kind === 'notifications' && (
										<View style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: badge[tl?.acctId || ''] ? 'red' : 'transparent' }} />
									)}
									<View style={{ position: 'absolute', top: 35, left: 10, width: 25, height: 5, borderRadius: 2, padding: 1, backgroundColor: getColor(tl.acctId) }} />
								</GlassView>
							</Pressable>
						))}
						<Pressable onPress={() => openAddTimeline()}>
							<GlassView style={styles.glassAdd} isInteractive={true}>
								<SymbolView name="plus" type="monochrome" tintColor={textColor} size={20} />
							</GlassView>
						</Pressable>
					</ScrollView>
				</View>
			</View>
			<IconButton onPress={compose} style={{ width: 60, height: 60, margin: 5, marginTop: 20 }} isPrimary={true} color="teal" systemImage="square.and.pencil" width={60} isDark={isDark} />
			
		</GlassView>
		{currentTimeline && (
			<TimelineConfig
				notification={badge[currentTimeline.acctId]}
				onMarkAsRead={() => setBadge((prev) => ({ ...prev, [currentTimeline.acctId]: null }))}
				isOpened={isTimelineConfigOpened}
				setIsOpened={setIsTimelineConfigOpened}
				timeline={currentTimeline}
			/>
		)}
		</>
	)
}
const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		containerStyle: {
			position: 'absolute',
			bottom: 25,
			left: 10,
			height: 100,
			width: width - 20,
			borderRadius: 30,
			padding: 5,
			display: 'flex',
			flexDirection: 'row'
		},
		infoBar: {
			width: '100%',
			height: 40,
			padding: 5
		},
		border: {
			width: '100%',
			height: 1,
			marginTop: 3,
			borderBottomColor: PlatformColor('separator'),
			borderBottomWidth: 1
		},
		scrollBar: {
			paddingHorizontal: 5,
			paddingTop: 5,
			display: 'flex',
			flexDirection: 'row',
			width: '100%'
		},
		glass20: {
			width: 30,
			height: 30,
			borderRadius: 5,
			alignItems: 'center',
			justifyContent: 'center'
		},
		glass30: {
			width: 45,
			height: 45,
			borderRadius: 5,
			alignItems: 'center',
			justifyContent: 'center',
			marginHorizontal: 2
		},
		glassAdd: {
			width: 45,
			height: 45,
			borderRadius: 22,
			alignItems: 'center',
			justifyContent: 'center',
			marginHorizontal: 0
		}
	})
