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
import { LED_THEME_BG_COLOR } from '~/constants';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import type { ButtonTestId } from '~/test/e2e';
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
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
  },
  buttonLED: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
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
    borderWidth: 1,
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
  const colors = useAppColors();

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        isLEDTheme ? styles.buttonLED : styles.button,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : colors.accent,
          borderColor: isLEDTheme ? '#fff' : colors.cardBorder,
          opacity: disabled ? 0.5 : 1,
        },
        outline && [
          styles.outlinedButton,
          {
            borderColor: colors.accent,
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : colors.surface,
          },
        ],
        style,
      ]}
      testID={testID}
    >
      <Typography
        numberOfLines={1}
        style={[
          styles.text,
          outline && { fontWeight: 'bold' as const, color: colors.accent },
          textStyle,
        ]}
      >
        {children}
      </Typography>
    </TouchableOpacity>
  );
};

export default Button;
