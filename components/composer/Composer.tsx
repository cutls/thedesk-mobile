import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { confirmDialog, CONTINUE } from '@/utils/alert'
import { uploadCallback } from '@/utils/picture'
import { suggest } from '@/utils/suggest'
import type { ComposeMode, IState } from '@/utils/type'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { ignoreSafeArea } from '@expo/ui/swift-ui/modifiers'
import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { getColorIOS } from 'expo-color-to-hex'
import { GlassView } from 'expo-glass-effect'
import { Image } from 'expo-image'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, InputAccessoryView, PlatformColor, StyleSheet, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Text } from '../themed/Text'
import { Button, IconButton } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
interface Props {
	textState: { text: string; setText: IState<string> }
	cwState: { cw: string; setCW: IState<string> }
	uploadedState: { uploaded: Array<Entity.Attachment | Entity.AsyncAttachment>; setUploaded: IState<Array<Entity.Attachment | Entity.AsyncAttachment>> }
	acct: Account
	changeMode: (m: ComposeMode) => void
	visState: { vis: 'public' | 'unlisted' | 'private' | 'direct' | 'local'; setVis: IState<'public' | 'unlisted' | 'private' | 'direct' | 'local'> }
	post: () => void
	client: MegalodonInterface | null
	isInSheet: boolean
	isOpened: boolean
}
interface Suggested {
	type: 'emoji' | 'acct' | 'tag'
	emoji?: Entity.Emoji
	acct?: Entity.Account
	tag?: Entity.Tag
}

const data = [
	{ title: 'composer.vis.public', value: 'public', systemImage: 'globe' as const },
	{ title: 'composer.vis.unlisted', value: 'unlisted', systemImage: 'eye.slash' as const },
	{ title: 'composer.vis.private', value: 'private', systemImage: 'person.2.fill' as const },
	{ title: 'composer.vis.direct', value: 'direct', systemImage: 'envelope.fill' as const }
]
const TextInputCustom = (props: React.ComponentProps<typeof TextInput> & { isInSheet: boolean; ref?: any }) => (props.isInSheet ? <BottomSheetTextInput {...props} /> : <TextInput {...props} />)
export default function Composer({ acct, post, changeMode, textState, cwState, uploadedState, visState, client, isInSheet, isOpened }: Props) {
	const { text, setText } = textState
	const { cw, setCW } = cwState
	const { vis, setVis } = visState
	const { uploaded, setUploaded } = uploadedState
	const { t } = useTranslation()
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const textInput = React.useRef<TextInput>(null)
	const [isCW, setIsCW] = useState(!!cw)
	const [suggested, setSuggested] = useState<Array<Suggested>>([])

	const [selection, setSelection] = useState({ start: 0, end: 0 })
	const [deleteTxt, setDeleteTxt] = useState('')
	const [uploading, setUploading] = useState(0)
	const uploadStatus = (i: number) => setUploading(i)
	const upload = async (result: Entity.Attachment | Entity.AsyncAttachment) => setUploaded((prev) => [...prev, result])
	const deleteItem = async (id: string) => {
		if (!(await confirmDialog(t('confirm'), t('composer.deleteAttachmentConfirm'), CONTINUE, (s) => t(s)))) return
		setUploaded((prev) => prev.filter((a) => a.id !== id))
	}
	const sSelect = (inputIt: string) => {
		const firstRaw = text.slice(0, selection.start) || ''
		const newReg = new RegExp(`${deleteTxt}.?\\s?$`)
		const first = firstRaw.replace(newReg, '')
		const end = text.slice(selection.start) || ''
		setText(`${first}${inputIt}${end ? '' : ' '}${end}`)
		setSuggested([])
	}
	const renderSuggest = (item: Suggested) => {
		if (item.emoji)
			return (
				<TouchableOpacity style={[styles.suggested]} onPress={() => sSelect(`:${item.emoji?.shortcode}:`)}>
					<Image source={{ uri: item.emoji?.url }} style={styles.sImg} />
					<Text style={styles.sTxt}>:{item.emoji?.shortcode}:</Text>
				</TouchableOpacity>
			)
		if (item.tag)
			return (
				<TouchableOpacity style={[styles.suggested]} onPress={() => sSelect(`#${item.tag?.name}`)}>
					<Text style={styles.sTxt}>#{item.tag?.name}</Text>
				</TouchableOpacity>
			)
		if (item.acct)
			return (
				<TouchableOpacity style={[styles.suggested]} onPress={() => sSelect(`@${item.acct?.acct}`)}>
					<Image source={{ uri: item.acct?.avatar }} style={styles.sImg} />
					<Text style={styles.sTxt}>@{item.acct?.acct}</Text>
				</TouchableOpacity>
			)
		return null
	}
	useEffect(() => {
		const textInputCurrent: any = textInput.current
		if (!isInSheet) setTimeout(() => textInputCurrent?.focus(), 500)
		if (isInSheet) textInputCurrent?.focus()
	}, [])
	useEffect(() => {
		const main = async () => {
			//setSuggestLoading(true)
			if (!client) return
			const data = await suggest(selection.start, text, acct.id, client)
			setSuggested(data[0])
			setDeleteTxt(data[1])
			//setSuggestLoading(false)
		}
		main()
	}, [selection])
	return (
		<View style={{ flexDirection: 'column', flexGrow: 1, flexShrink: 1 }}>
			<View style={{ flexDirection: 'row', marginBottom: 5, justifyContent: 'flex-end' }}>
				{uploaded.map((a) => (
					<TouchableOpacity activeOpacity={0.7} key={a.id} onPress={() => deleteItem(a.id)}>
						<Image source={{ uri: a.preview_url || a.url || '' }} style={{ width: 50, height: 50, borderRadius: 10, marginHorizontal: 2 }} />
					</TouchableOpacity>
				))}
				{Array.from({ length: uploading }).map((_, i) => (
					<View
						key={i.toString()}
						style={{ width: 50, height: 50, borderRadius: 10, marginHorizontal: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: PlatformColor('secondarySystemBackground') }}
					>
						<ActivityIndicator />
					</View>
				))}
			</View>
			{isCW && (
				<View style={styles.cwWrap}>
					<TextInputCustom
						isInSheet={isInSheet}
						value={cw}
						onChangeText={(t) => setCW(t)}
						multiline={false}
						style={[styles.cw]}
						placeholder={t('composer.cwPlaceholder')}
						placeholderTextColor={isDark ? 'lightgray' : 'gray'}
					/>
				</View>
			)}
			<TextInputCustom
				value={text}
				isInSheet={isInSheet}
				onChangeText={(t) => setText(t)}
				ref={textInput as any}
				multiline={true}
				style={[styles.textarea, { flexGrow: 1, flexShrink: 1, color: textColor }]}
				placeholder={t('composer.placeholder')}
				placeholderTextColor={isDark ? 'lightgray' : 'gray'}
				inputAccessoryViewID="textAreaSuggest"
				onSelectionChange={({ nativeEvent: { selection } }) => {
					setSelection(selection)
				}}
			/>
			<InputAccessoryView nativeID="textAreaSuggest">
				<GlassView style={{ display: suggested.length ? 'flex' : 'none', height: 40, width: width - 10, marginLeft: 5, borderRadius: 10, marginVertical: 5 }}>
					<FlatList
						data={suggested as any}
						horizontal={true}
						renderItem={({ item }: any) => renderSuggest(item)}
						keyExtractor={(s) => s.id || s.shortcode}
						style={{}}
						keyboardShouldPersistTaps="handled"
					/>
				</GlassView>
			</InputAccessoryView>
			<View style={{ display: 'flex', justifyContent: 'space-between', marginVertical: 5, paddingBottom: 0, flexDirection: 'row', gap: 2 }}>
				<IconButton style={{ width: 40, height: 40 }} width={40} isDark={isDark} systemImage="line.3.horizontal" onPress={() => changeMode('menu')} />
				<Button style={{ width: 40, height: 40 }} width={40} color={isCW ? getColorIOS('systemYellow') || undefined : undefined} isDark={isDark} onPress={() => setIsCW(!isCW)}>
					CW
				</Button>
				<IconButton style={{ width: 40, height: 40 }} width={40} isDark={isDark} systemImage="face.smiling" onPress={() => changeMode('emoji')} />
				<Dropdown data={data} onSelect={(title) => setVis(title as any)} modifiers={[ignoreSafeArea({ regions: 'all' })]}>
					<IconButton style={{ width: 40, height: 40 }} width={40} isDark={isDark} systemImage={data.find((d) => d.value === vis)?.systemImage || 'globe'} />
				</Dropdown>
				<IconButton style={{ width: 40, height: 40 }} width={40} isDark={isDark} systemImage="photo" onPress={() => uploadCallback(upload, uploadStatus, client)} />
				<Button style={{ width: 100, height: 40 }} width={100} isPrimary={true} isDark={isDark} color="teal" systemImage="square.and.pencil" onPress={() => post()}>
					{t('composer.post')}
				</Button>
			</View>
		</View>
	)
}
const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		textarea: {
			width: width - 40
		},
		acctContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingBottom: 10,
			height: 40
		},
		username: {
			fontSize: 16,
			marginLeft: 10
		},
		cwWrap: {
			marginBottom: 10,
			borderBottomWidth: 1,
			borderColor: PlatformColor('separator'),
			paddingBottom: 10
		},
		cw: {},
		suggested: {
			marginHorizontal: 5,
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center'
		},
		sImg: {
			width: 20,
			height: 20
		},
		sTxt: {
			marginLeft: 5
		}
	})
