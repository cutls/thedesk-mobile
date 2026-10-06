import { useWindowSize } from '@/hooks/useWindowSize'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Modal, PlatformColor, StyleSheet, TouchableOpacity, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '../themed/Text'

export interface EmojiReactionSheetProps {
	client: MegalodonInterface
	statusId: string
	showGif: boolean
	updateStatus: (status: Entity.Status) => void
	close: () => void
}

export default function EmojiReactionSheet({ client, statusId, showGif, updateStatus, close }: EmojiReactionSheetProps) {
	const { width, deviceWidth } = useWindowSize()
	const insets = useSafeAreaInsets()
	const { t } = useTranslation()
	const sheetRef = useRef<BottomSheet>(null)
	const pending = useRef(false)
	const [emojis, setEmojis] = useState<Entity.Emoji[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [attempt, setAttempt] = useState(0)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const columns = Math.max(1, Math.min(8, Math.floor((width - 40) / 44)))
	const cellSize = (width - 40) / columns

	useEffect(() => {
		let active = true
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
	}, [client, attempt])

	const react = async (shortcode: string) => {
		if (pending.current) return
		pending.current = true
		setIsSubmitting(true)
		try {
			const response = await client.createEmojiReaction(statusId, shortcode)
			updateStatus(response.data.reblog || response.data)
			void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
			sheetRef.current?.close()
		} catch {
			Alert.alert(t('timeline.actions.emojiReaction'), t('timeline.reaction.submitError'))
			pending.current = false
			setIsSubmitting(false)
		}
	}

	return (
		<Modal transparent animationType="none" onRequestClose={() => sheetRef.current?.close()}>
			<GestureHandlerRootView style={styles.root}>
				<BottomSheet
					ref={sheetRef}
					index={0}
					snapPoints={['60%', '90%']}
					enableDynamicSizing={false}
					enablePanDownToClose
					topInset={insets.top}
					onClose={close}
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
					<BottomSheetFlatList
						key={columns}
						data={isLoading || hasError ? [] : emojis}
						numColumns={columns}
						keyExtractor={(item: Entity.Emoji) => item.shortcode}
						contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
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
						renderItem={({ item }: { item: Entity.Emoji }) => (
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
						)}
					/>
				</BottomSheet>
			</GestureHandlerRootView>
		</Modal>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	background: { backgroundColor: PlatformColor('systemBackground') },
	handle: { backgroundColor: PlatformColor('secondaryLabel') },
	header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10 },
	title: { flex: 1, fontSize: 18, fontWeight: 'bold' },
	close: { padding: 12, minHeight: 44, justifyContent: 'center' },
	empty: { paddingVertical: 40, alignItems: 'center', gap: 12 },
	image: { width: '100%', height: '100%' }
})
