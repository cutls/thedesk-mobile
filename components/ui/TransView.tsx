import { type ComponentRef, forwardRef } from 'react'
import type { View, ViewProps } from 'react-native'
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated'

// Keep the animations stable across renders and animate only opacity.
const entering = FadeIn.duration(240)
	.easing(Easing.out(Easing.poly(4)))
	.reduceMotion(ReduceMotion.System)
const exiting = FadeOut.duration(180).easing(Easing.in(Easing.quad)).reduceMotion(ReduceMotion.System)

export const TransView = forwardRef<ComponentRef<typeof View>, ViewProps>(function TransView(props, ref) {
	return <Animated.View {...props} ref={ref} entering={entering} exiting={exiting} />
})
