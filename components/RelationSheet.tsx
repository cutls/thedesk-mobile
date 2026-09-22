import { useWindowSize } from '@/hooks/useWindowSize'
import { confirmDialog, CONTINUE } from '@/utils/alert'
import type { IState } from '@/utils/type'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { GlassView } from 'expo-glass-effect'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, PlatformColor, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from './themed/Text'
import { CustomedButton } from './ui/CustomedButton'

interface Props {
	isOpened: boolean
	setIsOpened: IState<boolean>
	relation: Entity.Relationship
	update: () => Promise<void>
	client: MegalodonInterface
	targetId: string
	locked: boolean
}
export default function RelationSheet({ isOpened, setIsOpened, client, relation, update, targetId, locked }: Props) {
	const { width, deviceWidth } = useWindowSize()
	// CustomedButton subtracts 40 from its width prop; account for the sheet padding and row gap.
	const requestButtonWidth = (width - 40 - 10) / 2 + 40
	const { t } = useTranslation()
	const insets = useSafeAreaInsets()
	const [isLoading, setIsLoading] = useState(false)
	const pendingAction = useRef(false)
	const following = relation.following
	const muting = relation.muting
	const blocking = relation.blocking
	const action = async (action: 'follow' | 'mute' | 'block' | 'request', v: boolean) => {
		if (pendingAction.current) return
		pendingAction.current = true
		const a =
			action === 'follow'
				? v
					? locked
						? t('user.alert.request')
						: t('user.alert.follow')
					: relation.requested && !following
						? t('user.alert.unrequest')
						: t('user.alert.unfollow')
				: action === 'mute'
					? v
						? t('user.alert.mute')
						: t('user.alert.unmute')
					: action === 'block'
						? v
							? t('user.alert.block')
							: t('user.alert.unblock')
						: v
							? t('user.alert.accept')
							: t('user.alert.reject')
		try {
			const c = await confirmDialog(t('confirm'), a, CONTINUE, (s) => t(s))
			if (!c) return
			setIsLoading(true)
			if (action === 'follow' && v) await client.followAccount(targetId)
			if (action === 'follow' && !v) await client.unfollowAccount(targetId)
			if (action === 'mute' && v) await client.muteAccount(targetId, true)
			if (action === 'mute' && !v) await client.unmuteAccount(targetId)
			if (action === 'block' && v) await client.blockAccount(targetId)
			if (action === 'block' && !v) await client.unblockAccount(targetId)
			if (action === 'request' && v) await client.acceptFollowRequest(targetId)
			if (action === 'request' && !v) await client.rejectFollowRequest(targetId)
			await update()
		} catch (error) {
			Alert.alert(t('screen.user'), String(error))
		} finally {
			pendingAction.current = false
			setIsLoading(false)
		}
	}
	return (
		<BottomSheet
			index={isOpened ? 0 : -1}
			enableDynamicSizing
			enablePanDownToClose
			topInset={insets.top}
			onClose={() => setIsOpened(false)}
			style={{ marginHorizontal: (deviceWidth - width) / 2 }}
			backgroundStyle={styles.sheetBackground}
			handleIndicatorStyle={styles.sheetHandle}
			backgroundComponent={(props: React.ComponentProps<typeof GlassView>) => <GlassView {...props} style={[props.style, { backgroundColor: 'transparent', borderRadius: 20 }]} />}
			backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />}
		>
			<BottomSheetScrollView contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
				{isLoading ? (
					<View style={styles.loading}>
						<ActivityIndicator />
					</View>
				) : (
					<>
						{relation.requested_by && (
							<>
								<Text>{t('user.requestedBy')}</Text>
								<View style={styles.requestActions}>
									<CustomedButton width={requestButtonWidth} style={[styles.button, styles.requestButton]} onPress={() => action('request', true)}>
										<Text style={[styles.buttonText]}>{t('user.accept')}</Text>
									</CustomedButton>
									<CustomedButton width={requestButtonWidth} style={[styles.button, styles.requestButton]} onPress={() => action('request', false)}>
										<Text style={styles.buttonText}>{t('user.reject')}</Text>
									</CustomedButton>
								</View>
								<View style={styles.separator} />
							</>
						)}
						{relation.followed_by && <Text>{t('user.followedBy')}</Text>}
						<CustomedButton style={styles.button} onPress={() => action('follow', locked && relation.requested ? false : !following)}>
							<Text style={styles.buttonText}>{following ? t('user.unfollow') : locked ? (relation.requested ? t('user.unrequest') : t('user.request')) : t('user.follow')}</Text>
						</CustomedButton>
						<View style={styles.separator} />
						<CustomedButton style={styles.button} onPress={() => action('mute', !muting)}>
							<Text style={styles.buttonText}>{muting ? t('user.unmute') : t('user.mute')}</Text>
						</CustomedButton>
						<CustomedButton style={styles.button} onPress={() => action('block', !blocking)}>
							<Text style={[styles.buttonText, styles.destructiveText]}>{blocking ? t('user.unblock') : t('user.block')}</Text>
						</CustomedButton>
					</>
				)}
			</BottomSheetScrollView>
		</BottomSheet>
	)
}

const styles = StyleSheet.create({
	sheetBackground: { backgroundColor: PlatformColor('systemBackground') },
	sheetHandle: { backgroundColor: PlatformColor('secondaryLabel') },
	contentContainer: {
		padding: 20,
		gap: 10
	},
	loading: {
		padding: 20,
		alignItems: 'center'
	},
	requestActions: {
		flexDirection: 'row',
		gap: 10
	},
	requestButton: { flex: 1, flexShrink: 1 },
	button: {
		minHeight: 50,
		padding: 10,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	buttonText: {
		fontSize: 18,
		textAlign: 'center'
	},
	destructiveText: { color: PlatformColor('systemRed') },
	separator: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: PlatformColor('separator')
	}
})
