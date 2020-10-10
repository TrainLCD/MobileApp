import React from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: string;
  onPress: (event: GestureResponderEvent) => void;
}

const styles = StyleSheet.create({
  fab: {
    backgroundColor: '#008ffe',
    position: 'absolute',
    right: 32,
    bottom: 32,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    shadowColor: '#008ffe',
    shadowOpacity: 0.25,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 2,
  },
  icon: {
    color: '#fff',
  },
});

const FAB: React.FC<Props> = ({ onPress, icon }: Props) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.fab}>
      <Ionicons style={styles.icon} name={icon} size={32} />
    </TouchableOpacity>
  );
};

export default FAB;
