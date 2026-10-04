import { SymbolView } from 'expo-symbols'
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Text } from 'react-native'

export const StreamingIndicator = ({ isStreaming }: { isStreaming: boolean }) => {
	const progress = useRef(new Animated.Value(0)).current
	const [phase, setPhase] = useState<'waiting' | 'intro' | 'done'>('waiting')

	useEffect(() => {
		console.log(isStreaming, phase)
		if (!isStreaming) {
			progress.setValue(0)
			setPhase('waiting')
			return
		}
		if (phase === 'waiting') {
			setPhase('intro')
			return
		}
		if (phase === 'done') return

		const animation = Animated.sequence([
			Animated.timing(progress, {
				toValue: 1,
				duration: 400,
				easing: Easing.out(Easing.back(1.1)),
				useNativeDriver: false,
				isInteraction: false
			}),
			Animated.delay(2600),
			Animated.timing(progress, {
				toValue: 0,
				duration: 300,
				easing: Easing.inOut(Easing.cubic),
				useNativeDriver: false,
				isInteraction: false
			})
		])
		animation.start(({ finished }) => {
			if (finished) setPhase('done')
		})
		return () => animation.stop()
	}, [isStreaming, phase, progress])

	if (!isStreaming) return null

	return (
		<Animated.View
			pointerEvents="none"
			style={{
				position: 'absolute',
				top: 4,
				right: 8,
				width: progress.interpolate({ inputRange: [0, 1], outputRange: [4, 60] }),
				height: progress.interpolate({ inputRange: [0, 1], outputRange: [4, 28] }),
				borderRadius: progress.interpolate({ inputRange: [0, 1], outputRange: [2, 14] }),
				backgroundColor: 'green',
				alignItems: 'center',
				justifyContent: 'center',
				overflow: 'hidden',
				zIndex: 1
			}}
		>
			<Animated.View
				style={{
					width: 60,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 4,
					opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' })
				}}
			>
				<SymbolView name="dot.radiowaves.left.and.right" type="monochrome" tintColor="white" size={18} />
				<Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: 'white' }}>
					LIVE
				</Text>
			</Animated.View>
		</Animated.View>
	)
}
