import { Text } from '@/components/themed/Text'
import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { useConfigStore } from '@/utils/store/config'
import { useTimelineStore } from '@/utils/store/timelines'
import { getAllMentions, getSourceText } from '@/utils/timeline'
import type { ActionProps, IState } from '@/utils/type'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import type { FlashListRef } from '@shopify/flash-list'
import * as Localization from 'expo-localization'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type NativeSyntheticEvent, PlatformColor, ScrollView, StyleSheet, View } from 'react-native'
import PagerView from 'react-native-pager-view'
import type { OnPageSelectedEventData } from 'react-native-pager-view/lib/typescript/PagerViewNativeComponent'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Conversations } from '../timeline/Conversations'
import { Notifications } from './Notifications'
import { Timeline } from './Timeline'

interface IProps {
	context: {
		current: number
		setCurrent: IState<number>
		relayRef: React.Ref<FlashListRef<any>>
		setComposeAction: IState<ActionProps | null>
	}
}
const Walkthrough = ({ styles }: { styles: any }) => {
	const { t } = useTranslation()
	return (
		<SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', height: '100%' }]}>
			<View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
				<View style={{ height: 20 }} />
				<Text style={{ textAlign: 'center' }}>{t('timeline.walkthrough')}</Text>
			</View>
		</SafeAreaView>
	)
}
export const Columns = ({ context }: IProps) => {
	const { current, setCurrent, relayRef, setComposeAction } = context
	const { timelines } = useTimelineStore()
	const { width, height, deviceWidth } = useWindowSize()
	const { config } = useConfigStore()
	const refPager = useRef<PagerView>(null)
	const refScroll = useRef<ScrollView>(null)
	const lang = Localization.getLocales()[0]?.languageTag === 'ja-JP' ? 'ja' : 'en'
	const action = async (client: MegalodonInterface, account: Account, type: 'quote' | 'reply' | 'edit', target: Entity.Status) => {
		const isMe = target.account.acct !== account.username ? `@${target.account.acct} ` : ''
		if (type === 'reply') setComposeAction({ type: 'reply', acctId: account.id, targetId: target.id, addText: `${isMe}${getAllMentions(target)}` })
		if (type === 'quote') setComposeAction({ type: 'quote', acctId: account.id, targetId: target.id })
		if (type === 'edit') setComposeAction({ type: 'edit', acctId: account.id, targetId: target.id, addText: await getSourceText(target, client), status: target })
	}
	const columnWidth = config.timeline.widthInTablet || 350
	useEffect(() => {
		if (refPager.current) refPager.current.setPage(current)
		if (refScroll.current) {
			;(refScroll as any).current.scrollTo({ x: current * columnWidth, animated: true })
		}
	}, [current])

	const styles = createStyles({ width, height, deviceWidth })
	if (timelines.length === 0) return <Walkthrough styles={styles} />

	return (
		<SafeAreaView style={[styles.container]}>
			{deviceWidth <= 550 ? (
				<PagerView ref={refPager} style={{ height: '100%', width: '100%' }} initialPage={0} onPageSelected={(a: NativeSyntheticEvent<OnPageSelectedEventData>) => setCurrent(a.nativeEvent.position)}>
					{timelines.map((timeline, index) => (
						<View style={styles.page} key={timeline.id}>
							{timeline.kind !== 'notifications' && timeline.kind !== 'direct' && (
								<Timeline timeline={timeline} relayRef={current === index ? relayRef : undefined} composeAction={action} columnWidth={width} lang={lang} />
							)}
							{timeline.kind === 'notifications' && <Notifications timeline={timeline} relayRef={current === index ? relayRef : undefined} composeAction={action} columnWidth={width} lang={lang} />}
							{timeline.kind === 'direct' && <Conversations timeline={timeline} relayRef={current === index ? relayRef : undefined} composeAction={action} columnWidth={width} lang={lang} />}
						</View>
					))}
				</PagerView>
			) : (
				<ScrollView
					ref={refScroll as any}
					horizontal={true}
					style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'row', marginTop: 10 }}
					onScrollBeginDrag={(e) => setCurrent(Math.max(0, Math.floor(e.nativeEvent.contentOffset.x / columnWidth)))}
				>
					{timelines.map((timeline, index) => (
						<View style={styles.page} key={timeline.id}>
							{timeline.kind !== 'notifications' && timeline.kind !== 'direct' && (
								<Timeline timeline={timeline} relayRef={current === index ? relayRef : undefined} composeAction={action} columnWidth={columnWidth} lang={lang} />
							)}
							{timeline.kind === 'notifications' && (
								<Notifications timeline={timeline} relayRef={current === index ? relayRef : undefined} composeAction={action} columnWidth={columnWidth} lang={lang} />
							)}
							{timeline.kind === 'direct' && <Conversations timeline={timeline} relayRef={current === index ? relayRef : undefined} composeAction={action} columnWidth={columnWidth} lang={lang} />}
						</View>
					))}
				</ScrollView>
			)}
		</SafeAreaView>
	)
}

const createStyles = ({ width, height, deviceWidth }: { width: number; height: number; deviceWidth: number }) =>
	StyleSheet.create({
		container: {
			width: deviceWidth
		},
		page: deviceWidth >= 550 ? { borderRightWidth: 1, borderRightColor: PlatformColor('separator') } : {}
	})
