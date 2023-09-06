/* eslint-disable react/jsx-one-expression-per-line */
import * as Application from 'expo-application'
import { LocationObject } from 'expo-location'
import React, { useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import useAverageDistance from '../hooks/useAverageDistance'
import { useCurrentLine } from '../hooks/useCurrentLine'
import mirroringShareState from '../store/atoms/mirroringShare'
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../utils/threshold'
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
  const { subscribing, publishing, totalVisitors, activeVisitors, token } =
    useRecoilValue(mirroringShareState)

  const currentLine = useCurrentLine()
  const avgDistance = useAverageDistance()

  const speedKMH = useMemo(
    () => Math.round(((location.coords.speed || 0) * 3600) / 1000),
    [location.coords.speed]
  )
  const { latitude, longitude, accuracy } = location.coords

  const approachingThreshold = useMemo(
    () => getApproachingThreshold(currentLine?.lineType, avgDistance),
    [avgDistance, currentLine?.lineType]
  )
  const arrivedThreshold = useMemo(
    () => getArrivedThreshold(currentLine?.lineType, avgDistance),
    [avgDistance, currentLine?.lineType]
  )

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
          Average: {avgDistance.toLocaleString()}m{'\n'}
          Approaching: {approachingThreshold.toLocaleString()}m{'\n'}
          Arrived: {arrivedThreshold.toLocaleString()}m
          {publishing
            ? `\nSubscribers: ${activeVisitors}/${totalVisitors}`
            : ''}
          {subscribing ? `\nSubscribing: ${token}` : ''}
        </Typography>
      ) : null}
    </View>
  )
}

export default React.memo(DevOverlay)
