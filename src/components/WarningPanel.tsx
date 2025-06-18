import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useMemo, useState } from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';
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
  const [isPortrait, setIsPortrait] = useState(true);

  const { width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      if (
        orientationInfo.orientation ===
        ScreenOrientation.Orientation.PORTRAIT_UP
      ) {
        setIsPortrait(true);
      } else {
        setIsPortrait(false);
      }
    });
  }, []);

  const borderColor = useMemo(() => {
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
  }, [warningLevel]);

  const styles = StyleSheet.create({
    root: {
      width: isPortrait ? windowWidth * 0.9 : windowWidth / 2,
      backgroundColor: '#333',
      borderColor,
      borderLeftWidth: isPortrait ? 0 : 16,
      borderTopWidth: isPortrait ? 16 : 0,
      position: 'absolute',
      left: isPortrait ? windowWidth * 0.05 : 0,
      right: isPortrait ? windowWidth * 0.05 : 24,
      bottom: isPortrait ? 16 : 24,
      padding: 16,
      zIndex: 9999,
      borderRadius: 4,
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

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View
        style={{
          ...styles.root,
        }}
      >
        <Typography style={styles.message}>{text}</Typography>
        <Typography style={styles.dismissMessage}>
          {translate('tapToClose')}
        </Typography>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default React.memo(WarningPanel);
