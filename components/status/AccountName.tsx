import { emojify } from '@/utils/emojify'
import type { Entity } from '@cutls/megalodon'
import React from 'react'
import { PlatformColor, useColorScheme } from 'react-native'
import HTML, { defaultHTMLElementModels, HTMLContentModel } from 'react-native-render-html'
import { Text } from '../themed/Text'
const renderers = {
	img: defaultHTMLElementModels.img.extend({
		contentModel: HTMLContentModel.mixed
	})
}
interface FromTootToAcctName {
	account: Entity.Account
	fontSize?: number
	showWithoutEllipsis?: boolean
	width: number
	color?: string
}
export const AccountName = React.memo((props: FromTootToAcctName) => {
	const { account, showWithoutEllipsis, width, fontSize = 20 } = props
	const textProps = showWithoutEllipsis ? {} : { numberOfLines: 1 }
	const theme = useColorScheme()
	const isDark = theme === 'dark'
	const txtColor = props.color || (isDark ? 'white' : 'black')
	const tagStyle = { a: { color: PlatformColor('link') }, p: { color: txtColor } } as const
	const showGif = true
	return account.display_name ? (
		<HTML
			source={{ html: `${emojify(account.display_name, account.emojis, fontSize * 0.8, showGif)}` }}
			tagsStyles={tagStyle}
			customHTMLElementModels={renderers}
			contentWidth={width}
			defaultTextProps={{ style: { fontSize: fontSize, fontWeight: 'bold' }, numberOfLines: 1 }}
			defaultViewProps={{ style: { width } }}
			baseStyle={{ color: txtColor, fontSize: fontSize }}

		/>
	) : (
		<Text style={{ fontWeight: 'bold', fontSize }}>{account.username}</Text>
	)
})
