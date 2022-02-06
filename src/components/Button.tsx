import React from 'react';
import {
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import isTablet from '../utils/isTablet';

interface Props {
  children: React.ReactNode;
  color?: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const Button: React.FC<Props> = ({
  children,
  color,
  onPress,
  style,
  disabled,
}: Props) => {
  const styles = StyleSheet.create({
    button: {
      backgroundColor: color,
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
      opacity: disabled ? 0.5 : 1,
    },
    text: {
      color: '#fff',
      fontSize: RFValue(14),
      textAlign: 'center',
    },
  });

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[styles.button, style]}
    >
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
};

Button.defaultProps = {
  color: '#333',
  style: {},
  disabled: false,
};

export default Button;
