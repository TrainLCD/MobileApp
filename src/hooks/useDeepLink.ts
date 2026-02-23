import { useLazyQuery } from '@apollo/client/react';
import { CommonActions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import type { Station, TrainType } from '~/@types/graphql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
} from '~/lib/graphql/queries';
import type { LineDirection } from '../models/Bound';
import { navigationRef } from '../stacks/rootNavigation';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

const MAX_NAV_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 100;

type GetLineStationsData = {
  lineStations: Station[];
};

type GetLineStationsVariables = {
  lineId: number;
  stationId?: number;
};

type GetLineGroupStationsData = {
  lineGroupStations: Station[];
};

type GetLineGroupStationsVariables = {
  lineGroupId: number;
};

const navigateToMainAction = CommonActions.navigate({
  name: 'MainStack',
  params: { screen: 'Main' },
});

const waitForNavReady = (): Promise<boolean> =>
  new Promise((resolve) => {
    let attempt = 0;
    const check = () => {
      if (navigationRef.isReady()) {
        resolve(true);
        return;
      }
      attempt++;
      if (attempt >= MAX_NAV_RETRIES) {
        resolve(false);
        return;
      }
      setTimeout(check, INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1));
    };
    check();
  });

export const useDeepLink = () => {
  const setStationState = useSetAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const setLineState = useSetAtom(lineState);

  const [
    fetchStationsByLineGroupId,
    {
      loading: fetchStationsByLineGroupIdLoading,
      error: fetchStationsByLineGroupIdError,
    },
  ] = useLazyQuery<GetLineGroupStationsData, GetLineGroupStationsVariables>(
    GET_LINE_GROUP_STATIONS
  );
  const [
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: fetchStationsByLineIdError,
    },
  ] = useLazyQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );

  const applyRoute = useCallback(
    (station: Station, stations: Station[], direction: LineDirection) => {
      const line = station?.line;
      if (!line) {
        return;
      }

      setLineState((prev) => ({
        ...prev,
        selectedLine: line,
        pendingLine: null,
      }));
      setStationState((prev) => ({
        ...prev,
        station,
        stations,
        selectedBound:
          direction === 'INBOUND' ? stations[stations.length - 1] : stations[0],
        selectedDirection: direction,
        pendingStation: null,
        pendingStations: [],
        wantedDestination: null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        leftStations: [],
        trainType: (station.trainType ?? null) as TrainType | null,
      }));
    },
    [setLineState, setStationState, setNavigationState]
  );

  const navigateToMain = useCallback(async () => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(navigateToMainAction);
      return;
    }
    const ready = await waitForNavReady();
    if (ready) {
      navigationRef.dispatch(navigateToMainAction);
    } else {
      console.warn(
        'useDeepLink: navigationRef not ready after retries, navigation skipped'
      );
    }
  }, []);

  const openLink = useCallback(
    async ({
      stationGroupId,
      direction,
      lineGroupId,
      lineId,
    }: {
      stationGroupId: number;
      direction: 0 | 1;
      lineGroupId: number | undefined;
      lineId: number;
    }) => {
      const lineDirection: LineDirection =
        direction === 0 ? 'INBOUND' : 'OUTBOUND';

      if (lineGroupId) {
        const { data } = await fetchStationsByLineGroupId({
          variables: { lineGroupId },
        });

        const stations = data?.lineGroupStations ?? [];
        const station = stations.find((sta) => sta.groupId === stationGroupId);
        if (!station) {
          return;
        }

        applyRoute(station, stations, lineDirection);
        await navigateToMain();
        return;
      }

      const { data } = await fetchStationsByLineId({
        variables: { lineId },
      });

      const stations = data?.lineStations ?? [];
      const station = stations.find((sta) => sta.groupId === stationGroupId);
      if (!station) {
        return;
      }

      applyRoute(station, stations, lineDirection);
      await navigateToMain();
    },
    [
      applyRoute,
      fetchStationsByLineGroupId,
      fetchStationsByLineId,
      navigateToMain,
    ]
  );

  const handleUrl = useCallback(
    async (url: string) => {
      const parsed = Linking.parse(url);
      if (!parsed.queryParams) {
        return;
      }
      const { sgid, dir, lgid, lid } = parsed.queryParams;

      const stationGroupId = Number(sgid);
      const direction = Number(dir);
      const lineId = Number(lid);

      if (!stationGroupId || !lineId) {
        return;
      }
      if (direction !== 0 && direction !== 1) {
        return;
      }

      const lineGroupId = lgid ? Number(lgid) : undefined;

      await openLink({
        stationGroupId,
        direction,
        lineGroupId,
        lineId,
      });
    },
    [openLink]
  );

  const [initialUrlProcessed, setInitialUrlProcessed] = useState(false);

  useEffect(() => {
    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleUrl(initialUrl);
      }
      setInitialUrlProcessed(true);
    };
    checkInitialUrl();
  }, [handleUrl]);

  useEffect(() => {
    const listener = Linking.addEventListener('url', (e) => {
      handleUrl(e.url);
    });

    return listener.remove;
  }, [handleUrl]);

  return {
    initialUrlProcessed,
    isLoading:
      fetchStationsByLineGroupIdLoading || fetchStationsByLineIdLoading,
    error: fetchStationsByLineGroupIdError || fetchStationsByLineIdError,
  };
};
