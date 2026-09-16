import type { Account } from '@/entities/account'
import type { Timeline, TimelineKind } from '@/entities/timeline'
import { useWindowSize } from '@/hooks/useWindowSize'
import { confirmDialog, TIMELINE_ADD_DUPLICATED } from '@/utils/alert'
import { getTimelines, getUsualAcct, saveTimelines } from '@/utils/storage'
import { useTimelineStore } from '@/utils/store/timelines'
import { makeListTimelineNameWithAcctId, makeTimelineNameWithAcctId } from '@/utils/timelineName'
import type { IState } from '@/utils/type'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { Host, Label, List } from '@expo/ui/swift-ui'
import { environment, frame, listStyle } from '@expo/ui/swift-ui/modifiers'
import RNBottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { randomUUID } from 'expo-crypto'
import { GlassView } from 'expo-glass-effect'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, PlatformColor, StyleSheet, useColorScheme, View } from 'react-native'
import Avatar from './Avatar'
import Acct from './composer/Acct'
import { Text } from './themed/Text'
import { Button, CustomButton, IconButton } from './ui/Button'

interface Props {
	isOpened: boolean
	setIsOpened: IState<boolean>

	context: {
		current: number
		setCurrent: IState<number>
	}
}
const GlassViewCustom = (props: React.ComponentProps<typeof GlassView>) => <GlassView {...props} style={[props.style, { borderRadius: 20 }]} />
export default function AddTimeline({ isOpened, setIsOpened, context }: Props) {
	const { t } = useTranslation()
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	const [useAcct, setUseAcct] = useState<Account | null>(null)
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const { timelines, setTimelines } = useTimelineStore()
	const [mode, setMode] = useState('select')
	const [lists, setLists] = useState<Array<Entity.List>>([])
	const bottomSheetRef = React.useRef<RNBottomSheet>(null)
	const loadClient = async (acct: Account) => {
		const https = `https://${acct.domain}`
		const client = generator(acct.sns, https, acct.accessToken)
		setClient(client)
		const lists = await client.getLists()
		setLists(lists.data)
	}
	useEffect(() => {
		const fn = async () => {
			const accts = await getUsualAcct()
			setUseAcct(accts)
			const tls = await getTimelines()
			setTimelines(tls)
		}
		fn()
	}, [])
	useEffect(() => {
		if (useAcct) loadClient(useAcct)
		if (useAcct) setMode('select')
	}, [useAcct])
	const add = async (type: TimelineKind) => {
		if (!client || !useAcct) return
		const id = randomUUID()
		const duplicated = timelines.find((tl) => tl.kind === type && tl.acctId === useAcct.id)
		if (duplicated) {
			const proceed = await confirmDialog(t('timeline.duplicateConfirm.title'), t('timeline.duplicateConfirm.message'), TIMELINE_ADD_DUPLICATED, (s) => t(s))
			if (proceed === 0) return
			if (proceed === 1) {
				setIsOpened(false)
				context.setCurrent(timelines.findIndex((tl) => tl.id === duplicated.id))
				return
			}
		}
		const newTimeline: Timeline = {
			id: id,
			name: await makeTimelineNameWithAcctId(type, t(`timeline.kind.${type}`), useAcct.id),
			kind: type,
			acctId: useAcct.id
		}
		await saveTimelines([...timelines, newTimeline])
		setTimelines([...timelines, newTimeline])
		setIsOpened(false)
	}
	const addList = async (id: string, isAntenna: boolean) => {
		if (!client || !useAcct) return
		const newId = randomUUID()
		const duplicated = timelines.find((tl) => tl.kind === 'list' && tl.acctId === useAcct.id && tl.listId === id)
		if (duplicated) {
			const proceed = await confirmDialog(t('timeline.duplicateConfirm.title'), t('timeline.duplicateConfirm.message'), TIMELINE_ADD_DUPLICATED, (s) => t(s))
			if (proceed === 0) return
			if (proceed === 1) {
				setIsOpened(false)
				context.setCurrent(timelines.findIndex((tl) => tl.id === duplicated.id))
				return
			}
		}
		const newTimeline: Timeline = {
			id: newId,
			kind: 'list',
			name: await makeListTimelineNameWithAcctId('list', t(`timeline.kind.list`), useAcct.id, id),
			acctId: useAcct.id,
			listId: id,
			isMisskeyAntenna: isAntenna
		}
		await saveTimelines([...timelines, newTimeline])
		setTimelines([...timelines, newTimeline])
		setIsOpened(false)
	}
	const deleteTimeline = async (tlId: string) => {
		const updatedTimelines = timelines.filter((tl) => tl.id !== tlId)
		await saveTimelines(updatedTimelines)
		setTimelines(updatedTimelines)
	}
	const moveTL = async (from: number, to: number) => {
		const updatedTimelines = [...timelines]
		const item = updatedTimelines.splice(from, 1)[0]
		updatedTimelines.splice(to, 0, item)
		await saveTimelines(updatedTimelines)
		setTimelines(updatedTimelines)
	}

	if (!useAcct || !isOpened) return null
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
			backdropComponent={(props) => <BottomSheetBackdrop {...props} opacity={0.5} onPress={() => bottomSheetRef.current?.close()} disappearsOnIndex={-1} />}
		>
			<BottomSheetView style={styles.contentContainer}>
				<View style={{ padding: 20 }}>
					{mode === 'select' && (
						<>
							<View style={{ display: 'flex', flexDirection: 'row', marginBottom: 10, alignItems: 'center', justifyContent: 'space-between' }}>
								<CustomButton onPress={() => setMode('acct')} style={{ flexGrow: 1, padding: 10 }}>
									<View style={styles.acctContainer}>
										<View>
											<Avatar src={useAcct.avatar || useAcct.favicon} fallback={useAcct.sns} size={20} />
										</View>
										<Text style={[styles.username, { color: textColor }]} numberOfLines={1}>
											{useAcct.username}@{useAcct.domain}
										</Text>
									</View>
								</CustomButton>
								<View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 5, width: 50 }}>
									<IconButton style={{ width: 45, height: 45 }} onPress={() => setMode('sort')} systemImage="list.bullet" isDark={isDark} width={45} />
								</View>
							</View>
							<View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
								<Button width={width / 2 + 15} isDark={isDark} style={{ height: 50, width: width / 2 - 20 }} systemImage="house.fill" onPress={() => add('home')}>
									{t('timeline.kind.home')}
								</Button>
								<Button width={width / 2 + 15} isDark={isDark} style={{ height: 50, width: width / 2 - 20, marginLeft: 5 }} systemImage="person.2.fill" onPress={() => add('local')}>
									{t('timeline.kind.local')}
								</Button>
							</View>
							<View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
								<Button width={width / 2 + 15} isDark={isDark} style={{ height: 50, width: width / 2 - 20 }} systemImage="globe" onPress={() => add('public')}>
									{t('timeline.kind.public')}
								</Button>
								<Button width={width / 2 + 15} isDark={isDark} style={{ height: 50, width: width / 2 - 20, marginLeft: 5 }} systemImage="bell.fill" onPress={() => add('notifications')}>
									{t('timeline.kind.notifications')}
								</Button>
							</View>
							<View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
								<Button width={width / 2 + 15} isDark={isDark} style={{ height: 50, width: width / 2 - 20 }} systemImage="bookmark.fill" onPress={() => add('bookmarks')}>
									{t('timeline.kind.bookmarks')}
								</Button>
								<Button width={width / 2 + 15} isDark={isDark} style={{ height: 50, width: width / 2 - 20, marginLeft: 5 }} systemImage="envelope.fill" onPress={() => add('direct')}>
									{t('timeline.kind.direct')}
								</Button>
							</View>
							<Text style={{ marginTop: 10, marginBottom: 5, fontWeight: 'bold', fontSize: 20 }}>{t('timeline.kind.list')}</Text>
							<FlatList
								horizontal={true}
								style={{ height: 30 }}
								data={lists}
								keyExtractor={(item, index) => `${item.id}-${index}`}
								ListEmptyComponent={<Text>{t('empty')}</Text>}
								renderItem={({ item: list }) => (
									<Button width={0} isDark={isDark} style={styles.listItem} onPress={() => addList(list.id, list.is_misskey_antenna || false)}>
										<Text style={{ fontWeight: 'bold', fontSize: 18, paddingHorizontal: 10, paddingVertical: 2 }}>
											{list.title}
											{list.is_misskey_antenna && ' (Misskey Antenna)'}
										</Text>
									</Button>
								)}
							/>
							<View style={{ height: 20 }} />
						</>
					)}
					{mode === 'sort' && (
						<View style={{ height: 400, width: '100%' }}>
							<Host style={{ flex: 1, backgroundColor: 'transparent' }}>
								<List
									onSelectionChange={(items) => console.log(`indexes of selected items: ${items.join(', ')}`)}
									modifiers={[frame({ width: width }), environment('editMode', 'active'), listStyle('automatic')]}
								>
									{timelines.map((tl) => (
										<List.ForEach onDelete={([item]) => deleteTimeline(timelines[item].id)} key={tl.id} onMove={([from], to) => moveTL(from, to)}>
											<Label title={tl.name}  modifiers={[frame({ width: width })]} />
										</List.ForEach>
									))}
								</List>
							</Host>
							<Button isPrimary={true} width={width} style={{ marginVertical: 10, height: 50 }} onPress={() => setMode('select')} isDark={isDark}>
								{t('ok')}
							</Button>
						</View>
					)}
					{mode === 'acct' && <Acct change={(r) => setUseAcct(r)} />}
				</View>
			</BottomSheetView>
		</RNBottomSheet>
	)
}

const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		acctContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			height: 30
		},
		username: {
			fontSize: 16,
			marginLeft: 10
		},
		listItem: {
			height: 30,
			marginRight: 10,
			backgroundColor: PlatformColor('systemGray3'),
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: 10,
			paddingHorizontal: 20
		},
		contentContainer: {
			backgroundColor: 'transparent',
			padding: 10,
			zIndex: 5
		}
	})
