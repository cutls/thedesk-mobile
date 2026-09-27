import type { Account } from '@/entities/account'
import type { Timeline as TimelineProps } from '@/entities/timeline'
import { listenTimeline, listenTimelineWaiter } from '@/utils/socket'
import { getAcctById } from '@/utils/storage'
import { useConfigStore } from '@/utils/store/config'
import { useFilterStore } from '@/utils/store/filter'
import { getConversations } from '@/utils/timeline'
import type { ReceiveTimelineConversationPayload } from '@/utils/type'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import generator from '@cutls/megalodon'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { useFocusEffect } from 'expo-router'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, AppState, type AppStateStatus, PlatformColor, RefreshControl, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Conversation } from '../status/Conversation'
import { Text } from '../themed/Text'
import { ProgressView } from '../ui/ProgressView'
interface IProps {
	timeline: TimelineProps
	columnWidth: number
	lang: string
	relayRef?: React.Ref<FlashListRef<any>>
	composeAction: (client: MegalodonInterface, account: Account, type: 'quote' | 'reply' | 'edit', target: Entity.Status) => void
}
export const Conversations = (props: IProps) => {
	const { timeline, columnWidth, lang, relayRef, composeAction } = props
	const { acctId } = timeline
	const { t } = useTranslation()
	const theme = useColorScheme()
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [acct, setAcct] = useState<Account | null>(null)

	const isDark = theme === 'dark'
	const txtColor = isDark ? 'white' : 'black'
	const [statuses, setStatuses] = useState<Entity.Conversation[]>([])
	const [unread, setUnread] = useState<Entity.Conversation[]>([])
	const [isMore, setIsMore] = useState(false)
	const [isInitiated, setIsInitiated] = useState(false)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [maxId, setMaxId] = useState<string | null>(null)

	const { getFilters } = useFilterStore()
	const { config } = useConfigStore()
	const [filters, setFilters] = useState<Entity.Filter[]>([])
	const isStreaming = false
	const updateStatus = (newStatus: Entity.Status | null, deleteId?: string) => {
		if (newStatus === null) setStatuses((prevStatuses) => prevStatuses.filter((s) => s.last_status?.id !== deleteId))
		if (newStatus) setStatuses((prevStatuses) => prevStatuses.map((s) => (s.last_status?.id === newStatus.id ? { ...s, last_status: newStatus } : s)))
	}
	const load = async (refresh: boolean) => {
		try {
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
			const res = await getConversations(useClient, option)
			setMaxId(res[res.length - 1]?.id || null)
			setFilters(getFilters(acctId, 'thread'))
			setStatuses(res)
			if (refresh) return
			await listenTimelineWaiter(timeline.id)
			listenTimeline<ReceiveTimelineConversationPayload>(
				'receive-timeline-conversation',
				(ev) => {
					if (ev.payload.tlId !== timeline.id) return
					setUnread((current) => prependConversation(current, ev.payload.conversation))
				},
				config.timeline,
				false
			)
		} catch (e) {
			console.log(e)
		} finally {
			setIsInitiated(false)
			setIsRefreshing(false)
		}
	}
	useEffect(() => {
		const _handleAppStateChange = async (nextAppState: AppStateStatus) => {
			if (nextAppState === 'active') load(false)
		}
		const e = AppState.addEventListener('change', _handleAppStateChange)
		return () => e.remove()
	}, [])
	useFocusEffect(
		useCallback(() => {
			load(false)
			return () => {}
		}, [])
	)
	const more = async () => {
		setIsMore(true)
		try {
			if (!client) return
			const res = await getConversations(client, { max_id: maxId })
			setStatuses((p) => [...p, ...res])
			setMaxId(res[res.length - 1]?.id || null)
		} catch (e) {
			console.log(e)
		} finally {
			setIsMore(false)
		}
	}
	if (!client || !acct) return null
	return (
		<View style={{ flex: 1 }}>
			<FlashList
				data={statuses}
				keyExtractor={(item) => item.id}
				ref={relayRef}
				refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(true)} />}
				ItemSeparatorComponent={() => <View style={{ borderWidth: 0.5, borderColor: PlatformColor('separator'), marginLeft: 5, width: columnWidth - 10 }}></View>}
				renderItem={({ item: conversation }) => (
					<Conversation
						status={conversation}
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
				onEndReached={() => {
					if (isMore) return
					if (statuses.length >= 20) more()
				}}
				maintainVisibleContentPosition={{
					autoscrollToTopThreshold: 0,
					animateAutoScrollToBottom: false
				}}
				onEndReachedThreshold={0}
				ListEmptyComponent={() => <View style={{ alignItems: 'center', marginTop: 100 }}>{!isInitiated ? <ActivityIndicator /> : <Text>{t('empty')}</Text>}</View>}
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
			{isRefreshing && <ProgressView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
		</View>
	)
}

const prependConversation = (conversations: Array<Entity.Conversation>, conversation: Entity.Conversation): Array<Entity.Conversation> => {
	if (conversations.find((c) => c.id === conversation.id)) {
		return updateConversation(conversations, conversation)
	}
	return [conversation, ...conversations]
}

const updateConversation = (conversations: Array<Entity.Conversation>, conversation: Entity.Conversation): Array<Entity.Conversation> => {
	return conversations.map((c) => {
		if (c.id === conversation.id) {
			return conversation
		}
		return c
	})
}
