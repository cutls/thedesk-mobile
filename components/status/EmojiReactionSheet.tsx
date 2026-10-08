import { EmojiHistory } from '@/components/EmojiHistory'
import { useEmojiHistory } from '@/hooks/useEmojiHistory'
import { useWindowSize } from '@/hooks/useWindowSize'
import { isSingleEmoji } from '@/utils/isSingleEmoji'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { GlassView } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, PlatformColor, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '../themed/Text'

export interface EmojiReactionSheetProps {
	acctId: string
	client: MegalodonInterface
	statusId: string
	showGif: boolean
	updateStatus: (status: Entity.Status) => void
	close: () => void
}
const contentPadding = 20
const GlassViewCustom = (props: React.ComponentProps<typeof GlassView>) => <GlassView {...props} style={[props.style, { borderRadius: 20, marginBottom: 5 }]} />
export default function EmojiReactionSheet({ acctId, client, statusId, showGif, updateStatus, close }: EmojiReactionSheetProps) {
	const { width, deviceWidth } = useWindowSize()
	const insets = useSafeAreaInsets()
	const { t } = useTranslation()
	const sheetRef = useRef<BottomSheet>(null)
	const pending = useRef(false)
	const [emojis, setEmojis] = useState<Entity.Emoji[]>([])
	const { recentEmojis, recordEmoji } = useEmojiHistory(acctId, emojis)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [attempt, setAttempt] = useState(0)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [emojiInput, setEmojiInput] = useState('')
	const isNativeEmoji = isSingleEmoji(emojiInput)
	const canSubmitEmoji = isNativeEmoji && !isSubmitting
	const searchQuery = isNativeEmoji
		? ''
		: emojiInput
				.trim()
				.replace(/^:+|:+$/g, '')
				.toLowerCase()
	const filteredEmojis = useMemo(() => emojis.filter((emoji) => emoji.shortcode.toLowerCase().includes(searchQuery)), [emojis, searchQuery])
	const contentWidth = width - contentPadding * 2
	const columns = Math.max(1, Math.min(8, Math.floor(contentWidth / 44)))
	const cellSize = contentWidth / columns

	useEffect(() => {
		let active = true
		setEmojis([])
		setIsLoading(true)
		setHasError(false)
		client.getInstanceCustomEmojis().then(
			(response) => {
				if (!active) return
				setEmojis(response.data.filter((emoji) => emoji.visible_in_picker))
				setIsLoading(false)
			},
			() => {
				if (!active) return
				setHasError(true)
				setIsLoading(false)
			}
		)
		return () => {
			active = false
		}
	}, [client, acctId, attempt])

	const react = async (shortcode: string, custom = true) => {
		if (pending.current) return
		pending.current = true
		setIsSubmitting(true)
		try {
			const response = await client.createEmojiReaction(statusId, shortcode)
			if (custom) recordEmoji(shortcode)
			updateStatus(response.data.reblog || response.data)
			void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
			Keyboard.dismiss()
			sheetRef.current?.close()
		} catch {
			Alert.alert(t('timeline.actions.emojiReaction'), t('timeline.reaction.submitError'))
			pending.current = false
			setIsSubmitting(false)
		}
	}

	const submitEmoji = (value: string) => {
		if (isSingleEmoji(value)) void react(value, false)
	}

	const renderEmoji = (item: Entity.Emoji) => (
		<TouchableOpacity
			accessibilityRole="button"
			accessibilityLabel={`:${item.shortcode}:`}
			accessibilityState={{ disabled: isSubmitting }}
			disabled={isSubmitting}
			activeOpacity={0.7}
			onPress={() => react(item.shortcode)}
			style={{ width: cellSize, height: cellSize, padding: 5, opacity: isSubmitting ? 0.5 : 1 }}
		>
			<Image source={{ uri: showGif ? item.url : item.static_url || item.url }} style={styles.image} contentFit="contain" autoplay={showGif} />
		</TouchableOpacity>
	)

	return (
		<Modal transparent animationType="none" onRequestClose={() => sheetRef.current?.close()}>
			<GestureHandlerRootView style={styles.root}>
				<KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
					<View style={styles.root}>
						<BottomSheet
							ref={sheetRef}
							index={0}
							snapPoints={['60%', '90%']}
							enableDynamicSizing={false}
							enablePanDownToClose
							topInset={insets.top}
							onClose={close}
							backgroundComponent={GlassViewCustom}
							style={{ marginHorizontal: (deviceWidth - width) / 2 }}
							backgroundStyle={styles.background}
							handleIndicatorStyle={styles.handle}
							backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />}
						>
							<View style={styles.header}>
								<Text style={styles.title}>{t('timeline.actions.emojiReaction')}</Text>
								{isSubmitting && <ActivityIndicator />}
								<TouchableOpacity accessibilityRole="button" onPress={() => sheetRef.current?.close()} style={styles.close}>
									<Text>{t('composer.emoji.close')}</Text>
								</TouchableOpacity>
							</View>
							<View style={styles.nativeEmoji}>
								<Text>{t('timeline.reaction.nativeEmoji')}</Text>
								<View style={styles.inputRow}>
									<TextInput
										style={styles.input}
										accessibilityLabel={t('timeline.reaction.nativeEmoji')}
										placeholder={t('timeline.reaction.emojiPlaceholder')}
										placeholderTextColor={PlatformColor('placeholderText')}
										value={emojiInput}
										// Preserve the IME draft; maxLength and filtering would break conversion and joined emoji.
										onChangeText={setEmojiInput}
										editable={!isSubmitting}
										autoCapitalize="none"
										returnKeyType="done"
										onSubmitEditing={(event) => submitEmoji(event.nativeEvent.text)}
									/>
									<TouchableOpacity
										style={[styles.submit, { opacity: canSubmitEmoji ? 1 : 0.4 }]}
										accessibilityRole="button"
										accessibilityState={{ disabled: !canSubmitEmoji }}
										disabled={!canSubmitEmoji}
										onPress={() => submitEmoji(emojiInput)}
									>
										<Text>{t('timeline.reaction.add')}</Text>
									</TouchableOpacity>
								</View>
								<Text style={styles.hint}>{t('timeline.reaction.singleEmojiHint')}</Text>
							</View>
							<Text style={{ marginLeft: 20 }}>{t('timeline.reaction.customEmoji')}</Text>
							<BottomSheetFlatList
								key={columns}
								data={isLoading || hasError ? [] : filteredEmojis}
								numColumns={columns}
								keyboardShouldPersistTaps="handled"
								keyboardDismissMode="on-drag"
								keyExtractor={(item: Entity.Emoji) => item.shortcode}
								contentContainerStyle={{ backgroundColor: 'transparent', paddingHorizontal: contentPadding, paddingTop: 10, paddingBottom: insets.bottom + 20 }}
								style={{ backgroundColor: 'transparent', zIndex: 5 }}
								ListEmptyComponent={
									<View style={styles.empty}>
										{isLoading ? (
											<ActivityIndicator />
										) : hasError ? (
											<>
												<Text>{t('timeline.reaction.loadError')}</Text>
												<TouchableOpacity accessibilityRole="button" style={styles.close} onPress={() => setAttempt((value) => value + 1)}>
													<Text>{t('timeline.reaction.retry')}</Text>
												</TouchableOpacity>
											</>
										) : (
											<Text>{t('composer.emoji.empty')}</Text>
										)}
									</View>
								}
								ListHeaderComponent={!isLoading && !hasError && !searchQuery ? <EmojiHistory emojis={recentEmojis} renderEmoji={renderEmoji} /> : undefined}
								renderItem={({ item }: { item: Entity.Emoji }) => renderEmoji(item)}
							/>
						</BottomSheet>
					</View>
				</KeyboardAvoidingView>
			</GestureHandlerRootView>
		</Modal>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	nativeEmoji: { paddingHorizontal: contentPadding, paddingBottom: 12, gap: 6 },
	inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	input: {
		flex: 1,
		minHeight: 44,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: PlatformColor('secondarySystemBackground'),
		color: PlatformColor('label'),
		fontSize: 20
	},
	submit: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8, backgroundColor: PlatformColor('systemGray4') },
	hint: { fontSize: 12, color: PlatformColor('secondaryLabel') },
	background: { backgroundColor: 'transparent' },
	handle: { backgroundColor: PlatformColor('secondaryLabel') },
	header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: contentPadding, gap: 10 },
	title: { flex: 1, fontSize: 18, fontWeight: 'bold' },
	close: { padding: 12, minHeight: 44, justifyContent: 'center' },
	empty: { paddingVertical: 40, alignItems: 'center', gap: 12 },
	image: { width: '100%', height: '100%' }
})
