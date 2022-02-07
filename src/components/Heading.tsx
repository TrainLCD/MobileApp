import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
});

const Heading: React.FC<Props> = ({ children, style }: Props) => {
  return <Text style={[styles.text, style]}>{children}</Text>;
};

Heading.defaultProps = {
  style: {},
};

export default Heading;
