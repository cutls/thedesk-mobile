import AddTimeline from '@/components/AddTimeline'
import ComposeSheetBase from '@/components/ComposeSheetBase'
import { Columns } from '@/components/timeline/Columns'
import { useWindowSize } from '@/hooks/useWindowSize'
import { getTimelines, listAccts } from '@/utils/storage'
import { useFilterStore } from '@/utils/store/filter'
import type { ActionProps } from '@/utils/type'
import generator from '@cutls/megalodon'
import type { FlashListRef } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Navigator from '../components/Navigator'

export default function Index() {
	const { width } = useWindowSize()
	const [isComposeOpened, setIsComposeOpened] = useState(false)
	const [isAddTLOpened, setIsAddTLOpened] = useState(false)
	const [current, setCurrent] = useState(0)
	const [composeAction, setComposeAction] = useState<ActionProps | null>(null)
	const relayRef = useRef<FlashListRef<any>>(null)
	const router = useRouter()
	const { setFilters } = useFilterStore()
	useEffect(() => {
		const fn = async () => {
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
		const fn = async () => {
			const accts = await listAccts()
			setComposeAction({ acctId: accts[current]?.id || '' })
		}
		fn()
	}, [current])
	useEffect(() => {
		if (composeAction?.type) setIsComposeOpened(true)
	}, [composeAction])
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
