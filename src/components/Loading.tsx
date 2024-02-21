import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    position: 'absolute',
    textAlign: 'center',
    fontWeight: 'bold',
    alignSelf: 'center',
    bottom: 32,
    fontSize: RFValue(14),
  },
})

const Loading = ({ message }: { message?: string }) => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" />
    {message ? <Text style={styles.loadingText}>{message}</Text> : null}
  </View>
)

export default Loading
