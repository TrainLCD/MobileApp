import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  onPress: () => void;
};

const RouteEstimationDebugButton: React.FC<Props> = ({ onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
    onPress={onPress}
    testID="route-estimation-debug-button"
  >
    <Text style={styles.fabText}>RE</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5856D6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    zIndex: 100,
  },
  fabPressed: {
    opacity: 0.7,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default React.memo(RouteEstimationDebugButton);
