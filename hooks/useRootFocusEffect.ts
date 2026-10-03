import { useNavigation } from 'expo-router'
import { type EffectCallback, useEffect, useRef } from 'react'

// Root effects stay active under the composer, including their existing listeners.
export const useRootFocusEffect = (effect: EffectCallback) => {
	const navigation = useNavigation()
	const retained = useRef(false)
	useEffect(() => {
		let active = false
		let cleanup: ReturnType<EffectCallback>
		const sync = () => {
			const state = navigation.getState()
			const route = state?.routes[state.index]?.name
			retained.current = navigation.isFocused() || (retained.current && route === 'post')
			if (retained.current && !active) {
				active = true
				cleanup = effect()
			} else if (!retained.current && active) {
				active = false
				cleanup?.()
				cleanup = undefined
			}
		}
		// A blur alone cannot distinguish /post from other destinations. State also
		// catches navigation away from /post while the root is already unfocused.
		const unsubscribe = navigation.addListener('state', sync)
		sync()
		return () => {
			unsubscribe()
			cleanup?.()
		}
	}, [navigation, effect])
}
