import React, { type ComponentProps, useCallback } from 'react';
import {
  type StyleProp,
  StyleSheet,
  type Switch,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import Typography from './Typography';

type Props = {
  style?: StyleProp<ViewStyle>;
  value: boolean;
  onValueChange: (value: boolean) => void;
} & ComponentProps<typeof Switch>;

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cell: {
    width: 25,
    height: 30,
    marginTop: -2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#212121',
    fontWeight: 'bold',
  },
});

const LEDThemeSwitch = ({
  style,
  value,
  onValueChange,
  accessibilityLabel,
}: Props) => {
  const handleContainerPress = useCallback(
    () => onValueChange(!value),
    [onValueChange, value]
  );
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleContainerPress}
      style={[
        styles.container,
        { borderColor: value ? '#fff' : '#555' },
        style,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.cell,
          {
            backgroundColor: value ? '#fff' : '#555',
            marginLeft: value ? 25 : 0,
          },
        ]}
      >
        <Typography
          style={[styles.label, { color: value ? '#212121' : '#fff' }]}
        >
          {value ? 'ON' : 'OFF'}
        </Typography>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(LEDThemeSwitch);
