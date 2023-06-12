import { grayscale } from 'polished'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LineResponse } from '../gen/stationapi_pb'
import prependHEX from '../utils/prependHEX'

interface Props {
  line: LineResponse.AsObject
  small?: boolean
  shouldGrayscale?: boolean
}

const TransferLineDot: React.FC<Props> = ({
  line,
  small,
  shouldGrayscale,
}: Props) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: small ? 20 : 38,
      height: small ? 20 : 38,
      borderRadius: 1,
      marginRight: 4,
      opacity: shouldGrayscale ? 0.5 : 1,
    },
  })

  const fadedLineColor = grayscale(prependHEX(line?.color ?? '#ccc'))

  return (
    <View
      style={[
        styles.lineDot,
        {
          backgroundColor: !shouldGrayscale
            ? prependHEX(line.color ?? '#000')
            : fadedLineColor,
        },
      ]}
    />
  )
}

export default TransferLineDot
