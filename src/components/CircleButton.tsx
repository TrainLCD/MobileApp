import React from 'react';
import {
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import type { ButtonTestId } from '~/test/e2e';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
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
    width: 100,
    height: 100,
    borderRadius: 50,
    paddingVertical: isTablet ? 12 : 8,
    paddingHorizontal: isTablet ? 16 : 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLED: {
    width: 100,
    height: 100,
    paddingVertical: 8,
    paddingHorizontal: isTablet ? 18 : 12,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: RFValue(16),
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

const CircleButton: React.FC<Props> = ({
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

export default React.memo(CircleButton);
