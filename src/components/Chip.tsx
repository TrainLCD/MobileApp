import type React from 'react';
import { useMemo } from 'react';
import {
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '../models/Theme';
import type { ButtonTestId } from '../test/e2e';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

type Props = {
  children: React.ReactNode;
  color?: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  testID?: ButtonTestId | string | undefined;
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
  },
  text: {
    fontSize: RFValue(12),
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

const Chip: React.FC<Props> = ({
  children,
  color,
  onPress,
  style,
  active,
  testID,
}: Props) => {
  const backgroundColor = useMemo(
    () => (active ? color : '#fff'),
    [active, color]
  );
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor,
          borderColor: isLEDTheme ? 'white' : color,
        },
        style,
      ]}
      testID={testID}
    >
      <Typography
        numberOfLines={1}
        style={[styles.text, { color: active ? '#fff' : color }]}
      >
        {children}
      </Typography>
    </TouchableOpacity>
  );
};

export default Chip;
