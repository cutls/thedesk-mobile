import { EmojiHistory } from '@/components/EmojiHistory'
import { useEmojiHistory } from '@/hooks/useEmojiHistory'
import { useWindowSize } from '@/hooks/useWindowSize'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, PlatformColor, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
import { Text } from '../themed/Text'
import { Button } from '../ui/Button'

interface Props {
	acctId: string | null
	client: MegalodonInterface | null
	add: (id: string) => void
}
const column = 8
const margin = 2
export default function Emoji({ client, acctId, add }: Props) {
	const { width } = useWindowSize()
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const styles = createStyles()
	const perWidth = (width - 100 - column * margin - margin) / column
	const { t } = useTranslation()
	const [emoji, setEmoji] = useState<Entity.Emoji[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [searchInput, setSearchInput] = useState('')
	const searchQuery = searchInput
		.trim()
		.replace(/^:+|:+$/g, '')
		.toLowerCase()
	const filteredEmoji = useMemo(() => emoji.filter((item) => item.shortcode.toLowerCase().includes(searchQuery)), [emoji, searchQuery])
	const { recentEmojis, recordEmoji } = useEmojiHistory(acctId, emoji)
	useEffect(() => {
		let active = true
		setEmoji([])
		const fn = async () => {
			setIsLoading(true)
			try {
				if (!client) return
				const emojis = await client.getInstanceCustomEmojis()
				if (active) setEmoji(emojis.data)
			} catch (e) {
				console.log(e)
			} finally {
				if (active) setIsLoading(false)
			}
		}
		void fn()
		return () => {
			active = false
		}
	}, [client, acctId])
	const renderEmoji = (item: Entity.Emoji) => (
		<TouchableOpacity
			accessibilityRole="button"
			accessibilityLabel={`:${item.shortcode}:`}
			activeOpacity={0.7}
			onPress={() => {
				add(item.shortcode)
				recordEmoji(item.shortcode)
			}}
			style={{ width: perWidth, height: perWidth }}
		>
			<Image source={{ uri: item.url }} style={{ width: perWidth, height: perWidth, margin }} contentFit="contain" />
		</TouchableOpacity>
	)

	return (
		<View style={styles.wrap}>
			<BottomSheetTextInput
				style={styles.search}
				value={searchInput}
				onChangeText={setSearchInput}
				placeholder={t('composer.emoji.search')}
				accessibilityLabel={t('composer.emoji.search')}
				placeholderTextColor={PlatformColor('placeholderText')}
				autoCapitalize="none"
				autoCorrect={false}
				returnKeyType="search"
				clearButtonMode="while-editing"
			/>
			{isLoading ? (
				<View style={styles.container}>
					<ActivityIndicator />
				</View>
			) : (
				<FlashList
					data={filteredEmoji}
					numColumns={column}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
					keyExtractor={(item) => item.shortcode}
					ListEmptyComponent={
						<View style={styles.container}>
							<Text>{t('composer.emoji.empty')}</Text>
						</View>
					}
					ListHeaderComponent={!searchQuery ? <EmojiHistory emojis={recentEmojis} renderEmoji={renderEmoji} /> : undefined}
					renderItem={({ item }) => renderEmoji(item)}
					style={{ height: 250 }}
				/>
			)}
			<Button onPress={() => add('')} style={{ width: width - 40, height: 50, marginTop: 10 }} width={width - 40} isDark={isDark}>
				{t('composer.emoji.close')}
			</Button>
		</View>
	)
}
const createStyles = () =>
	StyleSheet.create({
		search: {
			minHeight: 44,
			paddingHorizontal: 12,
			paddingVertical: 8,
			marginBottom: 10,
			borderRadius: 8,
			backgroundColor: PlatformColor('secondarySystemBackground'),
			color: PlatformColor('label'),
			fontSize: 16
		},
		wrap: {
			flexDirection: 'column',
			justifyContent: 'space-around'
		},
		container: {
			width: '100%',
			height: 250,
			alignItems: 'center',
			justifyContent: 'center'
		}
	})
