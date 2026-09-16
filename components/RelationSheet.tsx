import { useWindowSize } from '@/hooks/useWindowSize'
import { confirmDialog, CONTINUE } from '@/utils/alert'
import type { IState } from '@/utils/type'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { BottomSheet, Host, Text as SwiftUIText } from '@expo/ui/swift-ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, PlatformColor, StyleSheet, View } from 'react-native'
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
	const { width } = useWindowSize()
	const { t } = useTranslation()
	const styles = createStyles({ width })
	const [isLoading, setIsLoading] = useState(false)
	const following = relation.following
	const muting = relation.muting
	const blocking = relation.blocking
	const refresh = async () => await update()
	const action = async (action: 'follow' | 'mute' | 'block' | 'request', v: boolean) => {
		const a =
			action === 'follow'
				? v
					? locked? t('user.alert.request') : t('user.alert.follow')
					: locked? t('user.alert.unrequest') : t('user.alert.unfollow')
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
		await refresh()
		setIsLoading(false)
	}
	return (
		<Host style={{ width }}>
			<BottomSheet isPresented={isOpened} onIsPresentedChange={(e) => setIsOpened(e)}>
				{isLoading ? (
					<View style={{ padding: 20, alignItems: 'center' }}>
						<ActivityIndicator />
					</View>
				) : (
					<View style={{ padding: 20, paddingBottom: 40 }}>
						{relation.requested_by && (
							<>
								<Text>{t('user.requestedBy')}</Text>
								<View style={{ height: 10 }} />
								<View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
									<CustomedButton variant="bordered" controlSize="large" onPress={() => action('request', true)} width={width / 2 + 10}>
										<SwiftUIText>{t('user.accept')}</SwiftUIText>
									</CustomedButton>
									<CustomedButton variant="bordered" controlSize="large" onPress={() => action('request', false)} width={width / 2 + 10}>
										<SwiftUIText>{t('user.reject')}</SwiftUIText>
									</CustomedButton>
								</View>

								<View style={{ height: 10 }} />
								<View style={{ height: 10, borderTopWidth: 1, borderColor: PlatformColor('separator') }} />
							</>
						)}
						{relation.followed_by && <Text>{t('user.followedBy')}</Text>}
						<View style={{ height: 10 }} />
						<CustomedButton variant="bordered" controlSize="large" onPress={() => action('follow', locked && relation.requested ? false : !following)}>
							<SwiftUIText>{following ? t('user.unfollow') : locked ? (relation.requested ? t('user.unrequest') : t('user.request')) : t('user.follow')}</SwiftUIText>
						</CustomedButton>
						<View style={{ height: 10 }} />
						<View style={{ height: 10, borderTopWidth: 1, borderColor: PlatformColor('separator') }} />
						<CustomedButton variant="bordered" controlSize="large" onPress={() => action('mute', !muting)}>
							<SwiftUIText>{muting ? t('user.unmute') : t('user.mute')}</SwiftUIText>
						</CustomedButton>
						<View style={{ height: 10 }} />
						<CustomedButton variant="bordered" color="red" controlSize="large" onPress={() => action('block', !blocking)}>
							<SwiftUIText>{muting ? t('user.unblock') : t('user.block')}</SwiftUIText>
						</CustomedButton>
					</View>
				)}
			</BottomSheet>
		</Host>
	)
}

const createStyles = ({ width }: { width: number }) => StyleSheet.create({})
