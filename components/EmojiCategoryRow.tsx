import type { EmojiCategoryItem } from '@/utils/emojiCategories'
import type { Entity } from '@cutls/megalodon'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { Text } from './themed/Text'

export function EmojiCategoryRow({ item, renderEmoji }: { item: EmojiCategoryItem; renderEmoji: (emoji: Entity.Emoji) => ReactNode }) {
	const { t } = useTranslation()
	if (item.type === 'header') {
		return (
			<Text accessibilityRole="header" style={styles.heading}>
				{item.category ?? t('composer.emoji.uncategorized')}
			</Text>
		)
	}
	return (
		<View style={styles.row}>
			{item.emojis.map((emoji) => (
				<View key={emoji.shortcode}>{renderEmoji(emoji)}</View>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	heading: { fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
	row: { flexDirection: 'row' }
})
