import type { Account } from '@/entities/account'
import type { Timeline as TimelineProps } from '@/entities/timeline'
import { listenTimeline, listenTimelineWaiter, listenUser, listenUserWaiter } from '@/utils/socket'
import { getAcctById } from '@/utils/storage'
import { useConfigStore } from '@/utils/store/config'
import { useFilterStore } from '@/utils/store/filter'
import { appendStatus, deleteStatus, getStatuses, updateStatuses } from '@/utils/timeline'
import type {
	DeleteHomeStatusPayload,
	DeleteTimelineStatusPayload,
	ReceiveHomeStatusPayload,
	ReceiveHomeStatusUpdatePayload,
	ReceiveTimelineStatusPayload,
	ReceiveTimelineStatusUpdatePayload
} from '@/utils/type'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import generator from '@cutls/megalodon'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { useFocusEffect } from 'expo-router'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, AppState, type AppStateStatus, PlatformColor, RefreshControl, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Status } from '../status/Status'
import { Text } from '../themed/Text'
interface IProps {
	timeline: TimelineProps
	columnWidth: number
	lang: string
	relayRef?: React.Ref<FlashListRef<any>>
	composeAction: (client: MegalodonInterface, account: Account, type: 'quote' | 'reply' | 'edit', target: Entity.Status) => void
}
export const Timeline = (props: IProps) => {
	const { timeline, columnWidth, lang, relayRef, composeAction } = props
	const { id, kind: type, listId, tagName, acctId } = timeline
	const targetId = type === 'list' ? listId : type === 'tag' ? tagName : null
	const { t } = useTranslation()
	const theme = useColorScheme()
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [acct, setAcct] = useState<Account | null>(null)
	const { getFilters } = useFilterStore()
	const { config } = useConfigStore()
	const [filters, setFilters] = useState<Entity.Filter[]>([])

	const isDark = theme === 'dark'
	const txtColor = isDark ? 'white' : 'black'
	const [statuses, setStatuses] = useState<Entity.Status[]>([])
	const [unread, setUnread] = useState<Entity.Status[]>([])
	const [isMore, setIsMore] = useState(false)
	const [isInitiated, setIsInitiated] = useState(false)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [maxId, setMaxId] = useState<string | null>(null)
	const isStreaming = false
	const updateStatus = (newStatus: Entity.Status | null, deleteId?: string) => {
		if (newStatus === null) setStatuses((prevStatuses) => prevStatuses.filter((s) => s.id !== deleteId))
		if (newStatus) setStatuses((prevStatuses) => prevStatuses.map((s) => (s.id === newStatus.id ? newStatus : s)))
	}
	const flash = () => (relayRef as React.RefObject<FlashListRef<any> | null>)?.current?.flashScrollIndicators()
	useEffect(() => {
		if (unread.length === 0) return
		if (((relayRef as React.RefObject<FlashListRef<any> | null>)?.current?.getFirstVisibleIndex() || 0) > 10) return
		setStatuses((last) => [...unread, ...last])
		setUnread([])
		flash()
	}, [unread])
	const load = async (refresh: boolean, reconnect: boolean) => {
		try {
			if (refresh) {
				const getClient = async () => {
					const acctData = await getAcctById(acctId)
					setAcct(acctData)
					if (!acctData) throw new Error('Account not found')
					const https = `https://${acctData.domain}`
					const c = generator(acctData.sns, https, acctData.accessToken)
					setClient(c)
					return c
				}
				const useClient = client || (await getClient())
				setIsRefreshing(true)
				const option = {}
				const res = await getStatuses(useClient, type, option, targetId)
				setMaxId(res.maxId)
				setFilters(getFilters(acctId, type))
				setStatuses(res.data)
			}
			if (reconnect) {
				console.log('reconnector')
				if (type === 'home') {
					const fn = async () => {
						await listenUserWaiter(acctId)
						listenUser<ReceiveHomeStatusPayload>(
							'receive-home-status',
							(ev) => {
								if (ev.payload.acctId !== acctId) return
								setUnread((last) => appendStatus(last, ev.payload.status))
							},
							config.timeline,
							false //TTS
						)

						listenUser<ReceiveHomeStatusUpdatePayload>(
							'receive-home-status-update',
							(ev) => {
								if (ev.payload.acctId !== acctId) return
								setStatuses((last) => updateStatuses(last, ev.payload.status))
							},
							config.timeline,
							false //TTS
						)

						listenUser<DeleteHomeStatusPayload>(
							'delete-home-status',
							(ev) => {
								if (ev.payload.acctId !== acctId) return
								setStatuses((last) => deleteStatus(last, ev.payload.statusId))
							},
							config.timeline,
							false //TTS
						)
					}
					fn()
				} else {
					const fn = async () => {
						await listenTimelineWaiter(timeline.id)
						listenTimeline<ReceiveTimelineStatusPayload>(
							'receive-timeline-status',
							(ev) => {
								if (ev.payload.tlId !== timeline.id) return
								setUnread((last) => appendStatus(last, ev.payload.status))
							},
							config.timeline,
							false //TTS
						)

						listenTimeline<ReceiveTimelineStatusUpdatePayload>(
							'receive-timeline-status-update',
							(ev) => {
								if (ev.payload.tlId !== timeline.id) return
								setStatuses((last) => updateStatuses(last, ev.payload.status))
							},
							config.timeline,
							false //TTS
						)

						listenTimeline<DeleteTimelineStatusPayload>(
							'delete-timeline-status',
							(ev) => {
								if (ev.payload.tlId !== timeline.id) return
								setStatuses((last) => deleteStatus(last, ev.payload.statusId))
							},
							config.timeline,
							false //TTS
						)
					}
					fn()
				}
			}
		} catch (e) {
			console.log(e)
		} finally {
			setIsInitiated(true)
			setIsRefreshing(false)
		}
	}
	useEffect(() => {
		const _handleAppStateChange = async (nextAppState: AppStateStatus) => {
			if (nextAppState === 'active') load(false, true)
		}
		const e = AppState.addEventListener('change', _handleAppStateChange)
		return () => e.remove()
	}, [])
	useFocusEffect(
		useCallback(() => {
			load(false, true)
			return () => {}
		}, [])
	)
	useEffect(() => {
		load(true, false)
	}, [])
	const more = async () => {
		setIsMore(true)
		try {
			if (!client) return
			const res = await getStatuses(client, type, { max_id: maxId }, targetId)
			setStatuses((p) => [...p, ...res.data])
			setMaxId(res.maxId)
		} catch (e) {
			console.log(e)
		} finally {
			setIsMore(false)
		}
	}
	if (!client || !acct) return null
	return (
		<FlashList
			data={statuses}
			keyExtractor={(item) => item.id}
			ref={relayRef}
			refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true, false)} />}
			ItemSeparatorComponent={() => <View style={{ borderWidth: 0.5, borderColor: PlatformColor('separator'), marginLeft: 5, width: columnWidth - 10 }}></View>}
			renderItem={({ item: status }) => (
				<Status
					status={status}
					client={client}
					acct={acct}
					columnWidth={columnWidth}
					updateStatus={updateStatus}
					composeAction={composeAction}
					config={config.timeline}
					lang={lang === 'ja' ? 'ja' : 'en'}
					filters={filters}
				/>
			)}
			ListEmptyComponent={() => <View style={{ alignItems: 'center', marginTop: 100 }}>{!isInitiated ? <ActivityIndicator /> : <Text>{t('empty')}</Text>}</View>}
			onEndReached={() => {
				if (isMore) return
				if (statuses.length >= 20) more()
			}}
			maintainVisibleContentPosition={{
				autoscrollToTopThreshold: 0,
				animateAutoScrollToBottom: false
			}}
			onEndReachedThreshold={0}
			ListFooterComponent={() => (
				<View style={{ width: columnWidth, justifyContent: 'center', alignItems: 'center', padding: 20, display: statuses.length === 0 ? 'none' : 'flex' }}>
					{isMore ? (
						<ActivityIndicator />
					) : (
						<TouchableOpacity activeOpacity={0.7} onPress={() => more()} style={{ padding: 10, borderRadius: 5, borderWidth: 1, borderColor: PlatformColor('separator'), marginBottom: 100 }}>
							<Text>{t('timeline.more')}</Text>
						</TouchableOpacity>
					)}
				</View>
			)}
		/>
	)
}
