import type React from 'react';
import {
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { useThemeStore } from '../hooks/useThemeStore';
import { APP_THEME } from '../models/Theme';
import type { ButtonTestId } from '../test/e2e';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

type Props = {
  children: React.ReactNode;
  color?: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: ButtonTestId | string | undefined;
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: isTablet ? 12 : 8,
    paddingHorizontal: isTablet ? 16 : 12,
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
  buttonLED: {
    paddingVertical: 8,
    paddingHorizontal: isTablet ? 18 : 12,
  },
  text: {
    color: '#fff',
    fontSize: RFValue(14),
    textAlign: 'center',
  },
});

const Button: React.FC<Props> = ({
  children,
  color,
  onPress,
  style,
  disabled,
  testID,
}: Props) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        {
          ...(isLEDTheme ? styles.buttonLED : styles.button),
          backgroundColor: isLEDTheme ? color : (color ?? '#333'),
          borderWidth: isLEDTheme && !color ? 2 : 0,
          borderColor: isLEDTheme ? 'white' : undefined,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      testID={testID}
    >
      <Typography numberOfLines={1} style={styles.text}>
        {children}
      </Typography>
    </TouchableOpacity>
  );
};

export default Button;
