/* eslint-disable react/jsx-one-expression-per-line */
import * as Application from 'expo-application'
import React, { useMemo } from 'react'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { useLocationStore } from '../hooks/useLocationStore'
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
    lineHeight: Platform.OS === 'android' ? 18 : undefined,
  },
  textHeading: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
    lineHeight: Platform.OS === 'android' ? 18 : undefined,
  },
})

const DevOverlay: React.FC = () => {
  const location = useLocationStore((state) => state.location)
  const { preset: powerSavingPreset } = useRecoilValue(powerSavingState)
  const { approachingThreshold, arrivedThreshold } = useThreshold()

  const coordsSpeed =
    ((location?.coords.speed ?? 0) < 0 ? 0 : location?.coords.speed) ?? 0

  const speedKMH = useMemo(
    () =>
      (location?.coords.speed && Math.round((coordsSpeed * 3600) / 1000)) ?? 0,
    [coordsSpeed, location?.coords.speed]
  )

  return (
    <View style={styles.root}>
      <Typography style={styles.textHeading}>
        TrainLCD DO
        {` ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`}
      </Typography>
      <Typography style={styles.text}>{`Latitude: ${
        location?.coords.latitude ?? ''
      }`}</Typography>
      <Typography style={styles.text}>{`Longitude: ${
        location?.coords.longitude ?? ''
      }`}</Typography>

      <Typography style={styles.text}>{`Accuracy: ${
        location?.coords.accuracy ?? ''
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
