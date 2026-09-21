import { RenderSimpleHTML } from '@/components/status/HTML'
import { Text } from '@/components/themed/Text'
import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { pushNotf } from '@/utils/push'
import { listAccts, saveAccts } from '@/utils/storage'
import { capitalizeFirst } from '@/utils/string'
import generator, { type Entity, getData, type MegalodonInterface } from '@cutls/megalodon'
import { useHeaderHeight } from '@react-navigation/elements'
import { randomUUID } from 'expo-crypto'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, useColorScheme, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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

	const { width } = useWindowSize()
	const insets = useSafeAreaInsets()
	const headerHeight = useHeaderHeight()
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
		if (!domain.trim() || isLoading) return
		Keyboard.dismiss()
		setIsLoading(true)
		try {
			const snsData = await getData(domainWithProtocol)
			const { compatibleSns: sns } = snsData
			const client = generator(sns, domainWithProtocol)
			const { data: instanceData } = await client.getInstance()
			setClient(client)
			setSnsData(snsData)
			setInstanceData(instanceData)
		} catch (e: any) {
			Alert.alert(t('login.failed'), `Reason: ${e.message || e.toString()}`)
		} finally {
			setIsLoading(false)
		}
	}

	const login = async () => {
		if (!client || !snsData || isLoading) return
		Keyboard.dismiss()
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
				accounts.push(pushNotification ? { ...account, pushNotification } : account)
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
	const textColor = isDark ? '#F2F7F7' : '#172B30'
	const mutedColor = isDark ? '#A1B7BA' : '#526C70'
	const accentColor = isDark ? '#70DDD0' : '#007D73'
	const glassFallback = isLiquidGlassAvailable() ? undefined : { backgroundColor: isDark ? '#203438' : '#FFFFFF' }
	const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(23,43,48,0.1)'
	const actionLabel = client ? t('continue') : t('screen.login')
	const actionDisabled = isLoading || !domain.trim()
	const image = instanceData?.thumbnail ? { uri: instanceData.thumbnail } : null
	return (
		<KeyboardAvoidingView
			behavior="padding"
			keyboardVerticalOffset={headerHeight}
			style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}
		>
			<View pointerEvents="none" style={StyleSheet.absoluteFill}>
				<Image source={image} style={[styles.glow, { display: image ? 'flex' : 'none' }]} contentFit="cover" />
			</View>
			<View style={{ height: headerHeight }} />
			<View style={[styles.content, { maxWidth: width }, !!instanceData && styles.expanded]}>
				<View style={styles.form}>
					<GlassView style={[styles.addressField, glassFallback]} glassEffectStyle="regular">
						{snsData ? (
							<Image source={localImage} style={styles.snsIcon} contentFit="contain" />
						) : (
							<SymbolView name="globe" type="monochrome" tintColor={accentColor} size={22} />
						)}
						<TextInput
							value={domain}
							onChangeText={changeDomain}
							style={[styles.input, { color: textColor }]}
							placeholder="mastodon.social"
							placeholderTextColor={mutedColor}
							accessibilityLabel={t('login.domain')}
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="url"
							returnKeyType="go"
							onSubmitEditing={client ? login : preLogin}
							readOnly={isLoading}
						/>
					</GlassView>
					<Pressable
						onPress={client ? login : preLogin}
						disabled={actionDisabled}
						accessibilityRole="button"
						accessibilityLabel={actionLabel}
						accessibilityState={{ disabled: actionDisabled, busy: isLoading }}
						style={({ pressed }) => [styles.action, actionDisabled && !isLoading && styles.disabled, pressed && styles.pressed]}
					>
						<GlassView style={[styles.actionGlass, !isLiquidGlassAvailable() && styles.actionFallback]} tintColor="#007D73" isInteractive={!actionDisabled} glassEffectStyle="regular">
							<Text style={styles.actionText}>{actionLabel}</Text>
							{isLoading ? <ActivityIndicator color="white" size="small" /> : <SymbolView name="arrow.right" type="monochrome" tintColor="white" size={19} />}
						</GlassView>
					</Pressable>
				</View>
				{instanceData && (
					<GlassView style={[styles.instanceCard, glassFallback]} glassEffectStyle="regular">
						<ScrollView style={styles.scroll} contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
							<View style={styles.instanceHeader}>
								<Image source={instanceData.thumbnail ? { uri: instanceData.thumbnail } : localImage} placeholder={localImage} style={styles.thumbnail} contentFit="contain" />
								<Text accessibilityRole="header" style={[styles.instanceTitle, { color: textColor }]}>
									{instanceData.title}
								</Text>
							</View>
							<View style={[styles.metadata, { borderColor: dividerColor }]}>
								{[
									{ icon: 'network' as const, label: t('login.instance.sns'), value: capitalizeFirst(snsData?.softwareName || '') },
									{ icon: 'server.rack' as const, label: t('login.instance.engine'), value: capitalizeFirst(snsData?.compatibleSns || '') },
									{ icon: 'number' as const, label: t('login.instance.version'), value: instanceData.version }
								].map(({ icon, label, value }) => (
									<View key={icon} style={styles.metadataRow}>
										<View style={styles.label}>
											<SymbolView name={icon} type="monochrome" tintColor={mutedColor} size={17} />
											<Text style={[styles.metadataLabel, { color: mutedColor }]}>{label}</Text>
										</View>
										<Text selectable style={[styles.metadataValue, { color: textColor }]}>
											{value}
										</Text>
									</View>
								))}
							</View>
							{!!instanceData.description && (
								<View style={styles.section}>
									<View style={styles.sectionHeading}>
										<SymbolView name="text.alignleft" type="monochrome" tintColor={accentColor} size={19} />
										<Text accessibilityRole="header" style={styles.sectionTitle}>
											{t('login.instance.description')}
										</Text>
									</View>
									<RenderSimpleHTML text={instanceData.description} txtColor={textColor} />
								</View>
							)}
							{!!instanceData.rules?.length && (
								<View style={styles.section}>
									<View style={styles.sectionHeading}>
										<SymbolView name="checklist" type="monochrome" tintColor={accentColor} size={19} />
										<Text accessibilityRole="header" style={styles.sectionTitle}>
											{t('login.instance.rules')}
										</Text>
									</View>
									{[...instanceData.rules]
										.sort((a, b) => (a.id > b.id ? 1 : -1))
										.map((rule) => (
											<View key={rule.id} style={[styles.rule, { borderColor: dividerColor }]}>
												<Text style={[styles.ruleHint, { color: accentColor }]}>{rule.hint || rule.id}</Text>
												<Text style={[styles.ruleText, { color: textColor }]}>{rule.text}</Text>
											</View>
										))}
								</View>
							)}
							{snsData?.compatibleSns === 'misskey' && (
								<View style={[styles.notice, { backgroundColor: isDark ? 'rgba(255,159,10,0.12)' : 'rgba(180,100,0,0.08)' }]}>
									<SymbolView name="exclamationmark.shield" type="monochrome" tintColor={isDark ? '#FFCC80' : '#8A5100'} size={20} />
									<View style={styles.noticeContent}>
										<Text style={styles.ruleText}>{t('login.instance.misskey')}</Text>
										{domain !== 'misskey.io' && <Text style={styles.ruleText}>{t('login.instance.misskey_io')}</Text>}
									</View>
								</View>
							)}
						</ScrollView>
					</GlassView>
				)}
			</View>
		</KeyboardAvoidingView>
	)
}
const styles = StyleSheet.create({
	container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 20, overflow: 'hidden' },
	content: { alignSelf: 'stretch', alignItems: 'stretch', width: '100%', marginHorizontal: 'auto', paddingHorizontal: 20, gap: 20 },
	expanded: { flex: 1, minHeight: 0 },
	glow: { position: 'absolute', width: '100%', height: '100%', opacity: 0.7 },
	glowTop: { top: -80, right: -100 },
	glowBottom: { bottom: -100, left: -140 },
	appBadge: { alignSelf: 'center', padding: 14, borderRadius: 30, marginBottom: 12 },
	appIcon: { width: 64, height: 64, borderRadius: 18 },
	form: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
	addressField: { flexGrow: 1, flexShrink: 1, flexBasis: 230, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, borderRadius: 28 },
	input: { flex: 1, minWidth: 0, fontSize: 17, paddingVertical: 16 },
	snsIcon: { width: 22, height: 22 },
	action: { flexShrink: 1, borderRadius: 28 },
	actionGlass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 28 },
	actionFallback: { backgroundColor: '#007D73' },
	actionText: { color: 'white', fontSize: 16, fontWeight: '600', flexShrink: 1 },
	disabled: { opacity: 0.45 },
	pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
	instanceCard: { flex: 1, minHeight: 0, borderRadius: 28, overflow: 'hidden' },
	scroll: { flex: 1 },
	cardContent: { padding: 22, gap: 24 },
	instanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
	thumbnail: { width: 72, height: 64, borderRadius: 16 },
	instanceTitle: { flex: 1, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
	metadata: { gap: 16, paddingVertical: 20, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
	metadataRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 16, rowGap: 6 },
	label: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
	metadataLabel: { fontSize: 14, flexShrink: 1 },
	metadataValue: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
	section: { gap: 12 },
	sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	sectionTitle: { fontWeight: '600', fontSize: 17, flexShrink: 1 },
	rule: { gap: 6, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
	ruleHint: { fontSize: 14, fontWeight: '600' },
	ruleText: { fontSize: 14, lineHeight: 21 },
	notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: 18 },
	noticeContent: { flex: 1, gap: 10 }
})
