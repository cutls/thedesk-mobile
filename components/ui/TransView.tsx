import { type ComponentRef, forwardRef } from 'react'
import type { View, ViewProps } from 'react-native'
import Animated, { Easing, type EntryExitAnimationFunction, FadeOut, ReduceMotion, withSpring, withTiming } from 'react-native-reanimated'

// Keep the worklet stable across renders and run the entrance on the UI thread.
const entering: EntryExitAnimationFunction = () => {
	'worklet'
	return {
		initialValues: {
			opacity: 0,
			transform: [{ translateY: 10 }]
		},
		animations: {
			// Fade independently so the spring's overshoot cannot pulse the opacity.
			opacity: withTiming(1, {
				duration: 220,
				easing: Easing.out(Easing.cubic),
				reduceMotion: ReduceMotion.System
			}),
			transform: [
				{
					translateY: withSpring(0, {
						// Damping ratio 0.75: a gentle ~0.28-point overshoot, then settling.
						mass: 1,
						stiffness: 400,
						damping: 30,
						velocity: 0,
						overshootClamping: false,
						energyThreshold: 6e-9,
						reduceMotion: ReduceMotion.System
					})
				}
			]
		}
	}
}
const exiting = FadeOut.duration(180).easing(Easing.in(Easing.quad)).reduceMotion(ReduceMotion.System)

export const TransView = forwardRef<ComponentRef<typeof View>, ViewProps>(function TransView(props, ref) {
	return <Animated.View {...props} ref={ref} entering={entering} exiting={exiting} />
})
