import React, { memo } from 'react';
import {
  Text,
  StyleSheet,
  Platform,
  PlatformIOSStatic,
  StyleProp,
  TextStyle,
} from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

const { isPad } = Platform as PlatformIOSStatic;

const styles = StyleSheet.create({
  text: {
    fontSize: isPad ? 32 : 24,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
});

const Heading: React.FC<Props> = ({ children, style }: Props) => {
  return <Text style={[styles.text, style]}>{children}</Text>;
};

export default memo(Heading);
