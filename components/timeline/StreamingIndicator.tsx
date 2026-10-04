import { GlassView } from 'expo-glass-effect'
import { SymbolView } from 'expo-symbols'
import { useEffect } from 'react'
import { Text } from 'react-native'
import Animated, { cancelAnimation, Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated'

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView)

export const StreamingIndicator = ({ isStreaming }: { isStreaming: boolean }) => {
	const progress = useSharedValue(0)

	useEffect(() => {
		progress.value = 0
		if (!isStreaming) return

		progress.value = withSequence(
			withTiming(1, {
				duration: 400,
				easing: Easing.out(Easing.back(1.1))
			}),
			withDelay(
				2600,
				withTiming(0, {
					duration: 300,
					easing: Easing.inOut(Easing.cubic)
				})
			)
		)
		return () => cancelAnimation(progress)
	}, [isStreaming, progress])

	const containerStyle = useAnimatedStyle(() => ({
		width: interpolate(progress.value, [0, 1], [4, 60]),
		height: interpolate(progress.value, [0, 1], [4, 28]),
		borderRadius: interpolate(progress.value, [0, 1], [2, 14])
	}))
	const contentStyle = useAnimatedStyle(() => ({
		opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0, 1], Extrapolation.CLAMP)
	}))

	if (!isStreaming) return null

	return (
		<AnimatedGlassView
			glassEffectStyle="regular"
			pointerEvents="none"
			tintColor="green"
			style={[
				{
					position: 'absolute',
					top: 4,
					right: 8,
					backgroundColor: 'green',
					alignItems: 'center',
					justifyContent: 'center',
					overflow: 'hidden',
					zIndex: 1
				},
				containerStyle
			]}
		>
			<AnimatedGlassView
				glassEffectStyle="regular"
				style={[
					{
						width: 60,
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 4
					},
					contentStyle
				]}
			>
				<SymbolView name="dot.radiowaves.left.and.right" type="monochrome" tintColor="white" size={18} />
				<Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: 'white' }}>
					LIVE
				</Text>
			</AnimatedGlassView>
		</AnimatedGlassView>
	)
}
