import React, { useCallback, useState } from 'react'
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import useClock from '../hooks/useClock'
import useIntervalEffect from '../hooks/useIntervalEffect'
import isTablet from '../utils/isTablet'
import Typography from './Typography'

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
      <Typography style={[styles.clockItem, textCustomStyle]}>
        {hours}
      </Typography>
      <Typography
        style={[styles.clockItem, textCustomStyle, { opacity: colonOpacity }]}
      >
        :
      </Typography>
      <Typography style={[styles.clockItem, textCustomStyle]}>
        {minutes}
      </Typography>
    </View>
  )
}

export default Clock
