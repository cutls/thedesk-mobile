import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { type SFSymbol, SymbolView } from 'expo-symbols'
import React from 'react'
import { PlatformColor, StyleSheet, useColorScheme, View } from 'react-native'
import { Text } from '../themed/Text'

import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { useConfigStore } from '@/utils/store/config'
import { Link, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { User } from '../profile/User'
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
const Banner = ({ acctId, type, who, txtColor }: { acctId: string; type: string; who: Entity.Account | null; txtColor: string }) => {
	const { t } = useTranslation()
	const { width } = useWindowSize()
	return (
		<View style={{ paddingLeft: 10 }}>
			<Link href={`/user?acctId=${acctId}&userId=${who?.id}`} push>
				<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
				<Link.Trigger>
					<View style={{ flexDirection: 'row', marginTop: 5, marginLeft: 2, width: width - 10 }}>
						<SymbolView name={icon(type)} type="monochrome" size={16} tintColor={txtColor} />
						<Text numberOfLines={1} style={{ marginLeft: 2 }}>{t(`timeline.notification.${type}.body`, { user: who?.display_name || who?.acct || '' })}</Text>
					</View>
				</Link.Trigger>
			</Link>
		</View>
	)
}
export const Notification = (props: IProps) => {
	const { status: notification, client, columnWidth, lang, updateStatus, acct, composeAction, filters } = props
	const { t } = useTranslation()
	const router = useRouter()
	const { config } = useConfigStore()

	const theme = useColorScheme()
	const isDark = theme === 'dark'
	const txtColor = isDark ? 'white' : 'black'
	if (notification.status) {
		return (
			<>
				<Banner acctId={acct.id} type={notification.type} who={notification.account} txtColor={txtColor} />
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
			</>
		)
	}
	if (notification.account) {
		return (
			<>
				<Banner acctId={acct.id} type={notification.type} who={notification.account} txtColor={txtColor} />
				<User acct={acct} columnWidth={columnWidth} txtColor={txtColor} basic={notification.account} />
			</>
		)
	}
	return null
}

const createStyles = ({ width }: { width: number }) => StyleSheet.create({})
