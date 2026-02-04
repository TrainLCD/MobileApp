import { Orientation } from 'expo-screen-orientation';
import { useAtomValue } from 'jotai';
import React from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useDeviceOrientation } from '~/hooks/useDeviceOrientation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

interface Props {
  onPress: (event: GestureResponderEvent) => void;
  text: string;
  warningLevel: 'URGENT' | 'WARNING' | 'INFO';
}

const WarningPanel: React.FC<Props> = ({
  text,
  onPress,
  warningLevel,
}: Props) => {
  const borderColor = (() => {
    switch (warningLevel) {
      case 'URGENT':
        return '#f62e36';
      case 'WARNING':
        return '#ff9500';
      case 'INFO':
        return '#00bb85';
      default:
        return '#00bb85';
    }
  })();

  const styles = StyleSheet.create({
    root: {
      backgroundColor: '#333',
      borderColor,
      borderLeftWidth: 16,
      position: 'absolute',
      right: 24,
      bottom: 24,
      padding: 16,
      zIndex: 9999,
      opacity: 0.9,
    },
    message: {
      fontSize: RFValue(14),
      color: '#fff',
      fontWeight: 'bold',
    },
    dismissMessage: {
      marginTop: 6,
      fontSize: RFValue(12),
      color: '#fff',
    },
  });

  const dim = useWindowDimensions();
  const orientation = useDeviceOrientation();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const safeText = typeof text === 'string' ? text : String(text ?? '');
  const tapToClose = String(translate('tapToClose') ?? '');
  const isLandscape =
    orientation === Orientation.LANDSCAPE_LEFT ||
    orientation === Orientation.LANDSCAPE_RIGHT;
  const windowWidth = Number.isFinite(dim.width) ? dim.width : 0;
  const panelWidth =
    windowWidth > 0
      ? isLandscape
        ? windowWidth / 2
        : windowWidth - 48
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${safeText}. ${tapToClose}`}
      style={[
        styles.root,
        {
          width: panelWidth,
          borderRadius: isLEDTheme ? 0 : 4,
        },
      ]}
    >
      <Typography style={styles.message}>{safeText}</Typography>
      <Typography style={styles.dismissMessage}>{tapToClose}</Typography>
    </Pressable>
  );
};

export default React.memo(WarningPanel);
