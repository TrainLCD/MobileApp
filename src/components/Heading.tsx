import type React from 'react';
import { type StyleProp, StyleSheet, type TextStyle } from 'react-native';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
});

export const Heading: React.FC<Props> = ({ children, style }: Props) => {
  return <Typography style={[styles.text, style]}>{children}</Typography>;
};
