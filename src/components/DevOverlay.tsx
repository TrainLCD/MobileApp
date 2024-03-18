/* eslint-disable react/jsx-one-expression-per-line */
import * as Application from 'expo-application'
import { LocationObject } from 'expo-location'
import React, { useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { useThreshold } from '../hooks/useThreshold'
import powerSavingState from '../store/atoms/powerSaving'
import { currentLineSelector } from '../store/selectors/currentLine'
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
interface Props {
  location: LocationObject | Pick<LocationObject, 'coords'>
}

const DevOverlay: React.FC<Props> = ({ location }: Props) => {
  const { preset: powerSavingPreset } = useRecoilValue(powerSavingState)
  const currentLine = useRecoilValue(currentLineSelector)
  const { approachingThreshold, arrivedThreshold } = useThreshold()

  const speedKMH = useMemo(
    () => Math.round(((location.coords.speed || 0) * 3600) / 1000),
    [location.coords.speed]
  )
  const { latitude, longitude, accuracy } = location.coords

  return (
    <View style={styles.root}>
      <Typography style={styles.TypographyHeading}>
        TrainLCD DO
        {` ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`}
      </Typography>
      <Typography
        style={styles.Typography}
      >{`Latitude: ${latitude}`}</Typography>
      <Typography
        style={styles.Typography}
      >{`Longitude: ${longitude}`}</Typography>
      {accuracy ? (
        <Typography
          style={styles.Typography}
        >{`Accuracy: ${accuracy}m`}</Typography>
      ) : null}
      {speedKMH > 0 ? (
        <Typography style={styles.Typography}>
          Speed:
          {speedKMH}
          km/h
        </Typography>
      ) : null}
      {currentLine ? (
        <Typography style={styles.Typography}>
          Approaching: {approachingThreshold.toLocaleString()}m{'\n'}
          Arrived: {arrivedThreshold.toLocaleString()}m
        </Typography>
      ) : null}

      <Typography
        style={styles.Typography}
      >{`Power saving preset: ${powerSavingPreset}`}</Typography>
    </View>
  )
}

export default React.memo(DevOverlay)
