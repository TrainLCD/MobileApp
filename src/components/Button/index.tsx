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
  children: React.ReactNode;
  color?: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}

const Button: React.FC<Props> = ({
  children,
  color,
  onPress,
  style,
}: Props) => {
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
      textAlign: 'center',
    },
  });

  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
};

Button.defaultProps = {
  color: '#333',
  style: {},
};

export default Button;
