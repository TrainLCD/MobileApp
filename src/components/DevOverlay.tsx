/* eslint-disable react/jsx-one-expression-per-line */
import * as Application from 'expo-application'
import React, { useMemo } from 'react'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { useStore } from '../hooks/useStore'
import { useThreshold } from '../hooks/useThreshold'
import powerSavingState from '../store/atoms/powerSaving'
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
    lineHeight: Platform.OS === 'android' ? 16 : undefined,
  },
  textHeading: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
    lineHeight: Platform.OS === 'android' ? 16 : undefined,
  },
})

const DevOverlay: React.FC = () => {
  const latitude = useStore((state) => state.location?.coords.latitude)
  const longitude = useStore((state) => state.location?.coords.longitude)
  const speed = useStore((state) => state.location?.coords.speed)
  const accuracy = useStore((state) => state.location?.coords.accuracy)
  const { preset: powerSavingPreset } = useRecoilValue(powerSavingState)
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

      <Typography
        style={styles.text}
      >{`Power saving preset: ${powerSavingPreset}`}</Typography>

      <Typography style={styles.text}>Processing Mode: Device</Typography>
    </View>
  )
}

export default React.memo(DevOverlay)
