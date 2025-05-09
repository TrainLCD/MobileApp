import { Entypo } from '@expo/vector-icons';
import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    marginTop: -4,
  },
});

const PickerChevronIcon: () => React.ReactElement = () => (
  <View style={styles.container}>
    {Platform.OS === 'ios' ? <Entypo name="chevron-down" size={24} /> : null}
  </View>
);

export default PickerChevronIcon;
