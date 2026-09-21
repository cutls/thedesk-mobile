import { useWindowSize } from '@/hooks/useWindowSize'
import type { ActionProps, IState } from '@/utils/type'
import RNBottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { GlassView } from 'expo-glass-effect'
import React from 'react'
import { PlatformColor, StyleSheet } from 'react-native'
import ComposeSheet from './ComposeSheet'

interface Props {
	isOpened: boolean
	setIsOpened: IState<boolean>
	composeAction: ActionProps | null
	clearComposeAction: (acctId: string) => void
}
const GlassViewCustom = (props: React.ComponentProps<typeof GlassView>) => <GlassView {...props} style={[props.style, { borderRadius: 20, marginBottom: 5 }]} />
export default function ComposeSheetBase({ isOpened, setIsOpened, composeAction, clearComposeAction }: Props) {
	const { width } = useWindowSize()
	const textColor = PlatformColor('label')
	const bottomSheetRef = React.useRef<RNBottomSheet>(null)
	return (
		<RNBottomSheet
			handleComponent={null}
			snapPoints={[350]}
			keyboardBlurBehavior="none"
			detached={true}
			ref={bottomSheetRef}
			onChange={(e) => setIsOpened(e !== -1)}
			style={{ zIndex: 5 }}
			backgroundComponent={GlassViewCustom}
			enableBlurKeyboardOnGesture={true}
			enableDynamicSizing={false}
			index={isOpened ? 0 : -1}
			animationConfigs={{ duration: 10 }}
			backdropComponent={(props) => <BottomSheetBackdrop {...props} opacity={0.5} onPress={() => bottomSheetRef.current?.close()} disappearsOnIndex={-1} />}
		>
			<BottomSheetView style={styles.contentContainer}>
				{isOpened && <ComposeSheet
					isOpened={isOpened}
					isInSheet={true}
					open={() => setIsOpened(true)}
					close={() => bottomSheetRef.current?.close()}
					composeAction={composeAction}
					clearComposeAction={clearComposeAction}
				/>}
			</BottomSheetView>
		</RNBottomSheet>
	)
}
const styles = StyleSheet.create({
	contentContainer: {
		backgroundColor: 'transparent',
		padding: 10,
		zIndex: 5
	}
})
