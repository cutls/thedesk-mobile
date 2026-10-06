import type { Entity } from '@cutls/megalodon'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { Text } from './themed/Text'

interface Props {
	emojis: Entity.Emoji[]
	renderEmoji: (emoji: Entity.Emoji) => ReactNode
}

export function EmojiHistory({ emojis, renderEmoji }: Props) {
	const { t } = useTranslation()
	if (!emojis.length) return null
	return (
		<View style={styles.section}>
			<Text style={styles.title}>{t('composer.emoji.recent')}</Text>
			<View style={styles.grid}>
				{emojis.map((emoji) => (
					<View key={emoji.shortcode}>{renderEmoji(emoji)}</View>
				))}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	section: { paddingBottom: 12, marginBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#888888' },
	title: { fontWeight: 'bold', marginBottom: 8 },
	grid: { flexDirection: 'row', flexWrap: 'wrap' }
})
