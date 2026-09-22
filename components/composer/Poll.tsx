import type { Poll as IPoll } from '@/entities/status'
import { useWindowSize } from '@/hooks/useWindowSize'
import type { ComposeMode } from '@/utils/type'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlatformColor, StyleSheet, Switch, useColorScheme, View } from 'react-native'
import { Text } from '../themed/Text'
import { TextInputMulti } from '../themed/TextInputMulti'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
import { TransView } from '../ui/TransView'

interface Props {
	changeMode: (m: ComposeMode) => void
	addPoll: (poll: IPoll | null) => void
	defaultPoll: IPoll | null
	maxPollsOptions: number
}
const expiresList = [
	{ title: 'composer.poll.5min', value: '300' },
	{ title: 'composer.poll.30min', value: '1800' },
	{ title: 'composer.poll.1h', value: '3600' },
	{ title: 'composer.poll.6h', value: '21600' },
	{ title: 'composer.poll.1d', value: '86400' },
	{ title: 'composer.poll.3d', value: '259200' },
	{ title: 'composer.poll.7d', value: '604800' }
]

export default function Poll({ changeMode, addPoll, defaultPoll, maxPollsOptions }: Props) {
	const { t } = useTranslation()
	const { width } = useWindowSize()
	const styles = createStyles({ width })
	const colorScheme = useColorScheme()
	const isDark = colorScheme === 'dark'
	const textColor = PlatformColor('label')
	const [options, setOptions] = useState<Array<string>>(defaultPoll?.options || ['', ''])
	const [expires, setExpires] = useState(defaultPoll?.expires_in || 300) // default 1 day
	const [isMultiple, setIsMultiple] = useState(defaultPoll?.multiple || false)
	const [hideTotals, setHideTotals] = useState(defaultPoll?.hide_totals || false)
	const [optionMenu, setOptionMenu] = useState(false)
	const makeAddPoll = () => {
		const poll: IPoll = {
			options: options,
			expires_in: expires,
			multiple: isMultiple,
			hide_totals: hideTotals
		}
		addPoll(poll)
	}
	return (
		<View style={styles.container}>
			<Text style={styles.title}>{t('composer.menu.poll')}</Text>
			{options.map((opt, idx) => (
				<View key={`${idx}${opt}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
					<TextInputMulti
						defaultValue={opt}
						onBlur={(t) => {
							const newOpts = [...options]
							newOpts[idx] = t
							setOptions(newOpts)
						}}
						placeholder={`${t('composer.poll.option')}${idx + 1}`}
						isDark={isDark}
					/>
					<Button
						style={{ width: 50, height: 50 }}
						width={50}
						isDark={isDark}
						disabled={options.length === 2}
						onPress={() => setOptions((o) => o.filter((_a, i) => i !== idx))}
						color="red"
						systemImage="xmark"
					></Button>
				</View>
			))}
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
				<Button width={100} isDark={isDark} style={{ width: 100, height: 50 }} onPress={() => setOptionMenu(!optionMenu)}>
					{t('composer.poll.config')}
				</Button>
				<Dropdown data={expiresList} onSelect={(v) => setExpires(parseInt(v, 10))} modifiers={[]} style={{ width: 100, height: 50 }}>
					<Button width={100} systemImage="clock" isDark={isDark} style={{ width: 100, height: 50 }}>
						{t(expiresList.find((s) => s.value === expires.toString())?.title || '')}
					</Button>
				</Dropdown>
				<Button width={100} isDark={isDark} style={{ width: 100, height: 50 }} disabled={options.length === maxPollsOptions} onPress={() => setOptions((o) => [...o, ''])} systemImage="plus">
					{t('composer.poll.addOption')}
				</Button>
			</View>
			{optionMenu && (
				<TransView style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
					<Text>{t('composer.poll.multiple')}</Text>
					<Switch value={isMultiple} onValueChange={(v) => setIsMultiple(v)} />
				</TransView>
			)}
			{optionMenu && (
				<TransView style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
					<Text>{t('composer.poll.hideTotals')}</Text>
					<Switch value={hideTotals} onValueChange={(v) => setHideTotals(v)} />
				</TransView>
			)}
			<View>
				<Button width={width - 40} style={{ height: 50 }} isDark={isDark} isPrimary={true} onPress={() => makeAddPoll()}>
					{t('ok')}
				</Button>
				<Button width={width - 40} isDark={isDark} style={{ marginTop: 10, height: 50 }} onPress={() => changeMode('compose')}>
					{t('cancel')}
				</Button>
				{defaultPoll && (
					<Button width={width - 40} isDark={isDark} style={{ marginTop: 10, height: 50 }} color="red" onPress={() => addPoll(null)}>
						{t('composer.remove')}
					</Button>
				)}
				<View style={{ height: 20 }} />
			</View>
		</View>
	)
}
const createStyles = ({ width }: { width: number }) =>
	StyleSheet.create({
		title: {
			fontSize: 20,
			fontWeight: '600',
			marginBottom: 20
		},
		container: {
			minHeight: 350,
			display: 'flex',
			justifyContent: 'space-between'
		}
	})
