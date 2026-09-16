import BSD from '@/components/license/bsd'
import ISC from '@/components/license/isc'
import MIT from '@/components/license/mit'
import { Text } from '@/components/themed/Text'
import { useWindowSize } from '@/hooks/useWindowSize'
import Constants from 'expo-constants'
import { Image } from 'expo-image'
import { openBrowserAsync } from 'expo-web-browser'
import { PlatformColor, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
const logo = require('../assets/images/desk.png')

export default function About() {
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	return (
		<ScrollView style={{ padding: 10 }}>
			<View style={{ alignItems: 'center', marginBottom: 20, flexDirection: 'column' }}>
				<Image source={logo} style={{ width: 100, height: 100 }} contentFit="contain" />
				<Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 5 }}>TheDesk (mobile)</Text>
				<Text style={{ marginBottom: 15 }}>v{Constants.manifest2?.runtimeVersion}</Text>
				<Text>This app is licensed under the Apache 2.0 License.</Text>
				<TouchableOpacity activeOpacity={0.7} onPress={() => openBrowserAsync('https://github.com/cutls/thedesk-mobile')}>
					<Text style={{ color: PlatformColor('systemBlue'), textDecorationLine: 'underline' }}>Source code</Text>
				</TouchableOpacity>
			</View>
			<Text style={{ fontSize: 20, fontWeight: 'bold', marginVertical: 10 }}>LICENSE</Text>
			<Text style={styles.title}>@cutls/megalodon</Text>
			<MIT author="Copyright (c) 2025 h3poteto, cutls" />
			<Text style={styles.title}>@edualm/react-native-now-playing</Text>
			<MIT author="Copyright (c) 2021 Eduardo Almeida" />
			<Text style={styles.title}>@expo/vector-icons</Text>
			<MIT author="Copyright (c) 2015 Joel Arvidsson" />
			<Text style={styles.title}>@gorhom/bottom-sheet</Text>
			<MIT author="Copyright (c) 2026 cutls, 2020 Mo Gorhom" />
			<Text style={styles.title}>@cutls/galeria</Text>
			<MIT author="Copyright (c) 2025 Fernando Rojo" />
			<Text style={styles.title}>@react-native-community/datetimepicker</Text>
			<MIT author="Copyright (c) 2019 React Native Community" />
			<Text style={styles.title}>@react-native-segmented-control/segmented-control</Text>
			<MIT author="Copyright (c) 2015-present, Facebook, Inc." />
			<Text style={styles.title}>@react-navigation/bottom-tabs</Text>
			<MIT author="Copyright (c) 2017 React Navigation Contributors" />
			<Text style={styles.title}>@react-navigation/elements</Text>
			<MIT author="Copyright (c) 2017 React Navigation Contributors" />
			<Text style={styles.title}>@react-navigation/native</Text>
			<MIT author="Copyright (c) 2017 React Navigation Contributors" />
			<Text style={styles.title}>@shopify/flash-list</Text>
			<MIT author="Copyright 2022-present, Shopify Inc." />
			<Text style={styles.title}>axios</Text>
			<MIT author="# Copyright (c) 2014-present Matt Zabriskie & Collaborators" />
			<Text style={styles.title}>cheerio</Text>
			<MIT author="Copyright (c) 2022 The Cheerio contributors" />
			<Text style={styles.title}>color</Text>
			<MIT author="Copyright (c) 2012 Heather Arthur" />
			<Text style={styles.title}>date-fns</Text>
			<MIT author="Copyright (c) 2021 Sasha Koss and Lesha Koss https://kossnocorp.mit-license.org" />
			<Text style={styles.title}>
				expo, @expo/ui, expo-blob, expo-blur, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-font, expo-glass-effect, expo-haptics, expo-image, expo-image-manipulator,
				expo-image-picker, expo-linking, expo-localization, expo-media-library, expo-notifications, expo-router, expo-splash-screen, expo-sqlite, expo-status-bar, expo-symbols, expo-system-ui,
				expo-updates, expo-web-browser
			</Text>
			<MIT author="Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)" />
			<Text style={styles.title}>expo-color-to-hex</Text>
			<MIT author="Copyright (c) 2025 cutls <p@cutls.dev> (https://github.com/cutls)" />
			<Text style={styles.title}>expo-translate-text</Text>
			<MIT author="Copyright (c) 2025 Tom Atterton" />
			<Text style={styles.title}>i18next</Text>
			<MIT author="Copyright (c) 2025 i18next" />
			<Text style={styles.title}>react</Text>
			<MIT author="Copyright (c) Meta Platforms, Inc. and affiliates." />
			<Text style={styles.title}>react-dom</Text>
			<MIT author="Copyright (c) Meta Platforms, Inc. and affiliates." />
			<Text style={styles.title}>react-i18next</Text>
			<MIT author="Copyright (c) 2025 i18next" />
			<Text style={styles.title}>react-native</Text>
			<MIT author="Copyright (c) Meta Platforms, Inc. and affiliates." />
			<Text style={styles.title}>react-native-gesture-handler</Text>
			<MIT author="Copyright (c) 2016 Software Mansion <swmansion.com>" />
			<Text style={styles.title}>react-native-image-colors</Text>
			<MIT author="Copyright (c) 2021 Osama Qarem" />
			<Text style={styles.title}>react-native-keyboard-controller</Text>
			<MIT author="Copyright (c) 2021 Kiryl Ziusko" />
			<Text style={styles.title}>react-native-pager-view</Text>
			<MIT author="Copyright (c) 2021 Callstack" />
			<Text style={styles.title}>react-native-reanimated</Text>
			<MIT author="Copyright (c) 2016 Software Mansion <swmansion.com>" />
			<Text style={styles.title}>react-native-render-html</Text>
			<BSD author="Copyright (c) 2021, Maxime Bertonnier, Jules Sam. Randolph" />
			<Text style={styles.title}>react-native-safe-area-context</Text>
			<MIT author="Copyright (c) 2019 Th3rd Wave" />
			<Text style={styles.title}>react-native-screens</Text>
			<MIT author="Copyright (c) 2018 Software Mansion <swmansion.com>" />
			<Text style={styles.title}>react-native-svg</Text>
			<MIT author="Copyright (c) [2015-2016] [Horcrux]" />
			<Text style={styles.title}>react-native-web</Text>
			<MIT author="Copyright (c) Nicolas Gallagher." />
			<Text style={styles.title}>react-native-worklets</Text>
			<MIT author="Copyright (c) 2024 nobody" />
			<Text style={styles.title}>semver</Text>
			<ISC author="Copyright (c) Isaac Z. Schlueter and Contributors" />
			<Text style={styles.title}>superagent</Text>
			<MIT author="Copyright (c) 2014-2016 TJ Holowaychuk <tj@vision-media.ca>" />
			<Text style={styles.title}>zustand</Text>
			<MIT author="Copyright (c) 2019 Paul Henschel" />
		</ScrollView>
	)
}

const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		title: {
			fontWeight: 'bold',
			marginVertical: 5,
			fontSize: 16
		}
	})
