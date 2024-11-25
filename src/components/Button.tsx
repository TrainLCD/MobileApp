import React from 'react'
import {
  GestureResponderEvent,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'
import isTablet from '../utils/isTablet'
import { RFValue } from '../utils/rfValue'
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
    height: Platform.select({ ios: 55, android: undefined }),
    justifyContent: 'center',
    paddingVertical: 8,
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
    paddingVertical: 8,
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
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

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
      <Typography numberOfLines={1} style={styles.text}>
        {children}
      </Typography>
    </TouchableOpacity>
  )
}

export default Button
