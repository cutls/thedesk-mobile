import Avatar from '@/components/Avatar'
import { Status } from '@/components/status/Status'
import { Text } from '@/components/themed/Text'
import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { getAcctById } from '@/utils/storage'
import { useConfigStore } from '@/utils/store/config'
import { stripTags } from '@/utils/string'
import { getAllMentions, getSourceText } from '@/utils/timeline'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import * as Localization from 'expo-localization'
import { Link, useIsPreview, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, PlatformColor, StyleSheet, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface StatusExtended extends Entity.Status {
	isBefore?: boolean
	isMain?: boolean
}
const SimpleStatus = ({ status, acctId, isBefore }: { status: Entity.Status; acctId: string; isBefore: boolean }) => {
	const { width } = useWindowSize()
	const { config } = useConfigStore()
	const isAnimation = config.timeline.animation === 'yes'
	const beforeBorder = { borderBottomWidth: 1, borderBottomColor: PlatformColor('separator'), borderLeftWidth: 5, borderLeftColor: PlatformColor('systemGreen')}
	const afterBorder = { borderTopWidth: 1, borderTopColor: PlatformColor('separator'), borderLeftWidth: 5, borderLeftColor: PlatformColor('systemOrange') }
	return (
		<Link href={`/detail?acctId=${acctId}&statusId=${status.id}`} push>
			<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
			<Link.Trigger>
				<View style={{ flexDirection: 'row', padding: 5, width, ...(isBefore ? beforeBorder : afterBorder) }}>
					<Avatar size={40} src={isAnimation ? status.account.avatar : status.account.avatar_static} />
					<View style={{ width: width - 50, marginLeft: 5 }}>
						<Text>{status.account.display_name}</Text>
						<Text numberOfLines={1}>{stripTags(status.content)}</Text>
					</View>
				</View>
			</Link.Trigger>
		</Link>
	)
}
export default function Index() {
	const { t } = useTranslation()
	const isPreview = useIsPreview()
	const [scrolled, setScrolled] = useState(false)

	const router = useRouter()
	const params = useLocalSearchParams()
	const { config } = useConfigStore()
	const { acctId, statusId } = params as Record<'acctId' | 'statusId', string>
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [acct, setAcct] = useState<Account | null>(null)
	const [statuses, setStatuses] = useState<StatusExtended[]>([])
	const lang = Localization.getLocales()[0]?.languageTag === 'ja-JP' ? 'ja' : 'en'
	useEffect(() => {
		const fn = async () => {
			setIsLoading(true)
			try {
				const acct = await getAcctById(acctId)
				if (!acct) throw new Error('Invalid account id')
				setAcct(acct)
				const https = `https://${acct.domain}`
				const client = generator(acct.sns, https, acct.accessToken)
				setClient(client)
				const d = await client.getStatus(statusId)
				const statusExtended: StatusExtended = { ...d.data, isMain: true }
				const context = await client.getStatusContext(statusId)
				setStatuses([...context.data.ancestors.map((t) => ({ ...t, isBefore: true })), statusExtended, ...context.data.descendants])
			} finally {
				setIsLoading(false)
			}
		}
		fn()
	}, [acctId, statusId])
	if (isLoading || !statuses.length || !client || !acct) {
		return (
			<SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<ActivityIndicator />
			</SafeAreaView>
		)
	}
	return (
		<View>
			<FlatList
				renderItem={({ item }) =>
					item.isMain ? (
						<Status
							status={item}
							acct={acct}
							client={client}
							lang={lang}
							columnWidth={width}
							config={config.timeline}
							filters={[]}
							updateStatus={() => {}}
							composeAction={async (client: MegalodonInterface, account: Account, type: 'quote' | 'reply' | 'edit', target: Entity.Status) => {
								const isMe = target.account.acct !== account.username ? `@${target.account.acct} ` : ''
								if (type === 'reply') router.push(`/post?acctId=${account.id}&targetId=${target.id}&statusId=${target.id}&mode=reply&addText=${encodeURIComponent(`${isMe}${getAllMentions(target)}`)}`)
								if (type === 'quote') router.push(`/post?acctId=${account.id}&targetId=${target.id}&statusId=${target.id}&mode=quote`)
								if (type === 'edit') router.push(`/post?acctId=${account.id}&targetId=${target.id}&statusId=${target.id}&mode=edit&addText=${encodeURIComponent(await getSourceText(target, client))}`)
							}}
						/>
					) : (
						<SimpleStatus isBefore={item.isBefore || false} acctId={acctId} status={item} />
					)
				}
				data={statuses}
				keyExtractor={(item) => item.id}
			/>
		</View>
	)
}
const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		horizontal: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 10,
			width: width
		}
	})
