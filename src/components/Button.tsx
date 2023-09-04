import React from 'react'
import {
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import isTablet from '../utils/isTablet'
import Typography from './Typography'

interface Props {
  children: React.ReactNode
  color?: string
  onPress: (event: GestureResponderEvent) => void
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: isTablet ? 12 : 8,
    paddingHorizontal: isTablet ? 18 : 12,
    elevation: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 2,
  },
  buttonLED: {
    paddingVertical: isTablet ? 12 : 8,
    paddingHorizontal: isTablet ? 18 : 12,
  },
  text: {
    color: '#fff',
    fontSize: RFValue(14),
    textAlign: 'center',
  },
})

const Button: React.FC<Props> = ({
  children,
  color,
  onPress,
  style,
  disabled,
}: Props) => {
  const isLEDTheme = useIsLEDTheme()

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        {
          ...(isLEDTheme ? styles.buttonLED : styles.button),
          backgroundColor: isLEDTheme ? color : color ?? '#333',
          borderWidth: isLEDTheme && !color ? 2 : 0,
          borderColor: isLEDTheme ? 'white' : undefined,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Typography style={styles.text}>{children}</Typography>
    </TouchableOpacity>
  )
}

export default Button
