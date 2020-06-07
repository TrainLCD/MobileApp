import React from 'react';
import {
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

const { isTablet } = DeviceInfo;

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
      paddingVertical: isTablet ? 12 : 8,
      paddingHorizontal: isTablet ? 18 : 12,
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
      fontSize: isTablet ? 24 : 16,
    },
  });

  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
};

export default Button;
