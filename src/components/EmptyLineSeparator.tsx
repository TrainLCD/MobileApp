import React from 'react';
import { StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  separator: { height: 8 },
});

export const EmptyLineSeparator = React.memo(() => (
  <View style={styles.separator} />
));
