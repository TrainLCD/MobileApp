import React from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
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

  const dim = useWindowDimensions();

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View
        style={{
          ...styles.root,
          width: dim.width / 2,
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
