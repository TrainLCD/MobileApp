import React, { LegacyRef, forwardRef, useMemo } from 'react'
import { Platform, StyleProp, Text, TextProps, TextStyle } from 'react-native'
import { useRecoilValue } from 'recoil'
import { FONTS } from '../constants'
import { isLEDSelector } from '../store/selectors/isLED'
import isTablet from '../utils/isTablet'

const Typography = forwardRef((props: TextProps, ref: LegacyRef<Text>) => {
  const isLEDTheme = useRecoilValue(isLEDSelector)

  const { style: overrideStyle } = props

  const fontFamily = useMemo(() => {
    if (isLEDTheme) {
      return FONTS.JFDotJiskan24h
    }
    return (overrideStyle as { fontWeight: string })?.fontWeight === 'bold'
      ? FONTS.RobotoBold
      : FONTS.RobotoRegular
  }, [isLEDTheme, overrideStyle])

  const style = useMemo<StyleProp<TextStyle>>(
    () => [
      {
        fontFamily,
        color: isLEDTheme ? '#fff' : '#333',
        marginTop: Platform.select({
          ios: 0,
          android: isLEDTheme || !isTablet ? 0 : -6,
        }),
      },
      overrideStyle,
    ],
    [fontFamily, isLEDTheme, overrideStyle]
  )
  return <Text {...props} ref={ref} allowFontScaling={false} style={style} />
})

Typography.displayName = 'Typography'

export default React.memo(Typography)
