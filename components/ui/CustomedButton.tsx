import { useWindowSize } from '@/hooks/useWindowSize'
import type { ButtonProps, HostProps } from '@expo/ui/swift-ui'
import { buttonStyle, controlSize, disabled, tint } from '@expo/ui/swift-ui/modifiers'
import { SymbolView } from 'expo-symbols'
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native'
import { ButtonSwiftUI } from './Button'

interface Props extends ButtonProps {
	style?: HostProps['style']
	variant?: 'automatic' | 'bordered' | 'borderedProminent' | 'borderless' | 'glass' | 'glassProminent' | 'plain'
	controlSize?: 'mini' | 'small' | 'regular' | 'large' | 'extraLarge'
	color?: string
	isPrimary?: boolean
	width?: number
	isGlass?: boolean
	isLoading?: boolean
}
export function CustomedButton({ isPrimary, color, width: requestedWidth, isLoading, systemImage, ...props }: Props) {
	const { width: screenWidth } = useWindowSize()
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const width = requestedWidth || screenWidth
	const styles = createStyles({ width })
	const useVariantNotGlass = isPrimary ? 'borderedProminent' : 'bordered'
	const useVariantGlass = isPrimary ? 'glassProminent' : 'glass'
	const variant = props.isGlass ? useVariantGlass : useVariantNotGlass
	const modifiersStandard = [buttonStyle(variant), disabled(isLoading), props.controlSize ? controlSize(props.controlSize) : controlSize('regular')]
	const modifiersWithColor = isPrimary && color ? [...modifiersStandard, tint(color)] : modifiersStandard

	return (
		<ButtonSwiftUI modifiers={modifiersWithColor} onPress={() => (isLoading || !props.onPress ? {} : props.onPress())} style={[styles.btn, props.style]}>
			<View style={{ justifyContent: 'center', height: 40, flexDirection: 'row', alignItems: 'center', width: width - 65 }}>
				{systemImage && !isLoading && (
					<SymbolView name={systemImage} type="monochrome" tintColor={isPrimary ? 'white' : color ? color : isDark ? 'white' : 'black'} size={20} style={{ marginRight: 5 }} />
				)}
				{isLoading && <ActivityIndicator size="small" color={isPrimary ? 'white' : color ? color : isDark ? 'white' : 'black'} style={{ width: width - 65 }} />}
				{!isLoading && props.children}
			</View>
		</ButtonSwiftUI>
	)
}
const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		btn: {
			height: 50,
			display: 'flex',
			justifyContent: 'center',
			alignContent: 'center',
			width: width - 40
		}
	})
