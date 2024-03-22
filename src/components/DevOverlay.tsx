/* eslint-disable react/jsx-one-expression-per-line */
import * as Application from 'expo-application'
import React, { useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
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
  Typography: {
    color: 'white',
    fontSize: 11,
  },
  TypographyHeading: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
  },
})

const DevOverlay: React.FC = () => {
  const location = useLocationStore((state) => state.location)
  const { preset: powerSavingPreset } = useRecoilValue(powerSavingState)
  const { approachingThreshold, arrivedThreshold } = useThreshold()

  const speedKMH = useMemo(
    () =>
      (location?.coords.speed &&
        Math.round(((location.coords.speed || 0) * 3600) / 1000)) ??
      0,
    [location?.coords.speed]
  )
  return (
    <View style={styles.root}>
      <Typography style={styles.TypographyHeading}>
        TrainLCD DO
        {` ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`}
      </Typography>
      <Typography style={styles.Typography}>{`Latitude: ${
        location?.coords.latitude ?? ''
      }`}</Typography>
      <Typography style={styles.Typography}>{`Longitude: ${
        location?.coords.longitude ?? ''
      }`}</Typography>

      <Typography style={styles.Typography}>{`Accuracy: ${
        location?.coords.accuracy ?? ''
      }m`}</Typography>

      <Typography style={styles.Typography}>
        Speed: {speedKMH}
        km/h
      </Typography>

      <Typography style={styles.Typography}>
        Approaching: {approachingThreshold.toLocaleString()}m{'\n'}
        Arrived: {arrivedThreshold.toLocaleString()}m
      </Typography>

      <Typography
        style={styles.Typography}
      >{`Power saving preset: ${powerSavingPreset}`}</Typography>
    </View>
  )
}

export default React.memo(DevOverlay)
