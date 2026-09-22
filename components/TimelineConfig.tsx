import type { Account } from '@/entities/account'
import { colorList, type Color, type Timeline } from '@/entities/timeline'
import { useWindowSize } from '@/hooks/useWindowSize'
import { getTimelines, saveTimelines } from '@/utils/storage'
import { useTimelineStore } from '@/utils/store/timelines'
import { icon, makeTimelineNameWithAcctId } from '@/utils/timelineName'
import type { IState, ReceiveNotificationPayload } from '@/utils/type'
import type { MegalodonInterface } from '@cutls/megalodon'
import RNBottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { load } from 'cheerio/slim'
import { GlassView } from 'expo-glass-effect'
import { useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlatformColor, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Text } from './themed/Text'
import { TextInputMulti } from './themed/TextInputMulti'
import { IconButton } from './ui/Button'

interface Props {
	isOpened: boolean
	setIsOpened: IState<boolean>
	timeline: Timeline
	notification?: ReceiveNotificationPayload['notification'] | null
	onMarkAsRead?: () => void
}
const GlassViewCustom = (props: React.ComponentProps<typeof GlassView>) => <GlassView {...props} style={[props.style, { borderRadius: 20 }]} />
export default function TimelineConfig({ isOpened, setIsOpened, timeline, notification, onMarkAsRead }: Props) {
	const { t } = useTranslation()
	const router = useRouter()
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	const [useAcct, setUseAcct] = useState<Account | null>(null)
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const { setTimelines } = useTimelineStore()
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [defaultName, setDefaultName] = useState(timeline.name)
	const bottomSheetRef = useRef<RNBottomSheet>(null)
	const keyboardRef = useRef(null)
	useEffect(() => {
		const fn = async () => {
			const name = await makeTimelineNameWithAcctId(timeline.kind, t(`timeline.kind.${timeline.kind}`), timeline.acctId)
			setDefaultName(name)
		}
		fn()
	}, [])
	const colorToSystemColor = (color: string) => `system${color.charAt(0).toUpperCase() + color.slice(1)}`
	const createColorBtn = (color: string) =>
		({
			width: 30,
			height: 40,
			borderRadius: 8,
			backgroundColor: PlatformColor(color),
			alignItems: 'center',
			justifyContent: 'center'
		}) as const
	const updateColor = async (tlId: string, color: Color | null) => {
		const tls = await getTimelines()
		const updatedTls = tls.map((t) => (t.id === tlId ? { ...t, color: color || undefined } : t))
		await saveTimelines(updatedTls)
		setTimelines(updatedTls)
	}
	const openNotifications = () => {
		setIsOpened(false)
		router.push({ pathname: '/notifications', params: { acctId: timeline.acctId } })
	}
	// useEffect(() => {
	// 	(keyboardRef.current as any)?.focus()
	// }, [isOpened])
	if (!isOpened) return
	const notificationPreview = notification?.status
		? (notification.status.spoiler_text || load(notification.status.content.replace(/<br\s*\/?\s*>|<\/p>/gi, ' ')).text()).replace(/\s+/g, ' ').trim()
		: ''
	return (
		<RNBottomSheet
			handleComponent={null}
			keyboardBlurBehavior="none"
			detached={true}
			ref={bottomSheetRef}
			onChange={(e) => setIsOpened(e !== -1)}
			style={{ zIndex: 5 }}
			backgroundComponent={GlassViewCustom}
			enableBlurKeyboardOnGesture={true}
			enablePanDownToClose={true}
			enableDynamicSizing={true}
			backdropComponent={(props) => <BottomSheetBackdrop {...props} opacity={0.5} onPress={() => bottomSheetRef.current?.close()} disappearsOnIndex={-1} />}
		>
			<BottomSheetView style={styles.contentContainer}>
				<View style={{ padding: 20 }}>
					<View style={styles.notification}>
						{notification ? (
							<View style={styles.notificationContent}>
								<Text numberOfLines={1} ellipsizeMode="tail" style={styles.notificationTitle}>
									{t(`timeline.notification.${notification.type}.title`, { defaultValue: t('timeline.kind.notifications') })}
									{notification.account && ` · ${notification.account.display_name || notification.account.acct}`}
								</Text>
								{!!notificationPreview && (
									<Text numberOfLines={1} ellipsizeMode="tail" style={styles.notificationPreview}>
										{notificationPreview}
									</Text>
								)}
							</View>
						) : (
							<View style={styles.notificationContent}>
								<Text numberOfLines={1} ellipsizeMode="tail" style={styles.notificationPreview}>
									{t('timeline.notification.noNewNotifications')}
								</Text>
							</View>
						)}
						{notification && onMarkAsRead && (
							<TouchableOpacity
								accessibilityRole="button"
								accessibilityLabel={t('timeline.notification.markAsRead')}
								onPress={onMarkAsRead}
							activeOpacity={0.7}
								style={[styles.notificationAction]}
							>
								<SymbolView name="checkmark.circle" type="monochrome" tintColor={textColor} size={22} />
							</TouchableOpacity>
						)}
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel={t('timeline.kind.notifications')}
							onPress={openNotifications}
							activeOpacity={0.7}
							style={[styles.notificationAction, styles.notificationRoute, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.18)' : 'rgba(0, 122, 255, 0.10)', width: notification ? 44 : 180 }]}
						>
							<SymbolView name="bell.fill" type="monochrome" tintColor={PlatformColor('systemBlue')} size={22} />
							{!notification && <Text style={{ marginHorizontal: 10, color: PlatformColor('systemBlue') }}>{t('timeline.notification.showNotifications')}</Text>}
						</TouchableOpacity>
					</View>
					<Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{t('navigation.config.color')}</Text>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, flexShrink: 1, alignItems: 'center' }}>
						{/* { backgroundColor: PlatformColor(colorToSystemColor(timeline.color || 'teal')) } */}
						<GlassView style={[styles.glass30]} tintColor={timeline.color || 'teal'}>
							<SymbolView name={icon(timeline.kind)} type="monochrome" tintColor="white" size={25} />
						</GlassView>
						{colorList.map((color) => (
							<IconButton
								key={color}
								style={createColorBtn(colorToSystemColor(color))}
								onPress={() => updateColor(timeline.id, color)}
								systemImage={color === timeline.color ? 'checkmark' : undefined}
								color="white"
								width={30}
								isDark={isDark}
							>
							</IconButton>
						))}
						{timeline.color && <IconButton width={30} isDark={isDark} style={createColorBtn(`systemGray4`)} onPress={() => updateColor(timeline.id, null)} systemImage="xmark" color="white" />}
					</View>
					<View style={{ height: 10 }} />
					<Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{t('navigation.config.name')}</Text>
					<TextInputMulti
						defaultValue={timeline.name}
						ref={keyboardRef}
						onBlur={async (input) => {
							const tls = await getTimelines()
							const name = input || defaultName
							const updatedTls = tls.map((tl) => (tl.id === timeline.id ? { ...tl, name: name } : tl))
							await saveTimelines(updatedTls)
							setTimelines(updatedTls)
						}}
						placeholder={defaultName}
						isDark={isDark}
					/>
					<View style={{ height: 10 }} />
				</View>
			</BottomSheetView>
		</RNBottomSheet>
	)
}

const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		notification: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			paddingBottom: 12,
			marginBottom: 12,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: PlatformColor('separator')
		},
		notificationContent: {
			flex: 1,
			minWidth: 0,
			gap: 2
		},
		notificationTitle: {
			fontSize: 13,
			fontWeight: '600'
		},
		notificationPreview: {
			fontSize: 13,
			color: PlatformColor('secondaryLabel')
		},
		notificationAction: {
			width: 44,
			height: 44,
			justifyContent: 'center',
			alignItems: 'center'
		},
		notificationRoute: {
			borderRadius: 12,
			flexDirection: 'row',
		},
		glass30: {
			width: 55,
			height: 52,
			borderRadius: 5,
			alignItems: 'center',
			justifyContent: 'center',
			marginHorizontal: 3
		},
		contentContainer: {
			backgroundColor: 'transparent',
			zIndex: 5
		}
	})
