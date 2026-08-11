import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import type React from 'react';
import {
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

const BOX_SIZE = 22;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: RFValue(13),
  },
});

type Props = {
  checked: boolean;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Checkbox: React.FC<Props> = ({
  checked,
  onPress,
  children,
  disabled,
  style,
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      // タップ判定がボックスだけだと小さすぎるため行全体を対象にする
      style={[styles.container, { opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked
              ? '#008ffe'
              : isLEDTheme
                ? LED_THEME_BG_COLOR
                : '#fff',
            borderColor: checked ? '#008ffe' : isLEDTheme ? '#fff' : '#aaa',
            borderRadius: isLEDTheme ? 0 : 4,
          },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
      </View>
      <Typography
        style={[styles.label, { color: isLEDTheme ? '#fff' : '#000' }]}
      >
        {children}
      </Typography>
    </TouchableOpacity>
  );
};
