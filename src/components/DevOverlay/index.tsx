/* eslint-disable react/jsx-one-expression-per-line */
import { LocationObject } from 'expo-location';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useRecoilValue } from 'recoil';
import useCurrentLine from '../../hooks/useCurrentLine';
import stationState from '../../store/atoms/station';
import { getAvgStationBetweenDistances } from '../../utils/stationDistance';
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../../utils/threshold';

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
});
interface Props {
  location: LocationObject | Pick<LocationObject, 'coords'>;
}

const DevOverlay: React.FC<Props> = ({ location }: Props) => {
  const { stations } = useRecoilValue(stationState);
  const currentLine = useCurrentLine();

  const speedKMH = Math.round(((location.coords.speed || 0) * 3600) / 1000);
  const { latitude, longitude, accuracy } = location.coords;

  const avgDistance = getAvgStationBetweenDistances(stations);
  const approachingThreshold = getApproachingThreshold(
    currentLine?.lineType,
    avgDistance
  );
  const arrivedThreshold = getArrivedThreshold(
    currentLine?.lineType,
    avgDistance
  );

  return (
    <View style={styles.root}>
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
        </Text>
      ) : null}
    </View>
  );
};

export default React.memo(DevOverlay);
