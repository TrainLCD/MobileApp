import React, { useMemo } from 'react'
import { Text, TextProps } from 'react-native'
import FONTS from '../constants/fonts'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'

const Typography = (props: TextProps) => {
  const { style: overrideStyle } = props
  const isLEDTheme = useIsLEDTheme()

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
        color: isLEDTheme ? '#fff' : '#000',
      },
      overrideStyle,
    ],
    [fontFamily, isLEDTheme, overrideStyle]
  )
  return <Text {...props} allowFontScaling={false} style={style} />
}

export default Typography
