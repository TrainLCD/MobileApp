import { useAtomValue } from 'jotai';
import type React from 'react';
import { useMemo } from 'react';
import {
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

type Props = {
  children: React.ReactNode;
  onToggle: (event: GestureResponderEvent) => void;
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  state?: boolean;
  onText?: string;
  offText?: string;
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
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonLED: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: RFValue(14),
    color: '#fff',
  },
  outlinedButton: {
    borderColor: '#008ffe',
    borderWidth: 1,
  },
  outlinedButtonText: {
    fontWeight: 'bold',
    color: '#008ffe',
  },
  stateIndicator: {
    minWidth: isTablet ? 96 : 64,
    maxWidth: isTablet ? 108 : 72,
    height: isTablet ? 40 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
  },
  stateIndicatorText: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
});

export const StatePanel = ({
  state,
  onText = 'ON',
  offText = 'OFF',
  disabled,
}: {
  state: boolean;
  onText?: string;
  offText?: string;
  disabled?: boolean;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const styleIndicatorStyle: StyleProp<ViewStyle> = useMemo(
    () =>
      isLEDTheme
        ? {
            backgroundColor: state ? '#008ffe' : LED_THEME_BG_COLOR,
            borderColor: state ? '#008ffe' : '#fff',
            opacity: disabled ? 0.5 : 1,
            borderRadius: 0,
          }
        : {
            backgroundColor: state ? '#008ffe' : '#fff',
            borderColor: state ? '#008ffe' : '#aaa',
            opacity: disabled ? 0.5 : 1,
            borderRadius: 8,
          },
    [isLEDTheme, state, disabled]
  );

  return (
    <View style={[styles.stateIndicator, styleIndicatorStyle]}>
      <Typography
        style={[styles.stateIndicatorText, { color: state ? '#fff' : '#888' }]}
      >
        {state ? onText : offText}
      </Typography>
    </View>
  );
};

export const ToggleButton: React.FC<Props> = ({
  children,
  onToggle,
  outline,
  style,
  textStyle,
  state,
  onText = 'ON',
  offText = 'OFF',
}: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        isLEDTheme ? styles.buttonLED : styles.button,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#008ffe',
        },
        outline && [
          styles.outlinedButton,
          {
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          },
        ],
        style,
      ]}
    >
      <Typography
        numberOfLines={1}
        style={[styles.text, outline && styles.outlinedButtonText, textStyle]}
      >
        {children}
      </Typography>

      <StatePanel state={!!state} onText={onText} offText={offText} />
    </TouchableOpacity>
  );
};
