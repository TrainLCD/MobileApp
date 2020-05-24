import React from 'react';
import {
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  Platform,
  PlatformIOSStatic,
} from 'react-native';

const { isPad } = Platform as PlatformIOSStatic;

interface Props {
  text: string;
  color?: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}

const Button: React.FC<Props> = ({ text, color, onPress, style }: Props) => {
  const styles = StyleSheet.create({
    button: {
      backgroundColor: color || '#333',
      paddingVertical: isPad ? 12 : 8,
      paddingHorizontal: isPad ? 18 : 12,
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
      fontSize: isPad ? 24 : 16,
    },
  });

  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
};

export default Button;
