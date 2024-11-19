import React, { LegacyRef, forwardRef, useMemo } from 'react'
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native'
import { FONTS } from '../constants'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'

const Typography = forwardRef((props: TextProps, ref: LegacyRef<Text>) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const fontFamily = useMemo(() => {
    if (isLEDTheme) {
      return FONTS.JFDotJiskan24h
    }
    return StyleSheet.flatten(props.style).fontWeight === 'bold'
      ? FONTS.RobotoBold
      : FONTS.RobotoRegular
  }, [isLEDTheme, props.style])

  const style = useMemo<StyleProp<TextStyle>>(
    () => [
      {
        fontFamily,
        color: isLEDTheme ? '#fff' : '#333',
        textAlignVertical: 'top',
      },
      props.style,
    ],
    [fontFamily, isLEDTheme, props.style]
  )
  return <Text {...props} ref={ref} allowFontScaling={false} style={style} />
})

Typography.displayName = 'Typography'

export default React.memo(Typography)
