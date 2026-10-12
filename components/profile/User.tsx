import type { Account } from '@/entities/account'
import type { Entity } from '@cutls/megalodon'
import { Link } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { PlatformColor, View } from 'react-native'
import Avatar from '../Avatar'
import { AccountName } from '../status/AccountName'
import { Text } from '../themed/Text'
interface IProps {
	acct: Account
	columnWidth: number
	txtColor: string
	basic: Entity.Account
}
export const User = ({ acct, columnWidth, txtColor, basic }: IProps) => {
	return (
		<Link href={`/user?acctId=${acct.id}&userId=${basic.id}`} push>
			<Link.Preview style={{ backgroundColor: PlatformColor('systemBackground') }} />
			<Link.Trigger>
				<View>
					<View style={{ padding: 10, width: columnWidth, flexDirection: 'row' }}>
						<View style={{ width: 45, justifyContent: 'center', alignItems: 'center' }}>
							<Avatar src={basic.avatar} size={35} />
						</View>

						<View style={{ marginLeft: 5, width: columnWidth - 100 }}>
							<AccountName account={basic} fontSize={16} width={columnWidth - 100} />
							<View style={{ display: 'flex', flexDirection: 'row', marginVertical: 2, alignItems: 'center' }}>
								<Text numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1 }}>
									@{basic.acct}
								</Text>
								{basic.locked && <SymbolView name="lock" type="monochrome" tintColor={txtColor} size={12} style={{ flexShrink: 0 }} />}
							</View>
						</View>
					</View>
				</View>
			</Link.Trigger>
		</Link>
	)
}
