import i18n from 'i18n-js';
import React, { useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface Props {
  onPress: (event: GestureResponderEvent) => void;
  text: string;
  dismissible?: boolean;
}

const WarningPanel: React.FC<Props> = ({
  text,
  onPress,
  dismissible,
}: Props) => {
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );

  const onLayout = (): void => {
    setWindowWidth(Dimensions.get('window').width);
  };

  const styles = StyleSheet.create({
    root: {
      width: windowWidth / 2,
      backgroundColor: 'rgba(255, 23, 68, 0.75)',
      shadowColor: '#ff1744',
      shadowOpacity: 0.16,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowRadius: 2,
      position: 'absolute',
      right: 24,
      bottom: 24,
      padding: 12,
      zIndex: 9999,
    },
    message: {
      fontSize: 14,
      color: '#fff',
      fontWeight: 'bold',
    },
    dismissMessage: {
      marginTop: 4,
      fontSize: 14,
      color: '#fff',
    },
  });

  const DismissText: React.FC = () =>
    dismissible ? (
      <Text style={styles.dismissMessage}>{i18n.t('tapToClose')}</Text>
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

export default WarningPanel;
