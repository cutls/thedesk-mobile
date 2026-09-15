import { Text } from '@/components/themed/Text'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { defaultSetting } from '@/entities/settings'
import { useWindowSize } from '@/hooks/useWindowSize'
import { confirmDialog, CONTINUE } from '@/utils/alert'
import { getSettings, saveSettings } from '@/utils/storage'
import { useConfigStore } from '@/utils/store/config'
import { staticStyles } from '@/utils/theme'
import { ignoreSafeArea } from '@expo/ui/swift-ui/modifiers'
import { usePreventRemove } from '@react-navigation/native'
import { getColorIOS } from 'expo-color-to-hex'
import { GlassView } from 'expo-glass-effect'
import { useNavigation, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, InputAccessoryView, PlatformColor, StyleSheet, Switch, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

const actionCropContain = [
	{ title: 'config.timeline.cropImage.cover', value: 'cover', systemImage: 'crop' as const },
	{ title: 'config.timeline.cropImage.contain', value: 'contain', systemImage: 'square.arrowtriangle.4.outward' as const, isDestructive: true }
]
export default function Index() {
	const { t } = useTranslation()

	const router = useRouter()
	const navigation = useNavigation()
	const { width, deviceWidth } = useWindowSize()
	const styles = createStyles({ width })
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'

	const { config, setConfig } = useConfigStore()

	// Local (pending) state — not persisted until Save is pressed
	const timeline = config.timeline || defaultSetting.timeline
	const [maxImageHeight, setMaxImageHeight] = useState(String(timeline.maxImageHeight))
	const [maxLength, setMaxLength] = useState(String(timeline.maxLength))
	const [animation, setAnimation] = useState(timeline.animation === 'yes')
	const [cropImage, setCropImage] = useState<'cover' | 'contain'>(timeline.cropImage)
	const [widthInTablet, setWidthInTablet] = useState(String(timeline.widthInTablet ?? defaultSetting.timeline.widthInTablet))
	const nowPlaying = config.nowPlaying || defaultSetting.nowPlaying
	const [attachArtwork, setAttachArtwork] = useState(nowPlaying.attachArtwork === 'yes')
	const [npTemplate, setNpTemplate] = useState(nowPlaying.template || '')
	const isDirty = useRef(false)

	// Load persisted settings on mount
	useEffect(() => {
		const fn = async () => {
			const stored = await getSettings()
			if (stored) {
				setConfig(stored)
				const timeline = stored.timeline || defaultSetting.timeline
				setMaxImageHeight(String(timeline.maxImageHeight))
				setMaxLength(String(timeline.maxLength))
				setAnimation(timeline.animation === 'yes')
				setCropImage(timeline.cropImage)
				setWidthInTablet(String(timeline.widthInTablet ?? defaultSetting.timeline.widthInTablet))
				const nowPlaying = stored.nowPlaying || defaultSetting.nowPlaying
				setAttachArtwork(nowPlaying.attachArtwork === 'yes')
			}
		}
		fn()
	}, [])

	// Mark dirty whenever local state diverges from the loaded config
	const handleChangeMaxImageHeight = (value: string) => {
		setMaxImageHeight(value)
		isDirty.current = true
	}

	const normaliseHeight = (raw: string): number => {
		const parsed = Number.parseInt(raw, 10)
		return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed
	}

	const normaliseTabletWidth = (raw: string): number => {
		const parsed = Number.parseInt(raw, 10)
		if (Number.isNaN(parsed)) return defaultSetting.timeline.widthInTablet
		return Math.min(800, Math.max(100, parsed))
	}

	const handleSave = async () => {
		const heightValue = normaliseHeight(maxImageHeight)
		const lengthValue = normaliseHeight(maxLength)
		const tabletWidthValue = normaliseTabletWidth(widthInTablet)
		setMaxImageHeight(String(heightValue))
		setMaxLength(String(lengthValue))
		setWidthInTablet(String(tabletWidthValue))

		const updated = {
			...config,
			timeline: { ...config.timeline, maxImageHeight: heightValue, maxLength: lengthValue, animation: (animation ? 'yes' : 'no') as 'yes' | 'no', cropImage, widthInTablet: tabletWidthValue },
			nowPlaying: { ...config.nowPlaying, attachArtwork: (attachArtwork ? 'yes' : 'no') as 'yes' | 'no', template: npTemplate || defaultSetting.nowPlaying.template }
		}
		await saveSettings(updated)
		setConfig(updated)
		isDirty.current = false
		router.back()
	}

	usePreventRemove(isDirty.current, ({ data }) => {
		const fn = async () => {
			const result = await confirmDialog(t('config.unsavedChanges.title'), t('config.unsavedChanges.message'), CONTINUE, t)
			if (result === 1) {
				isDirty.current = false
				navigation.dispatch(data.action)
			}
		}
		fn()
	})
	const padding = (deviceWidth - width) / 2 + 20

	return (
		<>
			<KeyboardAwareScrollView style={{ paddingHorizontal: padding, paddingVertical: 20 }} contentContainerStyle={{ gap: 12 }}>
				<Button onPress={() => router.push('/acct')} style={{ padding: 10 }} systemImage="person" width={width - 20} isDark={isDark}>
					{t('screen.acct')}
				</Button>
				<Text style={styles.sectionHeader}>{t('config.timeline.title')}</Text>

				<GlassView style={styles.card}>
					<View style={styles.row}>
						<View style={styles.labelContainer}>
							<Text style={styles.label}>{t('config.timeline.maxImageHeight.label')}</Text>
							<Text style={styles.hint}>{t('config.timeline.maxImageHeight.hint')}</Text>
						</View>
						<TextInput
							value={maxImageHeight}
							onChangeText={handleChangeMaxImageHeight}
							onBlur={() => setMaxImageHeight(String(normaliseHeight(maxImageHeight)))}
							keyboardType="number-pad"
							placeholder="100"
							placeholderTextColor={isDark ? 'lightgray' : 'gray'}
							selectionColor={getColorIOS('systemBlue') || 'blue'}
							style={[staticStyles.input, styles.numberInput, { color: isDark ? 'white' : 'black' }]}
						/>
					</View>
					<View style={styles.divider} />
					<View style={styles.row}>
						<View style={styles.labelContainer}>
							<Text style={styles.label}>{t('config.timeline.maxLength.label')}</Text>
							<Text style={styles.hint}>{t('config.timeline.maxLength.hint')}</Text>
						</View>
						<TextInput
							value={maxLength}
							onChangeText={(v) => {
								setMaxLength(v)
								isDirty.current = true
							}}
							onBlur={() => setMaxLength(String(normaliseHeight(maxLength)))}
							keyboardType="number-pad"
							placeholder="500"
							placeholderTextColor={isDark ? 'lightgray' : 'gray'}
							selectionColor={getColorIOS('systemBlue') || 'blue'}
							style={[staticStyles.input, styles.numberInput, { color: isDark ? 'white' : 'black' }]}
						/>
					</View>
					<View style={styles.divider} />
					<View style={styles.row}>
						<View style={styles.labelContainer}>
							<Text style={styles.label}>{t('config.timeline.animation.label')}</Text>
							<Text style={styles.hint}>{t('config.timeline.animation.hint')}</Text>
						</View>
						<Switch
							value={animation}
							onValueChange={(v) => {
								setAnimation(v)
								isDirty.current = true
							}}
						/>
					</View>
					<View style={styles.divider} />
					<View style={styles.row}>
						<View style={styles.labelContainer}>
							<Text style={styles.label}>{t('config.timeline.cropImage.label')}</Text>
							<Text style={styles.hint}>{t('config.timeline.cropImage.hint')}</Text>
						</View>
						<Dropdown
							data={actionCropContain}
							onSelect={(title) => {
								if (title === 'cover') {
									setCropImage('cover')
									isDirty.current = true
								} else if (title === 'contain') {
									setCropImage('contain')
									isDirty.current = true
								}
							}}
							modifiers={[ignoreSafeArea({ regions: 'all' })]}
						>
							<View style={styles.pickerButton}>
								<Text style={styles.pickerButtonText}>{t(`config.timeline.cropImage.${cropImage}`)}</Text>
								<SymbolView name="chevron.up.chevron.down" type="monochrome" tintColor={getColorIOS('systemBlue') || 'blue'} size={12} />
							</View>
						</Dropdown>
					</View>
					<View style={styles.divider} />
					<View style={styles.row}>
						<View style={styles.labelContainer}>
							<Text style={styles.label}>{t('config.timeline.widthInTablet.label')}</Text>
							<Text style={styles.hint}>{t('config.timeline.widthInTablet.hint')}</Text>
						</View>
						<TextInput
							value={widthInTablet}
							onChangeText={(v) => {
								setWidthInTablet(v)
								isDirty.current = true
							}}
							onBlur={() => setWidthInTablet(String(normaliseTabletWidth(widthInTablet)))}
							keyboardType="number-pad"
							placeholder="350"
							placeholderTextColor={isDark ? 'lightgray' : 'gray'}
							selectionColor={getColorIOS('systemBlue') || 'blue'}
							style={[staticStyles.input, styles.numberInput, { color: isDark ? 'white' : 'black' }]}
						/>
					</View>
				</GlassView>

				<Text style={styles.sectionHeader}>{t('config.nowPlaying.title')}</Text>

				<GlassView style={styles.card}>
					<View style={styles.row}>
						<View style={styles.labelContainer}>
							<Text style={styles.label}>{t('config.nowPlaying.attachArtwork.label')}</Text>
							<Text style={styles.hint}>{t('config.nowPlaying.attachArtwork.hint')}</Text>
						</View>
						<Switch
							value={attachArtwork}
							onValueChange={(v) => {
								setAttachArtwork(v)
								isDirty.current = true
							}}
						/>
					</View>
					<View style={styles.divider} />
					<View style={[styles.row, { paddingVertical: 0, paddingTop: 14, paddingBottom: 8 }]}>
						<View style={styles.labelContainer}>
							<Text style={styles.label}>{t('config.nowPlaying.template.label')}</Text>
							<Text style={styles.hint}>{t('config.nowPlaying.template.hint')}</Text>
						</View>
					</View>
					<TextInput
						value={npTemplate}
						multiline={true}
						onChangeText={(v) => {
							setNpTemplate(v)
							isDirty.current = true
						}}
						keyboardType="default"
						placeholder={nowPlaying.template}
						placeholderTextColor={isDark ? 'lightgray' : 'gray'}
						selectionColor={getColorIOS('systemBlue') || 'blue'}
						inputAccessoryViewID="templateSuggest"
						style={[staticStyles.input, styles.multiline, { color: isDark ? 'white' : 'black' }]}
					/>
				</GlassView>

				<Button onPress={() => router.push('/about')} style={{ padding: 10 }} systemImage="info.circle" width={width - 20} isDark={isDark}>
					{t('screen.about')}
				</Button>
			</KeyboardAwareScrollView>
			<InputAccessoryView nativeID="templateSuggest">
				<View style={{ backgroundColor: PlatformColor('systemBackground'), height: 40, width: '100%' }}>
					<FlatList
						data={['{song}', '{artist}', '{album}', '{url}', '{Source}'] as any}
						horizontal={true}
						renderItem={({ item }: any) => (
							<TouchableOpacity style={[styles.suggested]} onPress={() => setNpTemplate((prev) => prev + item)}>
								<Text>{item}</Text>
							</TouchableOpacity>
						)}
						keyExtractor={(s) => s}
						style={{}}
						keyboardShouldPersistTaps="handled"
					/>
				</View>
			</InputAccessoryView>
			<View style={{ height: 80 }} />
			<Button isPrimary={true} onPress={handleSave} style={styles.save} systemImage="checkmark" width={width - 20} isDark={isDark}>
				{t('config.save')}
			</Button>
		</>
	)
}
const createStyles = (_: { width: number }) =>
	StyleSheet.create({
		sectionHeader: {
			fontSize: 13,
			fontWeight: '600',
			color: PlatformColor('secondaryLabel'),
			letterSpacing: 0.5,
			paddingHorizontal: 4
		},
		card: {
			borderRadius: 16,
			overflow: 'hidden'
		},
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingHorizontal: 16,
			paddingVertical: 14,
			gap: 12
		},
		labelContainer: {
			flex: 1
		},
		label: {
			fontSize: 16
		},
		hint: {
			fontSize: 12,
			color: PlatformColor('secondaryLabel'),
			marginTop: 2
		},
		numberInput: {
			width: 80,
			textAlign: 'center',
			padding: 10,
			flexShrink: 0
		},
		multiline: {
			marginHorizontal: 16,
			marginBottom: 16
		},
		divider: {
			height: 1,
			backgroundColor: PlatformColor('separator'),
			marginHorizontal: 16
		},
		currentValue: {
			fontSize: 16,
			color: PlatformColor('secondaryLabel'),
			flexShrink: 0
		},
		pickerButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 5,
			paddingHorizontal: 12,
			paddingVertical: 7,
			borderRadius: 8,
			backgroundColor: PlatformColor('systemGray5')
		},
		pickerButtonText: {
			fontSize: 15,
			color: PlatformColor('label')
		},
		suggested: {
			height: 40,
			marginHorizontal: 5,
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center'
		},
		save: {
			position: 'absolute',
			bottom: 20,
			left: 20,
			right: 20,
			padding: 10
		}
	})
