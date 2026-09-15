import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { ja } from 'date-fns/locale'
import { SymbolView } from 'expo-symbols'
import { onTranslateSheet } from 'expo-translate-text'
import React, { useRef, useState } from 'react'
import { ActivityIndicator, PlatformColor, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
import Avatar from '../Avatar'
import { Text } from '../themed/Text'
import { AccountName } from './AccountName'

import type { Account } from '@/entities/account'
import type { Settings } from '@/entities/settings'
import { confirmDialog, CONTINUE } from '@/utils/alert'
import { stripTags } from '@/utils/string'
import { calcFromNow } from '@/utils/timeline'
import { ignoreSafeArea } from '@expo/ui/swift-ui/modifiers'
import * as Clipboard from 'expo-clipboard'
import { Link, useRouter } from 'expo-router'
import { openBrowserAsync } from 'expo-web-browser'
import { useTranslation } from 'react-i18next'
import { Dropdown } from '../ui/Dropdown'
import { Attachment } from './Attachments'
import { Card } from './Card'
import { RenderHTML } from './HTML'
import { Poll } from './Poll'
import { Quote } from './Quote'

type IConfig = Settings['timeline']
interface IProps {
	status: Entity.Status
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

const data = [
	{ value: 'public', systemImage: 'globe' as const },
	{ value: 'unlisted', systemImage: 'eye.slash' as const },
	{ value: 'private', systemImage: 'person.2.fill' as const },
	{ value: 'direct', systemImage: 'envelope.fill' as const }
]
const actions = [
	{ title: 'timeline.action.quote', value: 'quote', systemImage: 'quote.bubble' as const },
	{ title: 'timeline.action.translate', value: 'translate', systemImage: 'translate' as const },
	{ title: 'timeline.action.onOtherAcct', value: 'onOtherAcct', systemImage: 'person.and.arrow.left.and.arrow.right.outward' as const },
	{ title: 'timeline.action.copyUrl', value: 'copyUrl', systemImage: 'link' as const },
	{ title: 'timeline.action.openInBrowser', value: 'openInBrowser', systemImage: 'safari' as const },
	{ title: 'timeline.action.copyText', value: 'copyText', systemImage: 'doc.on.doc' as const }
]
const actionOnlyMe = [
	{ title: 'timeline.action.edit', value: 'edit', systemImage: 'pencil' as const },
	{ title: 'timeline.action.delete', value: 'delete', systemImage: 'trash' as const, isDestructive: true }
]
export const Status = (props: IProps) => {
	const { status: statusRaw, client, columnWidth, lang, updateStatus, acct, composeAction, filters } = props
	const status = statusRaw.reblog ? statusRaw.reblog : statusRaw
	const isMe = acct.username === status.account.acct
	const { t } = useTranslation()
	const theme = useColorScheme()
	const router = useRouter()
	const dropdownRef = useRef<View>(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const isDark = theme === 'dark'
	const txtColor = isDark ? 'white' : 'black'
	const styles = createStyles({ width: columnWidth })
	const [isOpen, setIsOpen] = useState(false)
	const locale = lang === 'ja' ? ja : undefined
	const fromNow = calcFromNow(new Date(status.created_at), lang === 'ja')
	const basic = status.account
	const fontSize = 14
	const showGif = props.config.animation === 'yes'
	const showCount = true
	const avatarSize = 45
	const left = avatarSize + 25
	const [isFiltered, setIsFiltered] = useState(filters.some((f) => status.content.includes(f.phrase) || status.spoiler_text.includes(f.phrase)))
	const isCWA = status.spoiler_text.length > 0
	const isCWB = props.config.maxLength > 0 ? stripTags(status.content).length > props.config.maxLength : false
	const isCW = isCWA || isCWB
	const action = async (type: 'bt' | 'fav' | 'bookmark') => {
		setIsProcessing(true)
		try {
			let response: any = null
			if (type === 'bt' && !status.reblogged) response = await client.reblogStatus(status.id)
			else if (type === 'bt' && status.reblogged) response = await client.unreblogStatus(status.id)
			else if (type === 'fav' && !status.favourited) response = await client.favouriteStatus(status.id)
			else if (type === 'fav' && status.favourited) response = await client.unfavouriteStatus(status.id)
			else if (type === 'bookmark' && !status.bookmarked) response = await client.bookmarkStatus(status.id)
			else if (type === 'bookmark' && status.bookmarked) response = await client.unbookmarkStatus(status.id)
			const newStatus = response.data as Entity.Status
			updateStatus(newStatus.reblog || newStatus)
		} finally {
			setIsProcessing(false)
		}
	}
	const handleLink = (url: string) => {
		const mentionCheck = status.mentions.find((m) => m.url === url)
		const last = url.match(/\/([^/]+)$/)
		if (last && last[1]) {
			const tagCheck = status.tags.find((m) => {
				const mLast = m.url.match(/\/([^/]+)$/)
				return mLast && decodeURIComponent(mLast[1]).toLowerCase() === decodeURIComponent(last[1]).toLowerCase()
			})
			if (tagCheck) {
				router.push(`/tag?acctId=${acct.id}&q=${tagCheck.name}`)
				return
			}
		}
		if (mentionCheck) {
			router.push(`/user?acctId=${acct.id}&userId=${mentionCheck.id}`)
		} else {
			openBrowserAsync(url)
		}
	}
	const dropdown = async (d: string) => {
		if (d === 'quote') composeAction(client, acct, 'quote', status)
		if (d === 'edit') composeAction(client, acct, 'edit', status)
		if (d === 'delete') {
			if (!(await confirmDialog(t('timeline.action.delete'), t('timeline.action.deleteConfirm'), CONTINUE, (s) => t(s)))) return
			client.deleteStatus(status.id)
			updateStatus(null, status.id)
		}
		if (d === 'translate') {
			await onTranslateSheet({
				input: stripTags(status.content)
			})
		}
		if (d === 'onOtherAcct') router.push(`/onOtherAcct?acctId=${acct.id}&statusId=${status.id}`)
		if (d === 'copyUrl') {
			const url = status.url || ''
			Clipboard.setUrlAsync(url)
		}
		if (d === 'openInBrowser') {
			const url = status.url || ''
			openBrowserAsync(url)
		}
		if (d === 'copyText') router.push(`/copy?acctId=${acct.id}&statusId=${status.id}`)
	}

	const otherAction = isMe ? [...actions, ...actionOnlyMe] : actions
	if (isFiltered) {
		return (
			<View style={{ width: columnWidth, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center' }}>
				<Text style={{ fontSize: fontSize, color: PlatformColor('systemGray') }}>{t('timeline.status.filtered')}</Text>
				<TouchableOpacity activeOpacity={0.7} onPress={() => setIsFiltered(false)} style={{ padding: 5, borderRadius: 5, backgroundColor: PlatformColor('systemGray3'), width: 90, marginLeft: 10 }}>
					<Text style={{ fontSize: fontSize, textAlign: 'center' }}>{t('timeline.status.showAnyway')}</Text>
				</TouchableOpacity>
			</View>
		)
	}
	return (
		<View style={{ width: columnWidth, paddingHorizontal: 10, paddingBottom: 2, paddingTop: 5 }}>
			{statusRaw.reblog && (
				<View style={{ marginBottom: 5 }}>
					<Link href={`/user?acctId=${acct.id}&userId=${statusRaw.account.id}`} push>
						<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
						<Link.Trigger>
							<View style={{ display: 'flex', flexDirection: 'row' }}>
								<SymbolView name="repeat" type="monochrome" tintColor={PlatformColor('systemBlue')} size={fontSize * 1.2} />
								<Text style={{ marginLeft: 5, color: PlatformColor('systemGray') }}>{t('timeline.status.rebloggedBy', { name: statusRaw.account.display_name || statusRaw.account.acct })}</Text>
							</View>
						</Link.Trigger>
					</Link>
				</View>
			)}
			<View style={{ display: 'flex', flexDirection: 'row' }}>
				<View style={{ width: avatarSize, alignItems: 'center' }}>
					<Link href={`/user?acctId=${acct.id}&userId=${basic.id}`} push>
						<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
						<Link.Trigger>
							<Avatar src={basic.avatar} size={avatarSize} />
						</Link.Trigger>
					</Link>
					<View style={{ marginTop: 2 }} />
					<SymbolView name={data.find((d) => d.value === status.visibility)?.systemImage || 'questionmark'} size={12} type="monochrome" tintColor={PlatformColor('systemGray')} />
					<View style={{ marginTop: 2 }} />
					{isProcessing && <ActivityIndicator size="small" />}
				</View>

				<View style={{ marginLeft: 5 }}>
					<View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
						<View style={{ width: columnWidth - left - 50 }}>
							<AccountName account={basic} fontSize={fontSize * 1.1} width={columnWidth - left - 50} />
							<Text numberOfLines={1} style={{ color: PlatformColor('systemGray'), fontSize: 10 }}>
								@{basic.acct}
							</Text>
						</View>
						<TouchableOpacity onPress={() => router.push(`/detail?acctId=${acct.id}&statusId=${status.id}`)} activeOpacity={0.7}>
							<Text numberOfLines={1} style={{ color: PlatformColor('systemGray'), textAlign: 'right', width: 50, fontSize: 10 }}>
								{fromNow}
							</Text>
						</TouchableOpacity>
					</View>

					{isCW && (
						<View style={[styles.cwWrap, { borderColor: isCWA ? PlatformColor('systemYellow') : PlatformColor('systemBlue') }]}>
							<Text style={{ fontSize: fontSize, marginRight: 2, width: columnWidth - 180 }}>{status.spoiler_text || stripTags(status.content).slice(0, 20)}</Text>
							<TouchableOpacity
								activeOpacity={0.7}
								onPress={() => setIsOpen(!isOpen)}
								style={{ padding: 5, borderRadius: 5, borderWidth: 1, backgroundColor: PlatformColor('systemGray3'), width: 90 }}
							>
								<Text style={{ fontSize: fontSize, textAlign: 'center' }}>{!isOpen ? t('timeline.status.showMore') : t('timeline.status.showLess')}</Text>
							</TouchableOpacity>
						</View>
					)}
					{(!isCW || isOpen) && (
						<View style={{ display: 'flex', marginTop: 5 }}>
							<RenderHTML status={status} fontSize={fontSize} showGif={showGif} txtColor={txtColor} columnWidth={columnWidth} left={left} handleLink={handleLink} />
						</View>
					)}
					{status.poll && <Poll client={client} updateStatus={updateStatus} emojis={status.emojis} status={status} columnWidth={columnWidth - left} config={{}} lang={lang} isMe={isMe} />}
					{status.quote_status && <Quote config={props.config} acctId={acct.id} status={status.quote_status} columnWidth={columnWidth - left} lang={lang} state={status.quote_status_state} />}
					{status.card && <Card card={status.card} columnWidth={columnWidth - left} />}
					<Attachment attachments={status.media_attachments} width={columnWidth - left} isSensitive={status.sensitive} config={props.config} />
					{status.poll || status.quote_status || status.card || status.media_attachments.length > 0 ? <View style={{ height: 10 }} /> : null}
					<View style={{ display: 'flex', flexDirection: 'row', marginBottom: 10, paddingHorizontal: 10, justifyContent: 'space-between', width: columnWidth - left }}>
						<TouchableOpacity style={styles.action} onPress={() => composeAction(client, acct, 'reply', status)}>
							<SymbolView name="arrowshape.turn.up.left" type="monochrome" tintColor={txtColor} size={fontSize * 1.2} />
							<Text style={{ marginLeft: 5 }}>{showCount ? status.replies_count.toLocaleString() : ''}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.action} onPress={() => action('bt')}>
							<SymbolView name="repeat" type="monochrome" tintColor={status.reblogged ? PlatformColor('systemBlue') : txtColor} size={fontSize * 1.2} />
							<Text style={{ marginLeft: 5 }}>{showCount ? status.reblogs_count.toLocaleString() : ''}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.action} onPress={() => action('fav')}>
							<SymbolView name={status.favourited ? 'star.fill' : 'star'} type="monochrome" tintColor={status.favourited ? PlatformColor('systemYellow') : txtColor} size={fontSize * 1.2} />
							<Text style={{ marginLeft: 5 }}>{showCount ? status.favourites_count.toLocaleString() : ''}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.action} onPress={() => action('bookmark')}>
							<SymbolView name={status.bookmarked ? 'bookmark.fill' : 'bookmark'} type="monochrome" tintColor={status.bookmarked ? PlatformColor('systemRed') : txtColor} size={fontSize * 1.2} />
						</TouchableOpacity>
						<Dropdown data={otherAction} onSelect={(title) => dropdown(title)} modifiers={[ignoreSafeArea({ regions: 'all' })]}>
							<SymbolView name="ellipsis" tintColor={txtColor} type="monochrome" size={fontSize * 1.2} />
						</Dropdown>
					</View>
				</View>
			</View>
		</View>
	)
}

const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		cwWrap: {
			flexDirection: 'row',
			display: 'flex',
			width: width - 65,
			alignItems: 'center',
			justifyContent: 'space-between',
			borderWidth: 1,
			padding: 5,
			marginVertical: 5,
			borderRadius: 5,
			borderLeftWidth: 10
		},
		action: {
			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'center',
			alignItems: 'center'
		}
	})
