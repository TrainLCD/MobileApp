import * as Application from 'expo-application'
import React, { useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { useLocationStore } from '../hooks/useLocationStore'
import { useThreshold } from '../hooks/useThreshold'
import Typography from './Typography'

const { width: windowWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 0,
    width: windowWidth / 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
    padding: 4,
  },
  text: {
    color: 'white',
    fontSize: 11,
  },
  textHeading: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
  },
})

const DevOverlay: React.FC = () => {
  const latitude = useLocationStore((state) => state?.coords.latitude)
  const longitude = useLocationStore((state) => state?.coords.longitude)
  const speed = useLocationStore((state) => state?.coords.speed)
  const accuracy = useLocationStore((state) => state?.coords.accuracy)
  const { approachingThreshold, arrivedThreshold } = useThreshold()

  const coordsSpeed = ((speed ?? 0) < 0 ? 0 : speed) ?? 0

  const speedKMH = useMemo(
    () => (speed && Math.round((coordsSpeed * 3600) / 1000)) ?? 0,
    [coordsSpeed, speed]
  )

  return (
    <View style={styles.root}>
      <Typography style={styles.textHeading}>
        TrainLCD DO
        {` ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`}
      </Typography>
      <Typography style={styles.text}>{`Latitude: ${
        latitude ?? ''
      }`}</Typography>
      <Typography style={styles.text}>{`Longitude: ${
        longitude ?? ''
      }`}</Typography>

      <Typography style={styles.text}>{`Accuracy: ${
        accuracy ?? ''
      }m`}</Typography>

      <Typography style={styles.text}>
        Speed: {speedKMH}
        km/h
      </Typography>

      <Typography style={styles.text}>
        Approaching: {approachingThreshold.toLocaleString()}m
      </Typography>
      <Typography style={styles.text}>
        Arrived: {arrivedThreshold.toLocaleString()}m
      </Typography>

      <Typography style={styles.text}>Processing Mode: Device</Typography>
    </View>
  )
}

export default React.memo(DevOverlay)
