import React, { LegacyRef, forwardRef, useMemo } from 'react'
import { Text, TextProps } from 'react-native'
import { FONTS } from '../constants'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'

const Typography = forwardRef((props: TextProps, ref: LegacyRef<Text>) => {
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
  return <Text {...props} ref={ref} allowFontScaling={false} style={style} />
})

Typography.displayName = 'Typography'

export default React.memo(Typography)
