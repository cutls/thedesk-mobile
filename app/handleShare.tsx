import Avatar from '@/components/Avatar'
import AcctSelector from '@/components/timeline/AcctSelector'
import { Button } from '@/components/ui/Button'
import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { getUsualAcct } from '@/utils/storage'
import { useRouter } from 'expo-router'
import { useIncomingShare } from 'expo-sharing'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, PlatformColor, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'

export default function ShareReceived() {
	const { resolvedSharedPayloads, isResolving } = useIncomingShare()
	const router = useRouter()
	const { t } = useTranslation()
	const [isOpened, setIsOpened] = useState(false)
	const [account, setAccount] = useState<Account>()
	const redirected = useRef(false)
	const canPost = !!account && !isResolving && resolvedSharedPayloads.length > 0
	const colorScheme = useColorScheme()
	const { width } = useWindowSize()
	const isDark = colorScheme === 'dark'
	const styles = createStyles({ width })
	const textColor = PlatformColor('label')

	const goToPost = () => {
		if (!account || !canPost || redirected.current) return

		const text = resolvedSharedPayloads
			.filter((payload) => payload.shareType === 'text' || payload.contentType === 'text' || payload.contentType === 'website')
			.map((payload) => payload.value)
			.join('\n')
		const images = resolvedSharedPayloads.flatMap((payload) => (payload.contentType === 'image' && payload.contentUri ? [payload.contentUri] : []))

		redirected.current = true
		router.replace({
			pathname: '/post',
			params: {
				acctId: account.id,
				addText: text ? encodeURIComponent(text) : undefined,
				addImage: images.length > 0 ? JSON.stringify(images) : undefined,
				fromShare: 'true'
			}
		})
	}
	const load = async () => {
		const acct = await getUsualAcct()
		setAccount(acct)
	}
	useEffect(() => {
		load()
	}, [])

	return (
		<View style={styles.container}>
			{isResolving && <ActivityIndicator size="large" />}
			<Pressable accessibilityRole="button" onPress={() => setIsOpened(true)} style={styles.accountSelector}>
				<Text style={styles.message}>{t('share.selectAccount')}</Text>
				{account && (
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
						<View>
							<Avatar src={account.avatar || account.favicon} color={account.color} fallback={account.sns} size={40} />
						</View>
						<View style={styles.infoContainer}>
							<Text style={[styles.username, { color: textColor }]} numberOfLines={1}>
								{account.username}
							</Text>
							<Text style={[styles.domain, { color: textColor }]} numberOfLines={1}>
								{account.domain}
							</Text>
						</View>
					</View>
				)}
			</Pressable>
			<Button onPress={() => goToPost()} isPrimary={true} disabled={!canPost} style={{ padding: 10 }} width={width - 20} isDark={isDark}>
				{t('share.goToPost')}
			</Button>
			<AcctSelector change={setAccount} isOpened={isOpened} setIsOpened={setIsOpened} />
		</View>
	)
}

const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		container: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			gap: 20,
			backgroundColor: PlatformColor('systemBackground')
		},
		accountSelector: {
			padding: 20,
			gap: 10
		},
		message: {
			color: PlatformColor('label'),
			textAlign: 'center'
		},
		infoContainer: {
			marginLeft: 10,
			maxWidth: width - 100
		},
		username: {
			fontSize: 16,
			fontWeight: '600'
		},
		domain: {
			fontSize: 14,
			marginTop: 2
		}
	})
