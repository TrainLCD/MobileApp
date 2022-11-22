import React from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { translate } from '../translation';

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
      width: Dimensions.get('window').width / 2,
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
      lineHeight: RFValue(16),
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
        <Text style={styles.message}>{text}</Text>
        <Text style={styles.dismissMessage}>{translate('tapToClose')}</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default WarningPanel;
