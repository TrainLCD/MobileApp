import { useAtomValue } from 'jotai';
import type React from 'react';
import {
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import type { ButtonTestId } from '~/test/e2e';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

type Props = {
  children: React.ReactNode;
  onPress: (event: GestureResponderEvent) => void;
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  testID?: ButtonTestId | string | undefined;
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 1,
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
  },
  buttonLED: {
    paddingVertical: 8,
    paddingHorizontal: isTablet ? 18 : 12,
    borderWidth: 1,
    borderColor: '#fff',
  },
  text: {
    fontSize: RFValue(14),
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
  outlinedButton: {
    borderColor: '#008ffe',
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  outlinedButtonText: {
    fontWeight: 'bold',
    color: '#008ffe',
  },
});

const Button: React.FC<Props> = ({
  children,
  onPress,
  outline,
  style,
  textStyle,
  disabled,
  testID,
}: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        isLEDTheme ? styles.buttonLED : styles.button,
        {
          backgroundColor: isLEDTheme ? '#212121' : '#008ffe',
          opacity: disabled ? 0.5 : 1,
        },
        outline && styles.outlinedButton,
        style,
      ]}
      testID={testID}
    >
      <Typography
        numberOfLines={1}
        style={[styles.text, outline && styles.outlinedButtonText, textStyle]}
      >
        {children}
      </Typography>
    </TouchableOpacity>
  );
};

export default Button;
