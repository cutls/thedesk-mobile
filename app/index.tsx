import AddTimeline from '@/components/AddTimeline'
import ComposeSheetBase from '@/components/ComposeSheetBase'
import { Columns } from '@/components/timeline/Columns'
import { defaultSetting } from '@/entities/settings'
import { getSettings, getTimelines, listAccts } from '@/utils/storage'
import { useConfigStore } from '@/utils/store/config'
import { useTimelineStore } from '@/utils/store/timelines'
import { useFilterStore } from '@/utils/store/filter'
import type { ActionProps } from '@/utils/type'
import generator from '@cutls/megalodon'
import type { FlashListRef } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Navigator from '../components/Navigator'

export default function Index() {
	const { config, setConfig } = useConfigStore()
	const { timelines } = useTimelineStore()
	const composerDisplay = config.compose?.display ?? defaultSetting.compose.display
	const [isComposeOpened, setIsComposeOpened] = useState(false)
	const [isAddTLOpened, setIsAddTLOpened] = useState(false)
	const [current, setCurrent] = useState(0)
	const currentAcctId = timelines[current]?.acctId || ''
	const [composeAction, setComposeAction] = useState<ActionProps | null>(null)
	const relayRef = useRef<FlashListRef<any>>(null)
	const router = useRouter()
	const { setFilters } = useFilterStore()
	useEffect(() => {
		const fn = async () => {
			const stored = await getSettings()
			if (stored) setConfig(stored)
			const accts = await listAccts()
			if (accts.length === 0) router.replace('/login')
			const timeline = await getTimelines()
			if (timeline.length === 0) setIsAddTLOpened(true)
			for (const acct of accts) {
				const https = `https://${acct.domain}`
				const client = generator(acct.sns, https, acct.accessToken)
				const filters = await client.getFilters()
				setFilters(acct.id, filters.data)
			}
		}
		fn()
	}, [])
	useEffect(() => {
		setComposeAction({ acctId: currentAcctId })
	}, [current, currentAcctId])
	useEffect(() => {
		if (!composeAction?.type) return
		if (composerDisplay === 'screen') {
			const { type, acctId, targetId, addText, visibility, status } = composeAction
			setIsComposeOpened(false)
			setComposeAction({ acctId })
			router.push({
				pathname: '/post',
				params: {
					acctId,
					targetId,
					statusId: status?.id || targetId,
					mode: type,
					// post.tsx decodes this field after Expo Router reads the params.
					addText: addText ? encodeURIComponent(addText) : undefined,
					visibility
				}
			})
		} else {
			setIsComposeOpened(true)
		}
	}, [composeAction, composerDisplay])
	return (
		<View style={styles.container}>
			<Columns context={{ current, setCurrent, relayRef, setComposeAction }} />
			<Navigator context={{ current, setCurrent, relayRef }} openComposer={() => setIsComposeOpened(true)} openAddTimeline={() => setIsAddTLOpened(true)} />
			<ComposeSheetBase isOpened={isComposeOpened} setIsOpened={setIsComposeOpened} composeAction={composeAction} clearComposeAction={(acctId: string) => setComposeAction({ acctId })} />
			<AddTimeline context={{ current, setCurrent }} isOpened={isAddTLOpened} setIsOpened={setIsAddTLOpened} />
		</View>
	)
}
const styles = StyleSheet.create({
	container: {
		height: '100%',
		width: '100%'
	},
	link: {
		marginTop: 15,
		paddingVertical: 15
	}
})
