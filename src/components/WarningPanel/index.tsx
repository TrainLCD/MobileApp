import React from 'react';
import { Dimensions, GestureResponderEvent, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

interface IProps {
  onPress: (event: GestureResponderEvent) => void;
  text: string;
}

const screenWidth = Dimensions.get('screen').width;

const styles = StyleSheet.create({
  root: {
    width: screenWidth / 2,
    backgroundColor: 'rgba(255, 23, 68, 0.75)',
    shadowColor: '#ff1744',
    shadowOpacity: 0.16,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 6,
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
    fontSize: 14,
    color: '#fff',
  },
});

const WarningPanel = (props: IProps) => {
  const { text, onPress } = props;
  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={styles.root}>
        <Text style={styles.message}>{text}</Text>
        <Text style={styles.dismissMessage}>タップで消せます</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default WarningPanel;
