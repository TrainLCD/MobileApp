import React from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: string;
  disabled?: boolean;
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

const FAB: React.FC<Props> = ({ onPress, disabled, icon }: Props) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={1}
      style={[
        styles.fab,
        {
          opacity: disabled ? 0.75 : 1,
        },
      ]}
      disabled={disabled}
    >
      <Ionicons style={styles.icon} name={icon} size={32} />
    </TouchableOpacity>
  );
};

FAB.defaultProps = {
  disabled: false,
};

export default FAB;
