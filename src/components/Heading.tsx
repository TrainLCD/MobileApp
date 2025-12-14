import type React from 'react';
import { StyleSheet, type TextProps } from 'react-native';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

type Props = {
  children: React.ReactNode;
  singleLine?: boolean;
} & TextProps;

const styles = StyleSheet.create({
  text: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
});

export const Heading: React.FC<Props> = ({
  children,
  style,
  singleLine,
  numberOfLines,
  ...props
}: Props) => {
  return (
    <Typography
      adjustsFontSizeToFit
      style={[styles.text, style]}
      {...props}
      numberOfLines={singleLine ? 1 : numberOfLines}
    >
      {children}
    </Typography>
  );
};
