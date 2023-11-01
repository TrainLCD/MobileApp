import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

const Loading = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" />
  </View>
)

export default Loading
