import React, { useMemo } from 'react'
import { Text, TextProps } from 'react-native'
import FONTS from '../constants/fonts'

const Typography = (props: TextProps) => {
  const { style: overrideStyle } = props
  const isBold = useMemo(
    () => (overrideStyle as any).fontWeight === 'bold',
    [overrideStyle]
  )
  const style = useMemo(
    () => [
      { fontFamily: isBold ? FONTS.RobotoBold : FONTS.RobotoRegular },
      overrideStyle as any,
    ],
    [isBold, overrideStyle]
  )
  return <Text {...props} allowFontScaling={false} style={style} />
}

export default Typography
