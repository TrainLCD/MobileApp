import React, { LegacyRef, forwardRef, useMemo } from 'react'
import { Text, TextProps } from 'react-native'
import { useRecoilValue } from 'recoil'
import { FONTS } from '../constants'
import { isLEDSelector } from '../store/selectors/isLED'

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

  const style = useMemo(
    () => [
      {
        fontFamily,
        color: isLEDTheme ? '#fff' : '#333',
      },
      overrideStyle,
    ],
    [fontFamily, isLEDTheme, overrideStyle]
  )
  return <Text {...props} ref={ref} allowFontScaling={false} style={style} />
})

Typography.displayName = 'Typography'

export default React.memo(Typography)
