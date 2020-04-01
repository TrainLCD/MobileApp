import React from 'react';
import {
    GestureResponderEvent, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle,
} from 'react-native';

interface IProps {
  text: string;
  color?: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}

const Button = (props: IProps) => {
  const { text, color, onPress, style } = props;

  const styles = StyleSheet.create({
    button: {
      backgroundColor: color || '#333',
      paddingTop: 8,
      paddingRight: 12,
      paddingLeft: 12,
      paddingBottom: 8,
      elevation: 2,
      borderRadius: 4,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowRadius: 2,
    },
    text: {
      color: '#fff',
      fontSize: 16,
    },
  });

  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
};

export default Button;
