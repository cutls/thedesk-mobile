import Avatar from '@/components/Avatar'
import { ProfileText } from '@/components/profile/ProfileText'
import { ProfileStatuses } from '@/components/profile/Statuses'
import { ProfileUsers } from '@/components/profile/Users'
import { Followed } from '@/components/relations/Followed'
import { Following } from '@/components/relations/Following'
import { FollowingFollowed } from '@/components/relations/FollowingFollowed'
import { FollowingRequested } from '@/components/relations/FollowingRequested'
import { Requested } from '@/components/relations/Requested'
import { Requesting } from '@/components/relations/Requesting'
import { RequestingFollowed } from '@/components/relations/RequestingFollowed'
import { RequestingRequested } from '@/components/relations/RequestingRequested'
import RelationSheet from '@/components/RelationSheet'
import { AccountName } from '@/components/status/AccountName'
import { Text } from '@/components/themed/Text'
import { Button, CustomButton, IconButton } from '@/components/ui/Button'
import type { Account } from '@/entities/account'
import { useWindowSize } from '@/hooks/useWindowSize'
import { getAcctById } from '@/utils/storage'
import { calcFromNow } from '@/utils/timeline'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { Host, Picker, Text as SwiftUIText } from '@expo/ui/swift-ui'
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { BlurView } from 'expo-blur'
import { GlassView } from 'expo-glass-effect'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import * as Localization from 'expo-localization'
import { useIsPreview, useLocalSearchParams, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, type OpaqueColorValue, PlatformColor, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const BasePerson = ({ relation: r, textColor }: { relation: Entity.Relationship; textColor: OpaqueColorValue }) => {
	if (r.blocked_by || r.blocking) return <SymbolView name="person.slash.fill" type="monochrome" tintColor={textColor} size={20} />
	if (r.muting) return <SymbolView name="person.badge.minus" type="monochrome" tintColor={textColor} size={20} />
	return <SymbolView name="person" type="monochrome" tintColor={textColor} size={20} />
}
const Relation = ({ relation: r, textColor }: { relation: Entity.Relationship; textColor: OpaqueColorValue }) => {
	if (r.blocking && r.blocked_by) return <FollowingFollowed />
	if (r.blocking && !r.blocked_by) return <Following />
	if (!r.blocking && r.blocked_by) return <Followed />
	if (r.followed_by && r.following) return <FollowingFollowed />
	if (r.requested_by && r.following) return <FollowingRequested />
	if (r.requested && r.followed_by) return <RequestingFollowed />
	if (r.requested && r.requested_by) return <RequestingRequested />
	if (r.requested_by) return <Requested />
	if (r.requested) return <Requesting />
	if (r.following) return <Following />
	if (r.followed_by) return <Followed />
	return <SymbolView name="circle.dashed" type="monochrome" tintColor={textColor} size={20} />
}
const GlassViewFallback = ({ isPreview, style, children }: { isPreview: boolean; style?: any; children: React.ReactNode }) => {
	if (isPreview) {
		return <View style={[style, { backgroundColor: PlatformColor('systemGray5'), opacity: 0.8 }]}>{children}</View>
	}
	return (
		<GlassView tintColor="gray" glassEffectStyle="clear" style={style}>
			{children}
		</GlassView>
	)
}
export default function Index() {
	const { t } = useTranslation()
	const isPreview = useIsPreview()
	const [scrollY, setScrollY] = useState(0)

	const router = useRouter()
	const params = useLocalSearchParams()
	const { acctId, userId } = params as Record<'acctId' | 'userId', string>

	const { width, deviceWidth } = useWindowSize()
	const padding = (deviceWidth - width) / 2
	const styles = createStyles({ width })
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [acct, setAcct] = useState<Account | null>(null)
	const [basic, setBasic] = useState<Entity.Account | null>(null)
	const [relation, setRelation] = useState<Entity.Relationship | null>(null)
	const [rSheet, setRSheet] = useState(false)
	const ref = useRef<ScrollView>(null)
	const [page, setPage] = useState(0)
	const verifiedBg = isDark ? '#083416' : '#d2e2d7'
	const lang = Localization.getLocales()[0]?.languageTag === 'ja-JP' ? 'ja' : 'en'
	const options = [t('user.posts'), t('user.follows'), t('user.followers')]
	const updateRelation = async () => {
		if (!client) return
		const r = await client.getRelationship(userId)
		setRelation(r.data)
	}
	useEffect(() => {
		const fn = async () => {
			setIsLoading(true)
			try {
				const acct = await getAcctById(acctId)
				if (!acct) throw new Error('Invalid account id')
				setAcct(acct)
				const https = `https://${acct.domain}`
				const client = generator(acct.sns, https, acct.accessToken)
				setClient(client)
				const d = await client.getAccount(userId)
				setBasic(d.data)
				if (d.data.acct === acct.username) return
				const r = await client.getRelationship(userId)
				setRelation(r.data)
			} finally {
				setIsLoading(false)
			}
		}
		fn()
	}, [acctId, userId])
	if (isLoading || !basic || !acct) {
		return (
			<SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<ActivityIndicator />
			</SafeAreaView>
		)
	}
	return (
		<>
			<View style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', height: 100, justifyContent: 'center', zIndex: 5 }}>
				<View
					style={{
						position: 'absolute',
						paddingHorizontal: 10,
						marginTop: 20,
						zIndex: 2,
						paddingTop: 50,
						justifyContent: 'space-between',
						flexDirection: 'row',
						width: width
					}}
				>
					<IconButton onPress={() => router.back()} style={{ width: 45, height: 45 }} systemImage="chevron.left" width={45} isDark={isDark} />
					<Button onPress={() => (ref.current as any)?.scrollTo(0)} style={{ width: 200, height: 45, opacity: scrollY > 300 ? 100 : 0, padding: 10 }} width={200} isDark={isDark}>
						{basic.acct}
					</Button>
					{relation && (
						<View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
							<CustomButton onPress={() => setRSheet(true)} style={{ width: 45, height: 45, marginRight: 2 }}>
								<BasePerson relation={relation} textColor={textColor} />
							</CustomButton>
						</View>
					)}
				</View>
				<Image style={{ height: 120, width: width, opacity: scrollY > 300 ? 1 : 0 }} source={{ uri: basic.header }} />
				<BlurView intensity={scrollY > 300 ? 100 : 0} style={{ position: 'absolute', height: 120, width }}></BlurView>
			</View>
			<Image style={[styles.header, { height: Math.max(340, 300 - Math.min(0, scrollY)), marginLeft: padding }]} source={{ uri: basic.header }} />
			<ScrollView ref={ref as any} onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)} style={{ position: 'absolute', width, top: 0, left: padding, right: 0, bottom: 0 }}>
				<View style={styles.headerWrap} />
				<GlassViewFallback isPreview={isPreview} style={styles.infoBar}>
					<View style={{ width: 80, justifyContent: 'center', alignItems: 'center' }}>
						<Avatar src={basic.avatar} size={80} />
						{relation && (
							<View style={styles.relation}>
								<Relation relation={relation} textColor={textColor} />
							</View>
						)}
					</View>
					<View style={{ marginLeft: 5 }}>
						<AccountName account={basic} fontSize={24} width={width - 145} />
						<TouchableOpacity style={{ display: 'flex', flexDirection: 'row', marginVertical: 5 }} onPress={() => Linking.openURL(basic.url)}>
							<Text style={{}}>@{basic.acct}</Text>
							{basic.locked && <SymbolView name="lock" type="monochrome" tintColor={textColor} size={16} />}
						</TouchableOpacity>
						<Text style={{ marginBottom: 5, fontSize: 12 }} numberOfLines={1}>
							{t('user.joinedAt', { absolute: new Date(basic.created_at).toLocaleDateString(), relative: calcFromNow(new Date(basic.created_at), lang === 'ja') })}
						</Text>
						<View style={{ display: 'flex', flexDirection: 'row' }}>
							<View style={{ width: (width - 145) / 3 }}>
								<Text numberOfLines={1} style={{ textAlign: 'center' }}>
									{t('user.posts')}
								</Text>
								<Text numberOfLines={1} style={{ fontWeight: 'bold', textAlign: 'center' }}>
									{basic.statuses_count.toLocaleString()}
								</Text>
							</View>
							<View style={{ width: (width - 145) / 3 }}>
								<Text numberOfLines={1} style={{ textAlign: 'center' }}>
									{t('user.follows')}
								</Text>
								<Text numberOfLines={1} style={{ fontWeight: 'bold', textAlign: 'center' }}>
									{basic.following_count.toLocaleString()}
								</Text>
							</View>
							<View style={{ width: (width - 145) / 3 }}>
								<Text numberOfLines={1} style={{ textAlign: 'center' }}>
									{t('user.followers')}
								</Text>
								<Text numberOfLines={1} style={{ fontWeight: 'bold', textAlign: 'center' }}>
									{basic.followers_count.toLocaleString()}
								</Text>
							</View>
						</View>
					</View>
				</GlassViewFallback>
				<View style={{ padding: 10, backgroundColor: isDark ? '#111' : '#fff' }}>
					<ProfileText acctId={acct.id} client={client} account={basic} width={width - 20} fontSize={14} />
					{basic.fields.map((field, idx) => (
						<View
							key={`${field.name}-${idx}`}
							style={{
								padding: 5,
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								backgroundColor: field.verified ? verifiedBg : undefined,
								borderTopLeftRadius: idx === 0 ? 10 : 0,
								borderTopRightRadius: idx === 0 ? 10 : 0,
								borderBottomLeftRadius: idx === basic.fields.length - 1 ? 10 : 0,
								borderBottomRightRadius: idx === basic.fields.length - 1 ? 10 : 0
							}}
						>
							<Text style={{ fontWeight: 'bold', width: 100 }} numberOfLines={2}>
								{field.name}
							</Text>
							<ProfileText client={client} acctId={acct.id} account={{ ...basic, note: field.value }} width={width - 120} fontSize={14} />
						</View>
					))}
				</View>
				<Host style={{ height: 50, backgroundColor: isDark ? '#111' : '#fff' }}>
					<Picker
						modifiers={[pickerStyle('segmented')]}
						label="Select a fruit"
						selection={page}
						onSelectionChange={(selection) => {
							setPage(selection)
						}}
					>
						{options.map((option, i) => (
							<SwiftUIText key={option} modifiers={[tag(i)]}>
								{option}
							</SwiftUIText>
						))}
					</Picker>
				</Host>
				{page === 0 && (
					<View style={{ flex: 1, backgroundColor: isDark ? '#111' : '#fff' }}>
						<ProfileStatuses lang={lang} targetId={basic.id} client={client} acct={acct} columnWidth={width} />
					</View>
				)}
				{page === 1 && (
					<View style={{ backgroundColor: isDark ? '#111' : '#fff' }}>
						<ProfileUsers type="following" lang={lang} targetId={basic.id} client={client} acct={acct} columnWidth={width} />
					</View>
				)}
				{page === 2 && (
					<View style={{ backgroundColor: isDark ? '#111' : '#fff' }}>
						<ProfileUsers type="followers" lang={lang} targetId={basic.id} client={client} acct={acct} columnWidth={width} />
					</View>
				)}
				{client && relation && <RelationSheet locked={basic.locked} isOpened={rSheet} setIsOpened={setRSheet} update={() => updateRelation()} client={client} relation={relation} targetId={userId} />}
			</ScrollView>
		</>
	)
}
const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		headerWrap: {
			width: width,
			height: 300
		},
		header: {
			width: width,
			position: 'absolute'
		},
		infoBar: {
			position: 'absolute',
			flexDirection: 'row',
			display: 'flex',
			padding: 10,
			top: 160,
			height: 130,
			left: 20,
			borderRadius: 20
		},
		relation: {
			position: 'absolute',
			bottom: 5,
			right: -5,
			backgroundColor: PlatformColor('systemBackground'),
			borderRadius: 10,
			padding: 2
		}
	})
