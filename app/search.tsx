import Avatar from '@/components/Avatar'
import { Status } from '@/components/status/Status'
import { Text } from '@/components/themed/Text'
import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { getTrendActivity } from '@/utils/searchTrends'
import { getAcctById, listAccts } from '@/utils/storage'
import { useConfigStore } from '@/utils/store/config'
import { getAllMentions, getSourceText } from '@/utils/timeline'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { GlassView } from 'expo-glass-effect'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Keyboard, PlatformColor, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, useColorScheme, View } from 'react-native'
import { Path, Svg } from 'react-native-svg'

type Results = { tags: Entity.Tag[]; people: Entity.Account[]; posts: Entity.Status[] }
const emptyResults: Results = { tags: [], people: [], posts: [] }
const palettes = {
	light: { background: '#F2F2F7', surface: '#FFFFFF', text: '#24252A', muted: '#71717A', border: '#E4E4E9', accent: '#536A83', tint: '#E8ECF0', line: '#6C879B' },
	dark: { background: '#101012', surface: '#1C1C1E', text: '#F2F2F7', muted: '#A0A0A9', border: '#303034', accent: '#A4B9CF', tint: '#292F36', line: '#91AABD' }
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
	if (values.length < 2) return null
	const max = Math.max(...values, 1)
	const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${34 - (value / max) * 29}`)
	return (
		<Svg width={64} height={32} viewBox="-2 0 104 40" accessible={false}>
			<Path d={`M${points.join(' L')} L100,40 L0,40 Z`} fill={color} fillOpacity={0.1} />
			<Path d={`M${points.join(' L')}`} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
		</Svg>
	)
}

export default function Search() {
	const { t, i18n } = useTranslation()
	const router = useRouter()
	const { width } = useWindowSize()
	const { acctId } = useLocalSearchParams<{ acctId?: string }>()
	const colors = palettes[useColorScheme() === 'dark' ? 'dark' : 'light']
	const { config } = useConfigStore()
	const [acct, setAcct] = useState<Account | null>(null)
	const [client, setClient] = useState<MegalodonInterface>()
	const [query, setQuery] = useState('')
	const [submittedQuery, setSubmittedQuery] = useState('')
	const [results, setResults] = useState<Results>(emptyResults)
	const [loading, setLoading] = useState(true)
	const [accountError, setAccountError] = useState(false)
	const [failed, setFailed] = useState<string[]>([])
	const [focused, setFocused] = useState(false)
	const requestId = useRef(0)
	const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null)
	const isTrending = !submittedQuery
	const contentWidth = width - 40
	const lang = i18n.language.startsWith('ja') ? 'ja' : 'en'
	const number = (value: number) => value.toLocaleString(i18n.language)

	const load = useCallback(async (api: MegalodonInterface, term: string) => {
		const id = ++requestId.current
		setLoading(true)
		setFailed([])
		setResults(emptyResults)
		const responses = await Promise.allSettled([
			Promise.resolve().then(async () => (term ? (await api.search(term, { type: 'hashtags', limit: 20 })).data.hashtags : (await api.getInstanceTrends(10)).data)),
			Promise.resolve().then(async () => (term ? (await api.search(term, { type: 'accounts', limit: 20 })).data.accounts : (await api.getInstanceTrendUsers(10)).data)),
			Promise.resolve().then(async () => (term ? (await api.search(term, { type: 'statuses', limit: 20 })).data.statuses : (await api.getInstanceTrendPosts(10)).data))
		])
		if (id !== requestId.current) return
		const [tags, people, posts] = responses
		setResults({ tags: tags.status === 'fulfilled' ? tags.value : [], people: people.status === 'fulfilled' ? people.value : [], posts: posts.status === 'fulfilled' ? posts.value : [] })
		setFailed(responses.flatMap((response, index) => (response.status === 'rejected' ? [['tags', 'people', 'posts'][index]] : [])))
		setLoading(false)
	}, [])

	useEffect(() => {
		let active = true
		setLoading(true)
		setAccountError(false)
		setAcct(null)
		setClient(undefined)
		setQuery('')
		setSubmittedQuery('')
		setResults(emptyResults)
		const initialize = async () => {
			try {
				const account = acctId ? await getAcctById(acctId) : (await listAccts())[0]
				if (!active) return
				if (!account) {
					setAccountError(true)
					setLoading(false)
					return
				}
				const api = generator(account.sns, `https://${account.domain}`, account.accessToken)
				setAcct(account)
				setClient(api)
				await load(api, '')
			} catch {
				if (active) {
					setAccountError(true)
					setLoading(false)
				}
			}
		}
		void initialize()
		return () => {
			active = false
			requestId.current++
		}
	}, [acctId, load])

	const submit = (term = query) => {
		if (!client) return
		const trimmed = term.trim()
		Keyboard.dismiss()
		setQuery(trimmed)
		setSubmittedQuery(trimmed)
		scrollRef.current?.scrollTo({ y: 0, animated: true })
		void load(client, trimmed)
	}
	const sectionHeading = (title: string, count: number) => (
		<View style={styles.sectionHeading}>
			<Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
			{!isTrending && !loading && <Text style={[styles.count, { color: colors.muted }]}>{count}</Text>}
		</View>
	)
	const emptySection = (section: string) => (
		<View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
			{loading ? (
				<ActivityIndicator color={colors.accent} accessibilityLabel={t('search.loading')} />
			) : (
				<>
					<SymbolView type="monochrome" name={failed.includes(section) ? 'wifi.slash' : 'magnifyingglass'} size={22} tintColor={colors.muted} />
					<Text style={[styles.emptyText, { color: colors.muted }]}>{t(failed.includes(section) ? 'search.unavailable' : isTrending ? 'search.noTrends' : 'search.noResults')}</Text>
					{failed.includes(section) && (
						<Pressable accessibilityRole="button" onPress={() => client && void load(client, submittedQuery)} style={styles.retry}>
							<Text style={[styles.link, { color: colors.accent }]}>{t('search.retry')}</Text>
						</Pressable>
					)}
				</>
			)}
		</View>
	)

	return (
		<View style={[styles.screen, { backgroundColor: colors.background }]}>
			<ScrollView
				ref={scrollRef}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				contentContainerStyle={[styles.content, { width }]}
				refreshControl={<RefreshControl refreshing={loading && !!client} onRefresh={() => client && void load(client, submittedQuery)} tintColor={colors.accent} />}
			>
				<GlassView glassEffectStyle="regular" style={[styles.searchBox]}>
					<SymbolView type="monochrome" name="magnifyingglass" size={21} tintColor={focused ? colors.accent : colors.muted} />
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder={t('search.placeholder')}
						placeholderTextColor={colors.muted}
						accessibilityLabel={t('search.placeholder')}
						returnKeyType="search"
						autoCapitalize="none"
						autoCorrect={false}
						onSubmitEditing={() => submit()}
						onFocus={() => setFocused(true)}
						onBlur={() => setFocused(false)}
						style={[styles.input, { color: colors.text }]}
					/>
					{query || submittedQuery ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t('search.clear')}
							onPress={() => {
								setQuery('')
								submit('')
							}}
							style={styles.inputAction}
						>
							<SymbolView type="monochrome" name="xmark" size={18} tintColor={colors.muted} />
						</Pressable>
					) : null}
				</GlassView>
				{accountError ? (
					<View style={styles.accountEmpty}>
						<SymbolView type="monochrome" name="person" size={30} tintColor={colors.accent} />
						<Text style={[styles.emptyText, { color: colors.muted }]}>{t('search.accountRequired')}</Text>
						<Link href="/acct" push>
							<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
							<Link.Trigger>
								<View style={StyleSheet.flatten([styles.accountButton, { backgroundColor: colors.tint }])}>
									<Text style={[styles.link, { color: colors.accent }]}>{t('search.chooseAccount')}</Text>
								</View>
							</Link.Trigger>
						</Link>
					</View>
				) : (
					<>
						<View style={styles.section}>
							{sectionHeading(t(isTrending ? 'search.trendingNow' : 'search.tag'), results.tags.length)}
							{results.tags.length > 0 && acct ? (
								<GlassView glassEffectStyle="regular" style={[styles.card]}>
									{results.tags.map((tag, index) => {
										const trend = getTrendActivity(tag.history)
										return (
											<Link key={tag.name} href={`/tag?acctId=${acct.id}&q=${encodeURIComponent(tag.name)}`} push>
												<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
												<Link.Trigger>
													<View style={StyleSheet.flatten([styles.tagRow, { width: contentWidth - 2, borderTopWidth: index ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }])}>
														<Text style={[styles.rank, { color: colors.muted }]}>{isTrending ? String(index + 1).padStart(2, '0') : '#'}</Text>
														<View style={styles.flex}>
															<Text numberOfLines={1} style={[styles.tagName, { color: colors.text }]}>
																#{tag.name}
															</Text>
															<Text style={[styles.meta, { color: colors.muted }]}>
																{trend.posts === null ? t('search.viewConversation') : t('search.dailyPosts', { count: trend.posts, formatted: number(trend.posts) })}
															</Text>
														</View>
														<Sparkline values={trend.values} color={colors.line} />
														<SymbolView type="monochrome" name="chevron.right" size={16} tintColor={colors.muted} />
													</View>
												</Link.Trigger>
											</Link>
										)
									})}
								</GlassView>
							) : (
								emptySection('tags')
							)}
						</View>
						<View style={styles.section}>
							{sectionHeading(t(isTrending ? 'search.peopleToDiscover' : 'search.user'), results.people.length)}
							{results.people.length > 0 && acct ? (
								<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
									{results.people.map((person, index) => (
										<Link key={person.id} href={`/user?acctId=${acct.id}&userId=${person.id}`} push>
											<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
											<Link.Trigger>
												<View style={StyleSheet.flatten([styles.personRow, { width: contentWidth - 2, borderTopWidth: index ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }])}>
													<Avatar src={person.avatar} size={42} />
													<View style={styles.flex}>
														<Text numberOfLines={1} style={[styles.personName, { color: colors.text }]}>
															{person.display_name || person.username}
														</Text>
														<Text numberOfLines={1} style={[styles.meta, { color: colors.muted }]}>
															@{person.acct}
														</Text>
													</View>
													<SymbolView type="monochrome" name="chevron.right" size={17} tintColor={colors.muted} />
												</View>
											</Link.Trigger>
										</Link>
									))}
								</View>
							) : (
								emptySection('people')
							)}
						</View>
						<View style={styles.section}>
							{sectionHeading(t(isTrending ? 'search.popularPosts' : 'search.post'), results.posts.length)}
							{results.posts.length && acct && client
								? results.posts.map((post) => (
										<View key={post.id} style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
											<Status
												status={post}
												acct={acct}
												client={client}
												lang={lang}
												columnWidth={contentWidth - 2}
												config={config.timeline}
												filters={[]}
												updateStatus={(updated, deleteId) =>
													setResults((previous) => ({
														...previous,
														posts: updated
															? previous.posts.map((item) => (item.id === updated.id ? updated : item.reblog?.id === updated.id ? { ...item, reblog: updated } : item))
															: previous.posts.filter((item) => item.id !== deleteId && item.reblog?.id !== deleteId)
													}))
												}
												composeAction={async (api, account, type, target) => {
													const isMe = target.account.acct !== account.username ? `@${target.account.acct} ` : ''
													const addText = type === 'reply' ? `${isMe}${getAllMentions(target)}` : type === 'edit' ? await getSourceText(target, api) : undefined
													router.push({ pathname: '/post', params: { acctId: account.id, targetId: target.id, statusId: target.id, mode: type, ...(addText !== undefined ? { addText } : {}) } })
												}}
											/>
										</View>
									))
								: emptySection('posts')}
						</View>
					</>
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	content: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
	searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 0, borderRadius: 28, paddingLeft: 18, paddingRight: 8, minHeight: 56, gap: 10, marginBottom: 22 },
	input: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 16 },
	inputAction: { width: 32, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
	searchAction: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
	section: { marginBottom: 23 },
	sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
	sectionTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, flexShrink: 1 },
	count: { fontSize: 11, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
	link: { fontSize: 12, fontWeight: '600' },
	card: { borderWidth: 0, borderRadius: 20, overflow: 'hidden' },
	tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 16 },
	rank: { fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'], width: 21 },
	flex: { flex: 1, minWidth: 0 },
	tagName: { fontSize: 15, fontWeight: '600', marginBottom: 5 },
	meta: { fontSize: 11, lineHeight: 16 },
	personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
	personName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
	postCard: { borderWidth: 0, borderRadius: 20, overflow: 'hidden', marginBottom: 12, paddingVertical: 8 },
	empty: { minHeight: 118, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20, borderWidth: 0, borderRadius: 16 },
	emptyText: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
	retry: { padding: 10 },
	accountEmpty: { paddingVertical: 48, alignItems: 'center', gap: 16 },
	accountButton: { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 12 }
})
