import { emojify } from '@/utils/emojify'
import type { Entity } from '@cutls/megalodon'
import { openBrowserAsync } from 'expo-web-browser'
import React from 'react'
import { PlatformColor } from 'react-native'
import HTML, { defaultHTMLElementModels, HTMLContentModel } from 'react-native-render-html'
interface RenderHTMLProps {
	status: Entity.Status
	fontSize: number
	showGif: boolean
	txtColor: string
	columnWidth: number
	left: number
	handleLink: (url: string) => void
}

const renderers = {
	img: defaultHTMLElementModels.img.extend({
		contentModel: HTMLContentModel.mixed
	})
}
export const RenderHTML = React.memo(({ status, fontSize, showGif, txtColor, columnWidth, left, handleLink }: RenderHTMLProps) => (
	<HTML
		source={{ html: `${emojify(status.content, status.emojis, fontSize * 0.8, showGif)}` }}
		tagsStyles={{ p: { color: txtColor, marginBottom: 15 }, a: { color: PlatformColor('link') } }}
		customHTMLElementModels={renderers}
		contentWidth={columnWidth - left}
		classesStyles={{
			invisible: { color: PlatformColor('link') },
			ellipsis: { color: PlatformColor('link') },
			'quote-inline': { display: 'none' },
			mention: { color: PlatformColor('link') },
			hashtag: { color: PlatformColor('link') }
		}}
		baseStyle={{ color: txtColor, fontSize: fontSize }}
		defaultViewProps={{ style: { width: columnWidth - left } }}
		renderersProps={{ a: { onPress: (e, href) => handleLink(href) } }}
	/>
))

export const RenderSimpleHTML = React.memo(({ text, txtColor }: { text: string; txtColor: string }) => (
	<HTML
		source={{ html: text }}
		tagsStyles={{ p: { color: txtColor }, a: { color: PlatformColor('link') } }}
		customHTMLElementModels={renderers}
		classesStyles={{
			invisible: { color: PlatformColor('link') },
			ellipsis: { color: PlatformColor('link') },
			'quote-inline': { display: 'none' },
			mention: { color: PlatformColor('link') },
			hashtag: { color: PlatformColor('link') }
		}}
		baseStyle={{ color: txtColor }}
		renderersProps={{ a: { onPress: (e, href) => openBrowserAsync(href) } }}
	/>
))
