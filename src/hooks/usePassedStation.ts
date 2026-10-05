import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import { findPassedStation } from '~/utils/passedStation';
import reverseStations from '~/utils/reverseStations';
import {
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '../store/atoms/station';
import { useLoopLine } from './useLoopLine';

/**
 * 到着圏を取りこぼした通過駅のうち、現在地がすでに通り過ぎたものを返す。
 * useRefreshStation が現在駅を後方に取り残さないための自己修復に使う。
 *
 * ループ線は対象外にする。進行方向順の並びが終端で折り返すため、
 * 区間の選び方が非ループ線と同じにならない。
 */
export const usePassedStation = (): Station | undefined => {
  const location = useAtomValue(locationAtom);
  const stationsFromState = useAtomValue(stationsAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const currentStation = useAtomValue(stationAtom);
  const { isLoopLine } = useLoopLine();

  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
  const accuracy = location?.coords.accuracy;

  const orderedStations = useMemo(() => {
    if (selectedDirection == null || isLoopLine) {
      return null;
    }
    const stations = dropEitherJunctionStation(
      stationsFromState,
      selectedDirection
    );
    return selectedDirection === 'INBOUND'
      ? stations
      : reverseStations(stations);
  }, [isLoopLine, selectedDirection, stationsFromState]);

  return useMemo(
    () =>
      orderedStations
        ? findPassedStation(
            orderedStations,
            currentStation,
            latitude,
            longitude,
            accuracy
          )
        : undefined,
    [accuracy, currentStation, latitude, longitude, orderedStations]
  );
};
