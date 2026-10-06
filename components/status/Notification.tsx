import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { type SFSymbol, SymbolView } from 'expo-symbols'
import { useRef, useState } from 'react'
import { Alert, PlatformColor, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Text } from '../themed/Text'

import type { Account } from '@/entities/account'
import { useConfigStore } from '@/utils/store/config'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { User } from '../profile/User'
import { CustomedButton } from '../ui/CustomedButton'
import { Status } from './Status'

type IConfig = {}
interface IProps {
	status: Entity.Notification
	client: MegalodonInterface
	acct: Account
	columnWidth: number
	config: IConfig
	//openFromOtherAccount: (status: Entity.Status) => void
	filters: Array<Entity.Filter>
	lang: 'ja' | 'en'
	updateStatus: (newStatus: Entity.Status | null, deleteId?: string) => void
	composeAction: (client: MegalodonInterface, account: Account, type: 'quote' | 'reply' | 'edit', target: Entity.Status) => void
}
const icon = (type: string): SFSymbol => {
	if (type === 'follow') return 'person.badge.plus'
	if (type === 'follow_request') return 'person.badge.plus.fill'
	if (type === 'move') return 'arrow.right.arrow.left'
	if (type === 'favourite') return 'star'
	if (type === 'reblog') return 'arrow.2.squarepath'
	if (type === 'poll_expired') return 'chart.bar.doc.horizontal'
	if (type === 'poll_vote') return 'checkmark.circle'
	if (type === 'mention') return 'at'
	if (type === 'emoji_reaction') return 'face.smiling'
	if (type === 'reaction') return 'face.smiling'
	if (type === 'update') return 'pencil'
	if (type === 'status') return 'pencil'
	if (type === 'quote') return 'quote.bubble'
	return 'bell'
}
const Banner = ({ acctId, type, who, txtColor, columnWidth }: { acctId: string; type: string; who: Entity.Account | null; txtColor: string; columnWidth: number }) => {
	const { t } = useTranslation()
	return (
		<View style={{ width: columnWidth, paddingHorizontal: 10 }}>
			<Link href={`/user?acctId=${acctId}&userId=${who?.id}`} push asChild>
				<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
				<Link.Trigger>
					<TouchableOpacity activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, marginLeft: 2, width: columnWidth - 22, minHeight: 24 }}>
						<SymbolView name={icon(type)} type="monochrome" size={16} tintColor={txtColor} style={{ width: 20, height: 24, flexShrink: 0 }} />
						<Text style={{ flex: 1, flexShrink: 1, minWidth: 0, marginLeft: 2 }}>{t(`timeline.notification.${type}.body`, { user: who?.display_name || who?.acct || '' })}</Text>
					</TouchableOpacity>
				</Link.Trigger>
			</Link>
		</View>
	)
}
const FollowRequestActions = ({ client, targetId, columnWidth }: { client: MegalodonInterface; targetId: string; columnWidth: number }) => {
	const { t } = useTranslation()
	const [isLoading, setIsLoading] = useState(false)
	const [isResolved, setIsResolved] = useState(false)
	const pendingAction = useRef(false)
	// CustomedButton subtracts 40 from its width prop; allow for padding and the row gap.
	const requestButtonWidth = (columnWidth - 20 - 10) / 2 + 40
	const respond = async (accept: boolean) => {
		if (pendingAction.current || isResolved) return
		pendingAction.current = true
		setIsLoading(true)
		try {
			if (accept) await client.acceptFollowRequest(targetId)
			else await client.rejectFollowRequest(targetId)
			setIsResolved(true)
		} catch (error) {
			Alert.alert(t('screen.user'), String(error))
		} finally {
			pendingAction.current = false
			setIsLoading(false)
		}
	}
	if (isResolved) return null
	return (
		<View style={[styles.requestContainer, { width: columnWidth }]}>
			<Text>{t('user.requestedBy')}</Text>
			<View style={styles.requestActions}>
				<CustomedButton width={requestButtonWidth} style={styles.requestButton} isLoading={isLoading} onPress={() => respond(true)}>
					<Text style={styles.buttonText}>{t('user.accept')}</Text>
				</CustomedButton>
				<CustomedButton width={requestButtonWidth} style={styles.requestButton} isLoading={isLoading} onPress={() => respond(false)}>
					<Text style={styles.buttonText}>{t('user.reject')}</Text>
				</CustomedButton>
			</View>
		</View>
	)
}
export const Notification = (props: IProps) => {
	const { status: notification, client, columnWidth, lang, updateStatus, acct, composeAction, filters } = props
	const { config } = useConfigStore()

	const theme = useColorScheme()
	const isDark = theme === 'dark'
	const txtColor = isDark ? 'white' : 'black'
	const requestActions = notification.type === 'follow_request' && notification.account && (
		<FollowRequestActions key={`${acct.id}:${notification.id}`} client={client} targetId={notification.account.id} columnWidth={columnWidth} />
	)
	if (notification.status) {
		return (
			<>
				<Banner acctId={acct.id} type={notification.type} who={notification.account} txtColor={txtColor} columnWidth={columnWidth} />
				<Status
					status={notification.status}
					client={client}
					columnWidth={columnWidth}
					lang={lang}
					updateStatus={updateStatus}
					acct={acct}
					composeAction={composeAction}
					config={config.timeline}
					filters={filters}
				/>
				{requestActions}
			</>
		)
	}
	if (notification.account) {
		return (
			<>
				<Banner acctId={acct.id} type={notification.type} who={notification.account} txtColor={txtColor} columnWidth={columnWidth} />
				<User acct={acct} columnWidth={columnWidth} txtColor={txtColor} basic={notification.account} />
				{requestActions}
			</>
		)
	}
	return null
}

const styles = StyleSheet.create({
	requestContainer: { padding: 10, gap: 10 },
	requestActions: { flexDirection: 'row', gap: 10 },
	requestButton: { flex: 1, flexShrink: 1, minHeight: 50, padding: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	buttonText: { fontSize: 18, textAlign: 'center' }
})
