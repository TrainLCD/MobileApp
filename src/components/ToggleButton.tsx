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
import { useAppColors } from '~/providers/AppColorsProvider';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

type Props = {
  children: React.ReactNode;
  onToggle: (event: GestureResponderEvent) => void;
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
  statePanelStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  state?: boolean;
  onText?: string;
  offText?: string;
  activeOpacity?: number;
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
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
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: isTablet ? RFValue(12) : RFValue(14),
    color: '#fff',
  },
  textFill: {
    flex: 1,
    marginRight: 12,
  },
  outlinedButton: {
    borderWidth: 1,
  },
  stateIndicator: {
    minWidth: isTablet ? 96 : 64,
    maxWidth: isTablet ? 108 : 72,
    height: isTablet ? 40 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  stateIndicatorText: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
});

export const StatePanel = ({
  state,
  onText = 'ON',
  offText = 'OFF',
  disabled,
  style,
}: {
  state: boolean;
  onText?: string;
  offText?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

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
            backgroundColor: state ? colors.accent : colors.surface,
            borderColor: state ? colors.accent : colors.panelOffBorder,
            opacity: disabled ? 0.5 : 1,
            borderRadius: 8,
          },
    [isLEDTheme, state, disabled, colors]
  );

  return (
    <View style={[styles.stateIndicator, styleIndicatorStyle, style]}>
      <Typography
        style={[
          styles.stateIndicatorText,
          { color: state ? '#fff' : colors.panelOffText },
        ]}
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
  statePanelStyle,
  textStyle,
  state,
  onText = 'ON',
  offText = 'OFF',
  activeOpacity,
}: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={activeOpacity}
      style={[
        isLEDTheme ? styles.buttonLED : styles.button,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : colors.accent,
          borderColor: isLEDTheme ? '#fff' : colors.cardBorder,
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
    >
      <Typography
        numberOfLines={1}
        style={[
          styles.text,
          styles.textFill,
          outline && { fontWeight: 'bold' as const, color: colors.accent },
          textStyle,
        ]}
      >
        {children}
      </Typography>

      <StatePanel
        state={!!state}
        onText={onText}
        offText={offText}
        style={statePanelStyle}
      />
    </TouchableOpacity>
  );
};
