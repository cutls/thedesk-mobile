import '@/utils/i18n'
import NowPlaying, { type NowPlayingState } from '@edualm/react-native-now-playing'
import { Stack } from 'expo-router'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import 'react-native-reanimated'

import { useColorScheme } from '@/hooks/use-color-scheme'
import { NowPlayingContext } from '@/utils/nowplaying'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function RootLayout() {
	const { t } = useTranslation()
	const colorScheme = useColorScheme()
	const [playing, setPlaying] = useState<NowPlayingState | null>(null)
	const nowPlayingCallback = useCallback((state: NowPlayingState) => {
		setPlaying(state)
	}, [])

	useEffect(() => {
		NowPlaying.startObserving(nowPlayingCallback, 'default')
	}, [])

	return (
		<KeyboardProvider>
			<GestureHandlerRootView>
				<NowPlayingContext.Provider value={{ playing }}>
					<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
						<Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
							<Stack.Screen name="index" options={{ headerShown: false, title: '' }} />
							<Stack.Screen name="about" options={{ title: t('screen.about') }} />
							<Stack.Screen name="login" options={{ title: t('screen.login') }}>
								<Stack.Header blurEffect="systemMaterial" />
							</Stack.Screen>
							<Stack.Screen name="acct" options={{ title: t('screen.acct') }} />
							<Stack.Screen name="detail" options={{ title: t('screen.detail') }} />
							<Stack.Screen name="onOtherAcct" options={{ title: t('screen.onOtherAcct') }} />
							<Stack.Screen name="post" options={{ title: t('screen.post'), presentation: 'formSheet' }} />
							<Stack.Screen name="config" options={{ title: t('screen.config') }} />
							<Stack.Screen name="search" options={{ title: t('screen.search') }} />
							<Stack.Screen name="tag" options={{ title: t('screen.tag') }} />
							<Stack.Screen name="copy" options={{ title: t('timeline.action.copyText') }} />
							<Stack.Screen name="user" options={{ title: '', headerShown: false }} />
							<Stack.Screen name="handleShare" options={{ title: '', headerShown: false }} />
						</Stack>
						<StatusBar style="auto" />
					</ThemeProvider>
				</NowPlayingContext.Provider>
			</GestureHandlerRootView>
		</KeyboardProvider>
	)
}
