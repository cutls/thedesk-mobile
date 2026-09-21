import { Text } from '@/components/themed/Text'
import { Button } from '@/components/ui/Button'
import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { pushNotf } from '@/utils/push'
import { listAccts, saveAccts } from '@/utils/storage'
import { capitalizeFirst } from '@/utils/string'
import { staticStyles } from '@/utils/theme'
import generator, { type Entity, getData, type MegalodonInterface } from '@cutls/megalodon'
import { randomUUID } from 'expo-crypto'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, PlatformColor, ScrollView, StyleSheet, TextInput, useColorScheme, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import semver from 'semver'

const misskeyPremission = [
	'read:account',
	'write:account',
	'read:blocks',
	'write:blocks',
	'read:drive',
	'write:drive',
	'read:favorites',
	'write:favorites',
	'read:following',
	'write:following',
	'read:messaging',
	'write:messaging',
	'read:mutes',
	'write:mutes',
	'write:notes',
	'read:notifications',
	'write:notifications',
	'read:reactions',
	'write:reactions',
	'write:votes',
	'read:pages',
	'write:pages',
	'write:page-likes',
	'read:page-likes',
	'read:user-groups',
	'write:user-groups',
	'read:channels',
	'write:channels',
	'read:gallery',
	'write:gallery',
	'read:gallery-likes',
	'write:gallery-likes',
	'read:flash',
	'write:flash',
	'read:flash-likes',
	'write:flash-likes',
	'write:invite-codes',
	'read:invite-codes',
	'write:clip-favorite',
	'read:clip-favorite',
	'read:federation',
	'write:report-abuse'
]
interface GetData {
	url: string
	compatibleSns: 'mastodon' | 'pleroma' | 'misskey'
	softwareName: string
	version: string
	semanticVersionCompatibleNumber: string
}
const pushDomain = 'push.thedesk.top'
export default function Index() {
	const { t } = useTranslation()

	const { width, deviceWidth } = useWindowSize()
	const appIcon = require('../assets/images/icon.png')
	const mastodon = require('../assets/images/sns/mastodon.svg')
	const misskey = require('../assets/images/sns/misskey.png')
	const pleroma = require('../assets/images/sns/pleroma.svg')

	const router = useRouter()
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const [domain, setDomain] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [snsData, setSnsData] = useState<GetData | null>(null)
	const [instanceData, setInstanceData] = useState<Entity.Instance | null>(null)
	const domainWithProtocol = `https://${domain}`
	const preLogin = async () => {
		if (!domain) return
		setIsLoading(true)
		try {
			const snsData = await getData(domainWithProtocol)
			const { compatibleSns: sns } = snsData
			const client = generator(sns, domainWithProtocol)
			setClient(client)
			setSnsData(snsData)
			const { data: instanceData } = await client.getInstance()
			setInstanceData(instanceData)
		} catch (e: any) {
			Alert.alert(t('login.failed'), `Reason: ${e.message || e.toString()}`)
		} finally {
			setIsLoading(false)
		}
	}
	
	const login = async () => {
		if (!client || !snsData) return
		setIsLoading(true)
		try {
			const { compatibleSns: sns, semanticVersionCompatibleNumber } = snsData
			const isMisskey = sns === 'misskey'
			const scopes = isMisskey ? misskeyPremission : ['read', 'write', 'follow', 'push']
			const redirectUrl = Linking.createURL('login')
			const app = await client.registerApp('TheDesk(mobile)', { scopes, redirect_uris: redirectUrl, website: 'https://thedesk.top' })
			if (!app || !app.url) throw new Error('Cannot register app.')
			const a = await WebBrowser.openAuthSessionAsync(app.url)
			if (a.type === 'success') {
				const { queryParams } = Linking.parse(a.url)
				if (!queryParams) throw new Error('No available code found.')
				const { code } = queryParams
				const token = await client.fetchAccessToken(app.client_id, app.client_secret, code?.toString() || app.session_token || '', app.redirect_uri || '')
				const authrizedClient = generator(sns, domainWithProtocol, token.access_token)
				const { data: accountData } = await authrizedClient.verifyAccountCredentials()
				const { data: instanceData } = await authrizedClient.getInstance()
				const accounts = await listAccts()
				const id = randomUUID()
				const account: Account = {
					id,
					username: accountData.username,
					accountId: accountData.id,
					avatar: accountData.avatar,
					clientId: app.client_id,
					clientSecret: app.client_secret,
					accessToken: token.access_token,
					refreshToken: token.refresh_token || '',
					usual: false,
					color: null,
					avatarStatic: accountData.avatar_static,
					domain: domain,
					streamingUrl: instanceData.urls?.streaming_api || `wss://${domain}`,
					sns: sns,
					favicon: null,
					noStreaming: false,
					cannotSubscribe: sns === 'pleroma',
					emojiReactions: sns === 'misskey' || domain === 'fedibird.com',
					quoteSupport: sns === 'misskey' || domain === 'fedibird.com' || (sns === 'mastodon' && !semver.lt(semanticVersionCompatibleNumber, '4.5.0'))
				}
				// Push Notification
				const pushNotification = await pushNotf(account, pushDomain, t)
				// end
				accounts.push(pushNotification ? {...account, pushNotification } : account)
				await saveAccts(accounts)
				router.replace('/')
			} else {
				throw new Error('User cancelled login.')
			}
		} catch (e: any) {
			Alert.alert(t('login.failed'), `Reason: ${e.message || e.toString()}`)
		} finally {
			setIsLoading(false)
		}
	}
	const changeDomain = (text: string) => {
		setDomain(text)
		setClient(null)
		setSnsData(null)
		setInstanceData(null)
	}

	const localImage = snsData?.compatibleSns === 'mastodon' ? mastodon : snsData?.compatibleSns === 'misskey' ? misskey : snsData?.compatibleSns === 'pleroma' ? pleroma : appIcon
	const padding = (deviceWidth - width) / 2 + 20
	return (
		<KeyboardAvoidingView style={[styles.container, { paddingHorizontal: padding }]}>
			<TextInput
				value={domain}
				onChangeText={(t) => changeDomain(t)}
				style={[staticStyles.input, { width: '100%', borderRadius: 20, color: isDark ? 'white' : 'black' }]}
				placeholder="mastodon.social"
				placeholderTextColor={isDark ? 'lightgray' : 'gray'}
				readOnly={isLoading}
			/>
			{client ? (
				isLoading ? (
					<View style={{ marginTop: 20 }}>
						<ActivityIndicator />
					</View>
				) : (
					<View style={{ width: '100%' }}>
						<Button color="teal" isPrimary={true} style={{ width: width - 40, height: 45, ...styles.link }} onPress={() => login()} width={width} isDark={isDark}>
							{t('continue')}
						</Button>
						<ScrollView>
							<View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
								<Image
									source={instanceData?.thumbnail ? { uri: instanceData?.thumbnail || '' } : localImage}
									placeholder={localImage}
									style={{ width: 100, height: 50, borderRadius: 10 }}
									contentFit="contain"
								/>
								<Text style={{ fontWeight: 'bold', fontSize: 20, marginLeft: 10 }}>{instanceData?.title}</Text>
							</View>
							<View style={styles.row}>
								<Text style={styles.title}>{t('login.instance.sns')}</Text>
								<Text style={styles.text}>{capitalizeFirst(snsData?.softwareName || '')}</Text>
							</View>
							<View style={styles.row}>
								<Text style={styles.title}>{t('login.instance.engine')}</Text>
								<Text style={styles.text}>{capitalizeFirst(snsData?.compatibleSns || '')}</Text>
							</View>
							<View style={styles.row}>
								<Text style={styles.title}>{t('login.instance.version')}</Text>
								<Text style={styles.text}>{instanceData?.version}</Text>
							</View>
							{/* <Text style={[styles.title, { marginTop: 10, marginBottom: 5 }]}>{t('login.instance.description')}</Text>
							<RenderSimpleHTML text={instanceData?.description || ''} txtColor={isDark ? 'white' : 'black'} />
							{instanceData?.rules && instanceData.rules.length > 0 && <Text style={[styles.title, { marginTop: 10 }]}>{t('login.instance.rules')}</Text>}
							{(instanceData?.rules || [])
								.sort((a, b) => (a.id > b.id ? 1 : -1))
								.map((rule) => (
									<View key={rule.id} style={[styles.row, { justifyContent: 'flex-start' }]}>
										<Text style={[styles.title, { marginBottom: 5, marginRight: 5 }]}>{rule.hint || rule.id}</Text>
										<Text style={{ flexShrink: 1 }}>{rule.text}</Text>
									</View>
								))} */}
							{snsData?.compatibleSns === 'misskey' && (
								<View style={{ borderWidth: 2, borderColor: PlatformColor('systemRed'), padding: 5, borderRadius: 10, marginTop: 10 }}>
									<Text style={[]}>{t('login.instance.misskey')}</Text>
								</View>
							)}
							{snsData?.compatibleSns === 'misskey' && domain !== 'misskey.io' && (
								<View style={{ borderWidth: 2, borderColor: PlatformColor('systemRed'), padding: 5, borderRadius: 10, marginTop: 10 }}>
									<Text style={[]}>{t('login.instance.misskey_io')}</Text>
								</View>
							)}
						</ScrollView>
					</View>
				)
			) : (
				<Button isLoading={isLoading} color="teal" isPrimary={true} style={{ width: width - 40, height: 45, ...styles.link }} onPress={() => preLogin()} width={width} isDark={isDark}>
					{t('screen.login')}
				</Button>
			)}
		</KeyboardAvoidingView>
	)
}
const styles = StyleSheet.create({
	container: {
		flex: 0,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20
	},
	link: {
		marginTop: 15,
		paddingVertical: 0
	},
	row: {
		flexDirection: 'row',
		marginTop: 10,
		justifyContent: 'space-between',
		width: '100%'
	},
	title: {
		fontWeight: 'bold',
		fontSize: 16
	},
	text: {}
})
