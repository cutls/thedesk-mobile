import type { Account } from '@/entities/account'
import type { Poll as IPoll } from '@/entities/status'
import { useWindowSize } from '@/hooks/useWindowSize'
import { confirmDialog, CONTINUE } from '@/utils/alert'
import { getAcctById, getUsualAcct } from '@/utils/storage'
import type { ActionProps, ComposeMode } from '@/utils/type'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { SymbolView } from 'expo-symbols'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, PlatformColor, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
import Avatar from './Avatar'
import Acct from './composer/Acct'
import Composer from './composer/Composer'
import Emoji from './composer/Emoji'
import Menu from './composer/Menu'
import Poll from './composer/Poll'
import Schedule from './composer/Schedule'
import { Text } from './themed/Text'
import { IconButton } from './ui/Button'

interface Props {
	isOpened: boolean
	open: () => void
	close: () => void
	composeAction: ActionProps | null
	clearComposeAction: (acctId: string) => void
	isInSheet: boolean
}
interface IOptional {
	scheduled_at?: string
	poll?: IPoll
	editTargetId?: string
	in_reply_to_id?: string
	quoted_status_id?: string
}
export default function ComposeSheet({ isOpened, close, open, composeAction, clearComposeAction, isInSheet }: Props) {
	const { t } = useTranslation()
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	const [mode, setMode] = useState<ComposeMode>('compose')
	const [useAcct, setUseAcct] = useState<Account | null>(null)
	const [text, setText] = useState('')
	const [optional, setOptional] = useState<IOptional>({})
	const [vis, setVis] = useState<'public' | 'unlisted' | 'private' | 'direct' | 'local'>('public')
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [maxChars, setMaxChars] = useState(500)
	const [maxPollsOptions, setMaxPollsOptions] = useState(4)
	const [isLoading, setIsLoading] = useState(false)
	const [cw, setCW] = useState('')
	const [uploaded, setUploaded] = useState<Array<Entity.Attachment | Entity.AsyncAttachment>>([])
	const changeMode = (m: ComposeMode) => {
		setMode(m)
	}
	const addEmoji = (e: string) => {
		if (e) setText((t) => `${t} :${e}: `)
		setMode('compose')
	}
	const addSchedule = (date: Date | null) => {
		setOptional((o) => ({ ...o, scheduled_at: date ? date.toISOString() : undefined }))
		setMode('compose')
	}
	const addPoll = (poll: IPoll | null) => {
		setOptional((o) => ({ ...o, poll: poll || undefined }))
		setMode('compose')
	}
	const clear = () => {
		setText('')
		setOptional({})
		setCW('')
		setUploaded([])
		setVis('public')
		clearComposeAction(useAcct?.id || '')
	}
	const post = async () => {
		setMode('loading')
		try {
			if (optional.editTargetId) {
				const editData = {
					...optional,
					spoiler_text: cw || undefined,
					visibility: vis,
					media_ids: uploaded.map((u) => u.id)
				}
				await client?.editStatus(optional.editTargetId, { status: text, ...editData })
			} else {
				const postData = {
					...optional,
					spoiler_text: cw || undefined,
					visibility: vis,
					media_ids: uploaded.map((u) => u.id)
				}
				await client?.postStatus(text, postData)
			}
			clear()
			close()
		} finally {
			setMode('compose')
		}
	}
	const loadClient = async (acct: Account) => {
		const https = `https://${acct.domain}`
		const client = generator(acct.sns, https, acct.accessToken)
		setClient(client)
		const instance = await client.getInstance()
		const dataMaxChars = instance.data.configuration.statuses.max_characters
		setMaxPollsOptions(instance.data.configuration.polls?.max_options || 4)
		setMaxChars(dataMaxChars || 500)
		const { data: acctInfo } = await client.verifyAccountCredentials()
		const priv = acctInfo.source?.privacy
		if (['public', 'unlisted', 'private', 'direct'].includes(priv || '')) setVis((priv as any) || 'public')
	}
	useEffect(() => {
		const fn = async () => {
			const accts = await getUsualAcct()
			setUseAcct(accts)
		}
		fn()
	}, [])
	useEffect(() => {
		if (useAcct) loadClient(useAcct)
		if (useAcct) setMode('compose')
	}, [useAcct])
	useEffect(() => {
		const fn = async () => {
			const accts = await getAcctById(composeAction?.acctId || '')
			if (accts) setUseAcct(accts)
			if (composeAction?.addText) setText(composeAction.addText)
			if (composeAction?.type === 'reply') setOptional((o) => ({ ...o, in_reply_to_id: composeAction.targetId }))
			if (composeAction?.type === 'quote') setOptional((o) => ({ ...o, quoted_status_id: composeAction.targetId }))
			if (composeAction?.type === 'edit') setOptional((o) => ({ ...o, editTargetId: composeAction.targetId }))
			if (composeAction?.type) open()
			if (composeAction?.visibility) {
				const priv = composeAction.visibility
				if (['public', 'unlisted', 'private', 'direct'].includes(priv || '')) setVis((priv as any) || 'public')
			}
			if (composeAction?.status) {
				const status = composeAction.status
				const priv = status.visibility
				if (['public', 'unlisted', 'private', 'direct'].includes(priv || '')) setVis((priv as any) || 'public')
				if (status.spoiler_text) setCW(status.spoiler_text)
				if (status.media_attachments && status.media_attachments.length > 0) setUploaded(status.media_attachments)
				setOptional((o) => {
					const newOptional: IOptional = { ...o }
					//if (status.scheduled_at) newOptional.scheduled_at = status.scheduled_at
					if (status.poll)
						newOptional.poll = {
							options: status.poll.options.map((o) => o.title),
							expires_in: status.poll.expires_at ? Math.floor((new Date(status.poll.expires_at).getTime() - Date.now()) / 1000) : 300,
							multiple: status.poll.multiple,
							hide_totals: false
						}
					return newOptional
				})
			}
		}
		fn()
	}, [composeAction])
	const closeCk = () => {
		if (mode !== 'loading') {
			if (text || optional.scheduled_at || optional.poll || optional.editTargetId || uploaded.length > 0 || cw) {
				confirmDialog(t('composer.discard'), t('composer.discardConfirm'), CONTINUE, (s) => t(s)).then((res) => {
					if (res === 1) clear()
					if (res === 1) close()
				})
			} else {
				clear()
				close()
			}
		}
	}
	if (!useAcct) return null
	return (
		<View style={{ padding: 10, flexDirection: 'column', height: 345 }}>
			{mode === 'compose' && (
				<>
					<View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<TouchableOpacity activeOpacity={0.7} onPress={() => changeMode('acct')} style={{ flexGrow: 1 }}>
							<View style={styles.acctContainer}>
								<View>
									<Avatar src={useAcct.avatar || useAcct.favicon} fallback={useAcct.sns} size={20} />
								</View>
								<Text style={[styles.username, { color: textColor }]} numberOfLines={1}>
									{useAcct.username}@{useAcct.domain}
								</Text>
							</View>
						</TouchableOpacity>
						<View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginLeft: 5 }}>
							{optional.scheduled_at && <SymbolView type="monochrome" tintColor={textColor} name="clock" size={16} />}
							{optional.poll && <SymbolView type="monochrome" tintColor={textColor} name="checklist" size={16} />}
							{optional.in_reply_to_id && <SymbolView type="monochrome" tintColor={textColor} name="arrowshape.turn.up.left" size={16} />}
							{optional.quoted_status_id && <SymbolView type="monochrome" tintColor={textColor} name="quote.bubble.fill" size={16} />}
							<Text>{maxChars - text.length}</Text>
							{isInSheet && <IconButton onPress={() => closeCk()} systemImage="xmark" style={{ width: 40, height: 40 }} width={40} isDark={isDark} />}
						</View>
					</View>
					<View style={{}}>
						<Text>{composeAction?.type ? t(`composer.${composeAction.type}`) : ' '}</Text>
					</View>
				</>
			)}
			{mode === 'compose' && (
				<Composer
					isOpened={isOpened}
					client={client}
					post={post}
					visState={{ vis, setVis }}
					acct={useAcct}
					changeMode={changeMode}
					textState={{ text, setText }}
					cwState={{ cw, setCW }}
					uploadedState={{ uploaded, setUploaded }}
					isInSheet={isInSheet}
				/>
			)}
			{mode === 'acct' && <Acct change={(r) => setUseAcct(r)} />}
			{mode === 'emoji' && <Emoji client={client} add={(r) => addEmoji(r)} />}
			{mode === 'menu' && <Menu client={client} npSet={{ setText, setUploaded }} changeMode={changeMode} />}
			{mode === 'schedule' && <Schedule defaultSchedule={optional.scheduled_at || null} changeMode={changeMode} addSchedule={addSchedule} />}
			{mode === 'poll' && <Poll defaultPoll={optional.poll || null} maxPollsOptions={maxPollsOptions} changeMode={changeMode} addPoll={addPoll} />}
			{mode === 'loading' && (
				<View style={{ width: '100%', height: 200, alignItems: 'center', justifyContent: 'center' }}>
					<ActivityIndicator />
				</View>
			)}
		</View>
	)
}

const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		acctContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingBottom: 10,
			height: 40
		},
		username: {
			fontSize: 16,
			marginLeft: 10
		}
	})
