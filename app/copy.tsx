import { Button } from '@/components/ui/Button'
import { useWindowSize } from '@/hooks/useWindowSize'
import { getAcctById } from '@/utils/storage'
import { stripTags } from '@/utils/string'
import generator from '@cutls/megalodon'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, PlatformColor, ScrollView, TextInput, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Index() {
	const { t } = useTranslation()
	const params = useLocalSearchParams()
	const { acctId, statusId } = params as Record<'acctId' | 'statusId', string>
	
	const { width, deviceWidth } = useWindowSize()
	const padding = (deviceWidth - width) / 2 + 10
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const [isLoading, setIsLoading] = useState(false)
	const [text, setText] = useState<string | null>(null)
	const textArea = useRef<TextInput>(null)
	useEffect(() => {
		const fn = async () => {
			setIsLoading(true)
			try {
				const acct = await getAcctById(acctId)
				if (!acct) throw new Error('Invalid account id')
				const https = `https://${acct.domain}`
				const client = generator(acct.sns, https, acct.accessToken)
				const d = await client.getStatus(statusId)
				const raw = d.data.content
				const br = raw.replace(/<br\s*\/?>/g, '\n').replace(/<\/?p>/g, '\n').replace(/^\n/, '').replace(/\n$/, '')
				const txt = stripTags(br)
				setText(txt)
				setTimeout(() => {
					const textAreaCurrent: any = textArea.current
					textAreaCurrent?.focus()
					textAreaCurrent?.setSelection(0, txt.length)
				}, 100)
			} finally {
				setIsLoading(false)
			}
		}
		fn()
	}, [acctId, statusId])
	const copy = async () => {
		if (!text) return
		const textAreaCurrent: any = textArea.current
		textAreaCurrent?.focus()
		textAreaCurrent?.setSelection(0, text.length)
		await Clipboard.setStringAsync(text)
		Alert.alert(t('timeline.action.copied'))
	}
	if (isLoading || !text) {
		return (
			<SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<ActivityIndicator />
			</SafeAreaView>
		)
	}
	return (
		<ScrollView style={{ paddingHorizontal: padding }}>
			<TextInput ref={textArea as any} value={text || ''} editable={false} multiline={true} style={{ color: textColor}} />
			<Button onPress={() => copy()} style={{ margin: 10, height: 50 }} systemImage="doc.on.doc" width={width - 20} isDark={isDark}>
				{t('timeline.action.copyText')}
			</Button>
		</ScrollView>
	)
}
