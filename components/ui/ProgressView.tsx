import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View, type ViewProps } from 'react-native'

interface ProgressViewProps {
	style?: ViewProps['style']
}

export const ProgressView = ({ style }: ProgressViewProps) => {
	const progress = useRef(new Animated.Value(0)).current
	const [width, setWidth] = useState(0)
	const color = 'teal'
	const segmentWidth = width * 0.3

	useEffect(() => {
		if (width <= 0) return
		progress.setValue(0)
		const animation = Animated.loop(
			Animated.timing(progress, {
				toValue: 1,
				duration: 1200,
				easing: Easing.linear,
				useNativeDriver: true,
				// Keep the animation from delaying virtualized list rendering.
				isInteraction: false
			})
		)
		animation.start()
		return () => animation.stop()
	}, [progress, width])

	return (
		<View
			pointerEvents="none"
			accessible
			accessibilityRole="progressbar"
			accessibilityState={{ busy: true }}
			onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
			style={[styles.track, style]}
		>
			<View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.15 }]} />
			{width > 0 && (
				<Animated.View
					style={{
						height: '100%',
						width: segmentWidth,
						backgroundColor: color,
						transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-segmentWidth, width] }) }]
					}}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	track: {
		height: 4,
		overflow: 'hidden'
	}
})
