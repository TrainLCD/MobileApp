import React from 'react'
import { StyleProp, StyleSheet, TextStyle } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import Typography from './Typography'

interface Props {
  children: React.ReactNode
  style?: StyleProp<TextStyle>
}

const styles = StyleSheet.create({
  text: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
})

const Heading: React.FC<Props> = ({ children, style }: Props) => {
  return <Typography style={[styles.text, style]}>{children}</Typography>
}

export default Heading
