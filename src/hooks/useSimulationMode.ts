import computeDestinationPoint from 'geolib/es/computeDestinationPoint';
import getDistance from 'geolib/es/getDistance';
import getRhumbLineBearing from 'geolib/es/getRhumbLineBearing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { LineType } from '../../gen/proto/stationapi_pb';
import {
  LINE_TYPE_MAX_ACCELERATION_IN_KM_H_S,
  LINE_TYPE_MAX_SPEEDS_IN_KM_H,
} from '../constants/autoMode';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import { useCurrentLine } from './useCurrentLine';
import { useInterval } from './useInterval';
import { useLocationStore } from './useLocationStore';
import { useLoopLine } from './useLoopLine';

export const useSimulationMode = (enabled: boolean): void => {
  const {
    stations: rawStations,
    selectedDirection,
    station,
  } = useRecoilValue(stationState);
  const currentLine = useCurrentLine();
  const { selectedLine } = useRecoilValue(lineState);

  const stations = useMemo(
    () => dropEitherJunctionStation(rawStations, selectedDirection),
    [rawStations, selectedDirection]
  );

  const [index, setIndex] = useState(
    stations.findIndex((s) => s.groupId === station?.groupId)
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (enabled) {
      useLocationStore.setState({
        timestamp: 0,
        coords: {
          accuracy: 0,
          altitude: 0,
          altitudeAccuracy: -1,
          speed: 0,
          heading: 0,
          latitude: stations[index].latitude,
          longitude: stations[index].longitude,
        },
      });
    }
  }, [enabled]);

  const currentLineType = useMemo(
    () => currentLine?.lineType ?? LineType.Normal,
    [currentLine]
  );

  const maxSpeedInMetersSec = useMemo(
    () => LINE_TYPE_MAX_SPEEDS_IN_KM_H[currentLineType] / 3.6,
    [currentLineType]
  );
  const maxAccelerationInMS2 = useMemo(
    () => LINE_TYPE_MAX_ACCELERATION_IN_KM_H_S[currentLineType] / 3.6,
    [currentLineType]
  );

  const { isLoopLine } = useLoopLine();

  const [isDeceleration, setIsDeceleration] = useState(false);

  const step = useCallback(() => {
    if (!enabled || !selectedDirection || !selectedLine) {
      return;
    }

    const shouldReset =
      selectedDirection === 'INBOUND' ? !index : index === stations.length - 1;

    if (shouldReset) {
      setIndex(0);
      useLocationStore.setState({
        timestamp: 0,
        coords: {
          accuracy: 0,
          altitude: 0,
          altitudeAccuracy: -1,
          speed: 0,
          heading: 0,
          latitude: stations[0].latitude,
          longitude: stations[0].longitude,
        },
      });
    }

    const cur = stations[index];
    const next =
      selectedDirection === 'INBOUND'
        ? isLoopLine
          ? stations[index - 1]
          : stations[index + 1]
        : isLoopLine
          ? stations[index + 1]
          : stations[index - 1];

    if (cur && next) {
      useLocationStore.setState((prev) => {
        const currentDistanceForNextStation = getDistance(
          {
            lat: prev?.coords?.latitude ?? 0,
            lon: prev?.coords?.longitude ?? 0,
          },
          {
            lat: next?.latitude ?? 0,
            lon: next?.longitude ?? 0,
          }
        );

        const speedInMh = (() => {
          const prevSpeed = prev?.coords.speed ?? 0;

          const isAcceleration =
            (prev?.coords.speed ?? 0) < maxSpeedInMetersSec;

          if (Math.floor(prevSpeed) > 0) {
            const isStoppable =
              Math.floor(currentDistanceForNextStation / prevSpeed) > 0;
            if (!isStoppable) {
              setIsDeceleration(true);
            }
          }

          if (isDeceleration) {
            const nextSpeed = prevSpeed - maxAccelerationInMS2;
            if (nextSpeed < 0) {
              setIndex((prev) => prev + 1);
              setIsDeceleration(false);

              return 0;
            }
            return nextSpeed;
          }

          if (isAcceleration) {
            return prevSpeed + maxAccelerationInMS2;
          }

          return maxSpeedInMetersSec;
        })();

        const nextBearing = getRhumbLineBearing(
          {
            latitude: prev?.coords.latitude ?? 0,
            longitude: prev?.coords.longitude ?? 0,
          },
          {
            latitude: next?.latitude ?? 0,
            longitude: next?.longitude ?? 0,
          }
        );

        const nextPoint = computeDestinationPoint(
          {
            lat: prev?.coords.latitude ?? 0,
            lon: prev?.coords.longitude ?? 0,
          },
          speedInMh,
          nextBearing
        );

        return {
          timestamp: 0,
          coords: {
            ...nextPoint,
            accuracy: 0,
            altitude: 0,
            altitudeAccuracy: -1,
            speed: speedInMh,
            heading: 0,
          },
        };
      });
    }
  }, [
    index,
    enabled,
    isLoopLine,
    selectedDirection,
    selectedLine,
    stations,
    maxAccelerationInMS2,
    maxSpeedInMetersSec,
    isDeceleration,
  ]);

  useInterval(step, 1000);
};
