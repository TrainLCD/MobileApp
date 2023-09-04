import React, { useCallback } from 'react'
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import Typography from './Typography'

type Props = {
  style: StyleProp<ViewStyle>
  value: boolean
  onValueChange: (value: boolean) => void
}

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cell: {
    width: 25,
    height: 30,
    marginTop: -2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#212121',
    fontWeight: 'bold',
  },
})

const LEDThemeSwitch = ({ style, value, onValueChange }: Props) => {
  const handleContainerPress = useCallback(
    () => onValueChange(!value),
    [onValueChange, value]
  )
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleContainerPress}
      style={[
        { ...styles.container, borderColor: value ? '#fff' : '#555' },
        style,
      ]}
    >
      <View
        style={[
          styles.cell,
          {
            backgroundColor: value ? '#fff' : '#555',
            marginLeft: value ? 25 : 0,
          },
        ]}
      >
        <Typography style={styles.label}>{value ? 'ON' : 'OFF'}</Typography>
      </View>
    </TouchableOpacity>
  )
}

export default LEDThemeSwitch

// style={{ marginRight: 8 }}
// value={losslessEnabled}
// onValueChange={onLosslessAudioEnabledValueChange}
