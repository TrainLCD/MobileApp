import React, { LegacyRef, forwardRef, useMemo } from 'react'
import { StyleProp, Text, TextProps, TextStyle } from 'react-native'
import { FONTS } from '../constants'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'
import isTablet from '../utils/isTablet'

const Typography = forwardRef((props: TextProps, ref: LegacyRef<Text>) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const { style: overrideStyle } = props

  const fontFamily = useMemo(
    () => (isLEDTheme ? FONTS.JFDotJiskan24h : undefined),
    [isLEDTheme]
  )

  const style = useMemo<StyleProp<TextStyle>>(
    () => [
      {
        fontFamily,
        color: isLEDTheme ? '#fff' : '#333',
        includeFontPadding: !isTablet,
      },
      overrideStyle,
    ],
    [fontFamily, isLEDTheme, overrideStyle]
  )
  return (
    <Text
      {...props}
      ref={ref}
      allowFontScaling={false}
      style={style}
      textBreakStrategy="highQuality"
    />
  )
})

Typography.displayName = 'Typography'

export default React.memo(Typography)
