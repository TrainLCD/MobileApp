import React, { useMemo } from 'react'
import { Text, TextProps } from 'react-native'
import FONTS from '../constants/fonts'

const Typography = (props: TextProps) => {
  const { style: overrideStyle } = props
  const style = useMemo(
    () => [
      {
        fontFamily:
          (overrideStyle as { fontWeight: string })?.fontWeight === 'bold'
            ? FONTS.RobotoBold
            : FONTS.RobotoRegular,
      },
      overrideStyle,
    ],
    [overrideStyle]
  )
  return <Text {...props} allowFontScaling={false} style={style} />
}

export default Typography
