import { ContextMenu, Host, Button as SwiftButton, type ButtonProps, type ContextMenuProps, type HostProps } from '@expo/ui/swift-ui'
import { useTranslation } from 'react-i18next'

interface Props extends ContextMenuProps {
	style?: HostProps['style']
	data: {
		title: string
		value: string
		systemImage?: ButtonProps['systemImage']
		isDestructive?: boolean
	}[]
	onSelect: (value: string) => void
}
export function Dropdown({ style, children, data, onSelect, ...props }: Props) {
	const { t } = useTranslation()
	return (
		<Host style={style}>
			{/* <ContextMenu activationMethod="singlePress" {...props}> */}
			<ContextMenu {...props}>
				<ContextMenu.Items>
					{data.map((item) => (
						<SwiftButton label={t(item.title)} key={item.value} systemImage={item.systemImage} onPress={() => onSelect(item.value)} />
					))}
				</ContextMenu.Items>
				<ContextMenu.Trigger>{children}</ContextMenu.Trigger>
			</ContextMenu>
		</Host>
	)
}
