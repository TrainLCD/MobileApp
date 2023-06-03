import React, { useCallback, useState } from 'react'
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import useClock from '../hooks/useClock'
import useIntervalEffect from '../hooks/useIntervalEffect'
import isTablet from '../utils/isTablet'

const styles = StyleSheet.create({
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockItem: {
    fontWeight: 'bold',
    textAlign: 'right',
    fontSize: isTablet ? RFValue(21) : RFValue(16),
  },
})

type Props = {
  style: ViewStyle
  white?: boolean
  bold?: boolean
}

const Clock = ({ style, white, bold }: Props): React.ReactElement => {
  const [hours, minutes] = useClock()
  const [colonOpacity, setColonOpacity] = useState(0)

  useIntervalEffect(
    useCallback(() => {
      setColonOpacity((prev) => (prev === 0 ? 1 : 0))
    }, []),
    500
  )

  const textCustomStyle: TextStyle = {
    color: white ? 'white' : '#3a3a3a',
    fontWeight: bold ? 'bold' : 'normal',
  }

  return (
    <View style={[style, styles.clockContainer]}>
      <Text style={[styles.clockItem, textCustomStyle]}>{hours}</Text>
      <Text
        style={[styles.clockItem, textCustomStyle, { opacity: colonOpacity }]}
      >
        :
      </Text>
      <Text style={[styles.clockItem, textCustomStyle]}>{minutes}</Text>
    </View>
  )
}

export default Clock
