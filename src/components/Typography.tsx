import React, { useMemo } from 'react'
import { Text, TextProps } from 'react-native'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import { FONTS } from '../constants'

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
        includeFontPadding: false,
        textAlignVertical: 'center' as const,
      },
      overrideStyle,
    ],
    [fontFamily, isLEDTheme, overrideStyle]
  )
  return <Text {...props} allowFontScaling={false} style={style} />
}

export default React.memo(Typography)
