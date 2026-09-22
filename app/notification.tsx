import Avatar from '@/components/Avatar'
import { Notification } from '@/components/status/Notification'
import { Text } from '@/components/themed/Text'
import AcctSelector from '@/components/timeline/AcctSelector'
import { CustomButton, IconButton } from '@/components/ui/Button'
import type { Account } from '@/entities/account'
import type { Timeline } from '@/entities/timeline'
import { useWindowSize } from '@/hooks/useWindowSize'
import { getAcctById, getTimelines, saveTimelines } from '@/utils/storage'
import { useFilterStore } from '@/utils/store/filter'
import { getAllMentions, getSourceText } from '@/utils/timeline'
import { makeTimelineNameWithAcctId } from '@/utils/timelineName'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { FlashList } from '@shopify/flash-list'
import { randomUUID } from 'expo-crypto'
import * as Localization from 'expo-localization'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, AppState, PlatformColor, RefreshControl, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'

export default function NotificationsPage() {
	const { t } = useTranslation()
	const router = useRouter()
	const { acctId } = useLocalSearchParams<{ acctId: string }>()
	const { width, deviceWidth } = useWindowSize()
	const columnWidth = width - 20
	const isDark = useColorScheme() === 'dark'
	const [acct, setAcct] = useState<Account | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isOpened, setIsOpened] = useState(false)

	useEffect(() => {
		let cancelled = false
		setAcct(null)
		setIsLoading(true)
		const loadAccount = async () => {
			try {
				const account = await getAcctById(acctId)
				if (!cancelled) setAcct(account || null)
			} catch (e) {
				console.log(e)
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}
		loadAccount()
		return () => {
			cancelled = true
		}
	}, [acctId])

	const addPin = async () => {
		if (!acct) return
		const timelines = await getTimelines()
		if (timelines.some((timeline) => timeline.kind === 'notifications' && timeline.acctId === acct.id)) return
		const timeline: Timeline = {
			id: randomUUID(),
			name: await makeTimelineNameWithAcctId('notifications', t('timeline.kind.notifications'), acct.id),
			kind: 'notifications',
			acctId: acct.id
		}
		await saveTimelines([...timelines, timeline])
		router.navigate('/')
	}

	return (
		<View style={{ flex: 1, paddingHorizontal: (deviceWidth - width) / 2 + 10, paddingTop: 10 }}>
			<View style={styles.horizontal}>
				<CustomButton onPress={() => setIsOpened(true)} style={{ flex: 1, margin: 5, padding: 5 }}>
					<View style={styles.acctContainer}>
						{acct && <Avatar src={acct.avatar || acct.favicon} fallback={acct.sns} size={20} />}
						<Text style={styles.username} numberOfLines={1}>
							{acct ? `${acct.username}@${acct.domain}` : t('screen.acct')}
						</Text>
					</View>
				</CustomButton>
				{acct && <IconButton systemImage="pin" onPress={addPin} style={{ width: 40, height: 40, marginLeft: 5 }} width={45} isDark={isDark} />}
			</View>
			{isLoading ? (
				<View style={styles.empty}>
					<ActivityIndicator />
				</View>
			) : acct ? (
				<NotificationList key={acct.id} acct={acct} columnWidth={columnWidth} />
			) : (
				<View style={styles.empty}>
					<Text>{t('empty')}</Text>
				</View>
			)}
			<AcctSelector change={setAcct} isOpened={isOpened} setIsOpened={setIsOpened} />
		</View>
	)
}

function NotificationList({ acct, columnWidth }: { acct: Account; columnWidth: number }) {
	const { t } = useTranslation()
	const router = useRouter()
	const client = useMemo(() => generator(acct.sns, `https://${acct.domain}`, acct.accessToken), [acct.sns, acct.domain, acct.accessToken])
	const accountFilters = useFilterStore((state) => state.filters[acct.id])
	const filters = useMemo(() => accountFilters?.filter((filter) => filter.context.includes('notifications')) || [], [accountFilters])
	const lang = Localization.getLocales()[0]?.languageCode === 'ja' ? 'ja' : 'en'
	const [notifications, setNotifications] = useState<Entity.Notification[]>([])
	const [maxId, setMaxId] = useState<string | null>(null)
	const [isInitiated, setIsInitiated] = useState(false)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [isMore, setIsMore] = useState(false)
	const refreshing = useRef(false)
	const loadingMore = useRef(false)
	const requestId = useRef(0)

	const load = useCallback(async () => {
		if (refreshing.current) return
		refreshing.current = true
		loadingMore.current = false
		const request = ++requestId.current
		setIsRefreshing(true)
		setIsMore(false)
		try {
			const { data } = await client.getNotifications()
			if (request !== requestId.current) return
			setNotifications(data)
			setMaxId(data[data.length - 1]?.id || null)
		} catch (e) {
			console.log(e)
		} finally {
			if (request === requestId.current) {
				refreshing.current = false
				setIsRefreshing(false)
				setIsInitiated(true)
			}
		}
	}, [client])

	useFocusEffect(
		useCallback(() => {
			load()
			const subscription = AppState.addEventListener('change', (state) => {
				if (state === 'active') load()
			})
			return () => {
				subscription.remove()
				// Ignore requests from a previous focus or account, including pending pages.
				requestId.current++
				refreshing.current = false
				loadingMore.current = false
			}
		}, [load])
	)

	const more = async () => {
		if (!maxId || refreshing.current || loadingMore.current) return
		loadingMore.current = true
		setIsMore(true)
		const request = requestId.current
		try {
			// Notification IDs are the pagination cursor, including notifications without a status.
			const { data } = await client.getNotifications({ max_id: maxId })
			if (request !== requestId.current) return
			setNotifications((previous) => {
				const ids = new Set(previous.map((notification) => notification.id))
				return [
					...previous,
					...data.filter((notification) => {
						if (ids.has(notification.id)) return false
						ids.add(notification.id)
						return true
					})
				]
			})
			const nextMaxId = data[data.length - 1]?.id || null
			setMaxId(nextMaxId === maxId ? null : nextMaxId)
		} catch (e) {
			console.log(e)
		} finally {
			if (request === requestId.current) {
				loadingMore.current = false
				setIsMore(false)
			}
		}
	}

	const updateStatus = (newStatus: Entity.Status | null, deleteId?: string) => {
		if (!newStatus && !deleteId) return
		setNotifications((previous) =>
			newStatus
				? previous.map((notification) => (notification.status?.id === newStatus.id ? { ...notification, status: newStatus } : notification))
				: previous.filter((notification) => notification.status?.id !== deleteId)
		)
	}
	const composeAction = async (client: MegalodonInterface, account: Account, type: 'quote' | 'reply' | 'edit', target: Entity.Status) => {
		const isMe = target.account.acct !== account.username ? `@${target.account.acct} ` : ''
		if (type === 'reply') router.push(`/post?acctId=${account.id}&targetId=${target.id}&statusId=${target.id}&mode=reply&addText=${encodeURIComponent(`${isMe}${getAllMentions(target)}`)}`)
		if (type === 'quote') router.push(`/post?acctId=${account.id}&targetId=${target.id}&statusId=${target.id}&mode=quote`)
		if (type === 'edit') router.push(`/post?acctId=${account.id}&targetId=${target.id}&statusId=${target.id}&mode=edit&addText=${encodeURIComponent(await getSourceText(target, client))}`)
	}

	return (
		<FlashList
			data={notifications}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => (
				<Notification status={item} client={client} acct={acct} columnWidth={columnWidth} lang={lang} config={{}} filters={filters} updateStatus={updateStatus} composeAction={composeAction} />
			)}
			refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={load} />}
			ItemSeparatorComponent={() => <View style={{ borderWidth: 0.5, borderColor: PlatformColor('separator'), marginHorizontal: 5 }} />}
			onEndReached={() => {
				if (notifications.length >= 20) more()
			}}
			maintainVisibleContentPosition={{ autoscrollToTopThreshold: 0, animateAutoScrollToBottom: false }}
			ListEmptyComponent={<View style={styles.empty}>{!isInitiated ? <ActivityIndicator /> : <Text>{t('empty')}</Text>}</View>}
			ListFooterComponent={
				notifications.length > 0 && maxId ? (
					<View style={{ alignItems: 'center', padding: 20 }}>
						{isMore ? (
							<ActivityIndicator />
						) : (
							<TouchableOpacity activeOpacity={0.7} disabled={isRefreshing} onPress={more} style={styles.more}>
								<Text>{t('timeline.more')}</Text>
							</TouchableOpacity>
						)}
					</View>
				) : null
			}
			contentContainerStyle={{ paddingBottom: 60 }}
		/>
	)
}

const styles = StyleSheet.create({
	horizontal: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
	acctContainer: { flexDirection: 'row', alignItems: 'center', height: 30 },
	username: { flexShrink: 1, fontSize: 16, marginLeft: 10, color: PlatformColor('label') },
	empty: { alignItems: 'center', marginTop: 100 },
	more: { padding: 10, borderRadius: 5, borderWidth: 1, borderColor: PlatformColor('separator') }
})
