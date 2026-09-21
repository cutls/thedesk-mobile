import { Button, Host, Menu, type ButtonProps, type HostProps, type MenuProps } from '@expo/ui/swift-ui'
import { useTranslation } from 'react-i18next'

interface Props extends Omit<MenuProps, 'label' | 'children'> {
	style?: HostProps['style']
	children: MenuProps['label']
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
			<Menu label={children} {...props}>
				{data.map((item) => (
					<Button
						key={item.value}
						label={t(item.title)}
						systemImage={item.systemImage}
						role={item.isDestructive ? 'destructive' : undefined}
						onPress={() => onSelect(item.value)}
					/>
				))}
			</Menu>
		</Host>
	)
}
