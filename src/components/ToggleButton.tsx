import { useAtomValue } from 'jotai';
import type React from 'react';
import {
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import isTablet from '~/utils/isTablet';
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
    paddingVertical: 8,
    paddingHorizontal: isTablet ? 18 : 12,
    borderWidth: 1,
    borderColor: '#fff',
    flexDirection: 'row',
  },
  text: {
    fontSize: RFValue(14),
    color: '#fff',
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

  return (
    <View
      style={[
        styles.stateIndicator,
        {
          backgroundColor: state ? '#008ffe' : '#fff',
          borderColor: state ? '#008ffe' : '#aaa',
          opacity: disabled ? 0.5 : 1,
          borderRadius: isLEDTheme ? 0 : 8,
        },
      ]}
    >
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
          backgroundColor: isLEDTheme ? '#212121' : '#008ffe',
        },
        outline && styles.outlinedButton,
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
