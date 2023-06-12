import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
})

const Loading = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color="#555" />
  </View>
)

export default Loading
