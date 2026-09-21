import Avatar from '@/components/Avatar'
import Acct from '@/components/composer/Acct'
import Composer from '@/components/composer/Composer'
import Emoji from '@/components/composer/Emoji'
import Menu from '@/components/composer/Menu'
import Poll from '@/components/composer/Poll'
import Schedule from '@/components/composer/Schedule'
import { Text } from '@/components/themed/Text'
import type { Account } from '@/entities/account'
import type { Poll as IPoll } from '@/entities/status'
import { getAcctById, getUsualAcct } from '@/utils/storage'
import type { ActionProps, ComposeMode } from '@/utils/type'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet'
import { randomUUID } from 'expo-crypto'
import { GlassView } from 'expo-glass-effect'
import { router, useLocalSearchParams } from 'expo-router'
import { useHeaderHeight } from 'expo-router/react-navigation'
import { SymbolView } from 'expo-symbols'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Keyboard, PlatformColor, StyleSheet, TouchableOpacity, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface PostParams {
	mode?: 'reply' | 'quote' | 'edit'
	acctId?: string
	targetId?: string
	addText?: string
	addImage?: string //  JSON
	statusId?: string
	visibility?: ActionProps['visibility']
}
interface PostOptions {
	scheduled_at?: string
	poll?: IPoll
	editTargetId?: string
	in_reply_to_id?: string
	quoted_status_id?: string
}
type SheetMode = Exclude<ComposeMode, 'compose' | 'loading'>

// Each mode gets its own sheet; the screen's editor stays mounted underneath.
function ModeSheet({ children, close, scrollable = true }: { children: ReactNode; close: () => void; scrollable?: boolean }) {
	const insets = useSafeAreaInsets()
	const Content = scrollable ? BottomSheetScrollView : BottomSheetView
	return (
		<BottomSheet
			index={0}
			snapPoints={scrollable ? ['70%', '90%'] : undefined}
			enableDynamicSizing={!scrollable}
			enablePanDownToClose
			enableBlurKeyboardOnGesture
			keyboardBlurBehavior="restore"
			onClose={close}
			backgroundStyle={styles.sheetBackground}
			backgroundComponent={(props: React.ComponentProps<typeof GlassView>) => <GlassView {...props} style={[props.style, { backgroundColor: 'transparent', borderRadius: 20 }]} />}
			handleIndicatorStyle={styles.sheetHandle}
			backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />}
		>
			<Content
				{...(scrollable ? { contentContainerStyle: [styles.sheetContent, { paddingBottom: insets.bottom + 20 }], keyboardShouldPersistTaps: 'handled' as const } : { style: styles.sheetContent })}
			>
				{children}
			</Content>
		</BottomSheet>
	)
}

export default function Post() {
	const { mode: type, acctId, targetId, addText: encodedText, addImage: addImageRaw, statusId, visibility } = useLocalSearchParams() as unknown as PostParams
	const addImage = addImageRaw ? JSON.parse(addImageRaw) : undefined
	const { t } = useTranslation()
	const insets = useSafeAreaInsets()
	const headerHeight = useHeaderHeight()
	const [acct, setAcct] = useState<Account | null>(null)
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [sheet, setSheet] = useState<SheetMode | null>(null)
	const [text, setText] = useState('')
	const [cw, setCW] = useState('')
	const [uploaded, setUploaded] = useState<Array<Entity.Attachment | Entity.AsyncAttachment>>([])
	const [vis, setVis] = useState<NonNullable<ActionProps['visibility']>>('public')
	const [optional, setOptional] = useState<PostOptions>({})
	const [maxChars, setMaxChars] = useState(500)
	const [maxPollsOptions, setMaxPollsOptions] = useState(4)
	const [initializing, setInitializing] = useState(true)
	const [posting, setPosting] = useState(false)
	const submitting = useRef(false)
	const textColor = PlatformColor('label')

	useEffect(() => {
		let cancelled = false
		const initialize = async () => {
			setInitializing(true)
			try {
				const account = (acctId ? await getAcctById(acctId) : null) || (await getUsualAcct())
				if (!account) return
				const api = generator(account.sns, `https://${account.domain}`, account.accessToken)
				const status = type === 'edit' && statusId ? (await api.getStatus(statusId)).data : undefined
				if (cancelled) return
				setText(encodedText ? decodeURIComponent(encodedText) : '')
				setCW(status?.spoiler_text || '')
				if (addImage) {
					console.log('addImage', addImage)
					for (const image of addImage) {
						console.log(image)
						const response = await fetch(image)
						console.log('response', response)
						const uuid = randomUUID()
						const blob = await response.blob()
						const result = await api.uploadMedia({
							uri: image,
							type: blob.type,
							name: `${uuid}.jpg`
						})
						if (result.data) setUploaded((prev) => [...prev, result.data])
					}
				} else {
					setUploaded(status?.media_attachments || [])
				}
				setOptional({
					in_reply_to_id: type === 'reply' ? targetId : undefined,
					quoted_status_id: type === 'quote' ? targetId : undefined,
					editTargetId: type === 'edit' ? targetId || statusId : undefined,
					poll: status?.poll
						? {
								options: status.poll.options.map((option) => option.title),
								expires_in: status.poll.expires_at ? Math.floor((new Date(status.poll.expires_at).getTime() - Date.now()) / 1000) : 300,
								multiple: status.poll.multiple,
								hide_totals: false
							}
						: undefined
				})
				setVis(status?.visibility || visibility || 'public')
				setAcct(account)
			} catch (error) {
				if (!cancelled) Alert.alert(t('screen.post'), String(error))
			} finally {
				if (!cancelled) setInitializing(false)
			}
		}
		void initialize()
		return () => {
			cancelled = true
		}
	}, [type, acctId, targetId, encodedText, statusId, visibility])

	useEffect(() => {
		if (!acct) return
		let cancelled = false
		setClient(null)
		const api = generator(acct.sns, `https://${acct.domain}`, acct.accessToken)
		const load = async () => {
			try {
				const [instance, credentials] = await Promise.all([api.getInstance(), api.verifyAccountCredentials()])
				if (cancelled) return
				setMaxChars(instance.data.configuration.statuses.max_characters || 500)
				setMaxPollsOptions(instance.data.configuration.polls?.max_options || 4)
				const privacy = credentials.data.source?.privacy
				if (!visibility && type !== 'edit' && (privacy === 'public' || privacy === 'unlisted' || privacy === 'private' || privacy === 'direct')) setVis(privacy)
			} catch (error) {
				if (!cancelled) Alert.alert(t('screen.post'), String(error))
			} finally {
				if (!cancelled) setClient(api)
			}
		}
		void load()
		return () => {
			cancelled = true
		}
	}, [acct])

	const changeMode = (mode: ComposeMode) => {
		Keyboard.dismiss()
		setSheet(mode === 'compose' || mode === 'loading' ? null : mode)
	}
	const closeSheet = (mode: SheetMode) => setSheet((current) => (current === mode ? null : current))
	const post = async () => {
		if (!client || submitting.current) return
		submitting.current = true
		setPosting(true)
		Keyboard.dismiss()
		try {
			const { editTargetId, ...options } = optional
			const data = { ...options, spoiler_text: cw || undefined, visibility: vis, media_ids: uploaded.map((attachment) => attachment.id) }
			if (editTargetId) await client.editStatus(editTargetId, { status: text, ...data })
			else await client.postStatus(text, data)
			router.back()
		} catch (error) {
			Alert.alert(t('screen.post'), String(error))
		} finally {
			submitting.current = false
			setPosting(false)
		}
	}

	return (
		<>
			<KeyboardAvoidingView style={styles.screen} behavior="height" automaticOffset={true}>
				{initializing ? (
					<ActivityIndicator />
				) : acct ? (
					<View pointerEvents={posting || !client ? 'none' : 'auto'} style={{ height: '100%' }}>
						<View style={styles.header}>
							<TouchableOpacity activeOpacity={0.7} onPress={() => changeMode('acct')} style={styles.account}>
								<Avatar src={acct.avatar || acct.favicon} fallback={acct.sns} size={24} />
								<Text style={styles.username} numberOfLines={1}>
									{acct.username}@{acct.domain}
								</Text>
							</TouchableOpacity>
							<View style={styles.indicators}>
								{optional.scheduled_at && <SymbolView type="monochrome" tintColor={textColor} name="clock" size={16} />}
								{optional.poll && <SymbolView type="monochrome" tintColor={textColor} name="checklist" size={16} />}
								{optional.in_reply_to_id && <SymbolView type="monochrome" tintColor={textColor} name="arrowshape.turn.up.left" size={16} />}
								{optional.quoted_status_id && <SymbolView type="monochrome" tintColor={textColor} name="quote.bubble.fill" size={16} />}
								<Text>{maxChars - text.length}</Text>
							</View>
						</View>
						{type && <Text>{t(`composer.${type}`)}</Text>}
						<Composer
							isOpened={sheet === null}
							isInSheet={false}
							acct={acct}
							client={client}
							post={post}
							changeMode={changeMode}
							textState={{ text, setText }}
							cwState={{ cw, setCW }}
							uploadedState={{ uploaded, setUploaded }}
							visState={{ vis, setVis }}
						/>
						{(posting || !client) && <ActivityIndicator />}
					</View>
				) : (
					<Acct change={setAcct} />
				)}
			</KeyboardAvoidingView>
			{sheet === 'acct' && (
				<ModeSheet close={() => closeSheet('acct')}>
					<Acct
						change={(account) => {
							setClient(null)
							setAcct(account)
							setSheet(null)
						}}
					/>
				</ModeSheet>
			)}
			{sheet === 'emoji' && (
				<ModeSheet close={() => closeSheet('emoji')} scrollable={false}>
					<Emoji
						client={client}
						add={(emoji) => {
							if (emoji) setText((value) => `${value} :${emoji}: `)
							setSheet(null)
						}}
					/>
				</ModeSheet>
			)}
			{sheet === 'menu' && (
				<ModeSheet close={() => closeSheet('menu')} scrollable={false}>
					<Menu inSheet={false} client={client} npSet={{ setText, setUploaded }} changeMode={changeMode} />
				</ModeSheet>
			)}
			{sheet === 'poll' && (
				<ModeSheet close={() => closeSheet('poll')}>
					<Poll
						defaultPoll={optional.poll || null}
						maxPollsOptions={maxPollsOptions}
						changeMode={changeMode}
						addPoll={(poll) => {
							setOptional((value) => ({ ...value, poll: poll || undefined }))
							setSheet(null)
						}}
					/>
				</ModeSheet>
			)}
			{sheet === 'schedule' && (
				<ModeSheet close={() => closeSheet('schedule')} scrollable={false}>
					<Schedule
						defaultSchedule={optional.scheduled_at}
						changeMode={changeMode}
						addSchedule={(date) => {
							setOptional((value) => ({ ...value, scheduled_at: date?.toISOString() }))
							setSheet(null)
						}}
					/>
				</ModeSheet>
			)}
		</>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: PlatformColor('systemBackground'), padding: 20, paddingBottom: 10, height: '100%' },
	header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
	account: { flex: 1, flexDirection: 'row', alignItems: 'center' },
	username: { flexShrink: 1, fontSize: 16, marginLeft: 10 },
	indicators: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 5 },
	sheetBackground: { backgroundColor: PlatformColor('secondarySystemBackground') },
	sheetHandle: { backgroundColor: PlatformColor('secondaryLabel') },
	sheetContent: { padding: 20, backgroundColor: 'transparent' }
})
