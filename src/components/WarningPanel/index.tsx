import React, { useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { translate } from '../../translation';

interface Props {
  onPress: (event: GestureResponderEvent) => void;
  text: string;
  dismissible?: boolean;
  warningLevel: 'URGENT' | 'WARNING' | 'INFO';
}

const WarningPanel: React.FC<Props> = ({
  text,
  onPress,
  dismissible,
  warningLevel,
}: Props) => {
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );

  const onLayout = (): void => {
    setWindowWidth(Dimensions.get('window').width);
  };

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
      width: windowWidth / 2,
      backgroundColor: '#333',
      borderColor,
      borderLeftWidth: 16,
      position: 'absolute',
      right: 24,
      bottom: 24,
      padding: 16,
      zIndex: 9999,
      borderRadius: 4,
      shadowColor: '#333',
      shadowOpacity: 0.16,
      shadowRadius: 4,
      elevation: 4,
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

  const DismissText: React.FC = () =>
    dismissible ? (
      <Text style={styles.dismissMessage}>{translate('tapToClose')}</Text>
    ) : null;
  return (
    <TouchableWithoutFeedback
      onLayout={onLayout}
      onPress={dismissible ? onPress : null}
    >
      <View style={styles.root}>
        <Text style={styles.message}>{text}</Text>
        <DismissText />
      </View>
    </TouchableWithoutFeedback>
  );
};

WarningPanel.defaultProps = {
  dismissible: false,
};

export default WarningPanel;
