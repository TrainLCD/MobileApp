/* eslint-disable react/jsx-one-expression-per-line */
import * as Application from 'expo-application';
import { LocationObject } from 'expo-location';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useRecoilValue } from 'recoil';
import useAverageDistance from '../hooks/useAverageDistance';
import useCurrentLine from '../hooks/useCurrentLine';
import mirroringShareState from '../store/atoms/mirroringShare';
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../utils/threshold';

const { width: windowWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 0,
    width: windowWidth / 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
    padding: 4,
  },
  text: {
    color: 'white',
  },
  textHeading: {
    color: 'white',
    fontWeight: 'bold',
  },
});
interface Props {
  location: LocationObject | Pick<LocationObject, 'coords'>;
}

const DevOverlay: React.FC<Props> = ({ location }: Props) => {
  const { subscribing, publishing, totalVisitors, activeVisitors, token } =
    useRecoilValue(mirroringShareState);

  const currentLine = useCurrentLine();
  const avgDistance = useAverageDistance();

  const speedKMH = useMemo(
    () => Math.round(((location.coords.speed || 0) * 3600) / 1000),
    [location.coords.speed]
  );
  const { latitude, longitude, accuracy } = location.coords;

  const approachingThreshold = useMemo(
    () => getApproachingThreshold(currentLine?.lineType, avgDistance),
    [avgDistance, currentLine?.lineType]
  );
  const arrivedThreshold = useMemo(
    () => getArrivedThreshold(currentLine?.lineType, avgDistance),
    [avgDistance, currentLine?.lineType]
  );

  return (
    <View style={styles.root}>
      <Text style={styles.textHeading}>
        TrainLCD DO
        {` ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`}
      </Text>
      <Text style={styles.text}>{`Latitude: ${latitude}`}</Text>
      <Text style={styles.text}>{`Longitude: ${longitude}`}</Text>
      {accuracy ? (
        <Text style={styles.text}>{`Accuracy: ${accuracy}m`}</Text>
      ) : null}
      {speedKMH > 0 ? (
        <Text style={styles.text}>
          Speed:
          {speedKMH}
          km/h
        </Text>
      ) : null}
      {currentLine ? (
        <Text style={styles.text}>
          Average: {avgDistance.toLocaleString()}m{'\n'}
          Approaching: {approachingThreshold.toLocaleString()}m{'\n'}
          Arrived: {arrivedThreshold.toLocaleString()}m
          {publishing
            ? `\nSubscribers: ${activeVisitors}/${totalVisitors}`
            : ''}
          {subscribing ? `\nSubscribing: ${token}` : ''}
        </Text>
      ) : null}
    </View>
  );
};

export default React.memo(DevOverlay);
