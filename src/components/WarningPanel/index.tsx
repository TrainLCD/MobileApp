import React, { useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface IProps {
  onPress: (event: GestureResponderEvent) => void;
  text: string;
  dismissible?: boolean;
}

const WarningPanel = ({ text, onPress, dismissible }: IProps) => {
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width,
  );

  const onLayout = () => {
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

  const DismissText = () =>
    dismissible ? (
      <Text style={styles.dismissMessage}>タップで消せます</Text>
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
