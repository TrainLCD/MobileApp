import * as Application from 'expo-application';
import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  useDistanceToNextStation,
  useLocationStore,
  useNextStation,
} from '~/hooks';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import { generateAccuracyChart } from '~/utils/accuracyChart';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 0,
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
});

const DevOverlay: React.FC = () => {
  const speed = useLocationStore((state) => state?.location?.coords.speed);
  const accuracy = useLocationStore(
    (state) => state?.location?.coords.accuracy
  );
  const accuracyHistory = useLocationStore(
    (state) => state?.accuracyHistory ?? []
  );
  const distanceToNextStation = useDistanceToNextStation();
  const nextStation = useNextStation();
  const isTelemetryEnabled = useTelemetryEnabled();

  const coordsSpeed = ((speed ?? 0) < 0 ? 0 : speed) ?? 0;

  const speedKMH = useMemo(
    () =>
      (
        (speed && Math.round((coordsSpeed * 3600) / 1000)) ??
        0
      ).toLocaleString(),
    [coordsSpeed, speed]
  );

  const accuracyChartBlocks = useMemo(
    () => generateAccuracyChart(accuracyHistory),
    [accuracyHistory]
  );

  const dim = useWindowDimensions();

  return (
    <View style={[styles.root, { width: dim.width / 4 }]}>
      <Typography style={styles.textHeading}>
        TrainLCD DO
        {` ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`}
      </Typography>
      <Typography style={styles.text}>
        {accuracyChartBlocks.map((block, index) => (
          <Text
            key={`${index}-${block.char}-${block.color}`}
            style={{ color: block.color }}
          >
            {block.char}
          </Text>
        ))}
      </Typography>
      <Typography style={styles.text}>{`Accuracy: ${
        accuracy ?? ''
      }m`}</Typography>
      {distanceToNextStation ? (
        <Typography style={styles.text}>
          Next: {distanceToNextStation}m
          {nextStation?.name && ` ${nextStation.name}`}
        </Typography>
      ) : (
        <Typography style={styles.text}>Next:</Typography>
      )}
      <Typography style={styles.text}>
        Speed: {speedKMH}
        km/h
      </Typography>
      <Typography style={styles.text}>
        Telemetry: {isTelemetryEnabled ? 'ON' : 'OFF'}
      </Typography>
    </View>
  );
};

export default React.memo(DevOverlay);
