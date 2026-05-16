import { useLazyQuery } from '@apollo/client/react';
import { CommonActions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import type { Station, TrainType } from '~/@types/graphql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_STATIONS_BY_IDS,
} from '~/lib/graphql/queries';
import type { LineDirection } from '../models/Bound';
import { APP_THEME, type ThemePreference } from '../models/Theme';
import { navigationRef } from '../stacks/rootNavigation';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { themePreferenceAtom } from '../store/atoms/theme';

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

type GetStationsByIdsData = {
  stations: Station[];
};

type GetStationsByIdsVariables = {
  ids: number[];
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
  const setThemePreference = useSetAtom(themePreferenceAtom);

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
  const [
    fetchStationsByIds,
    { loading: fetchStationsByIdsLoading, error: fetchStationsByIdsError },
  ] = useLazyQuery<GetStationsByIdsData, GetStationsByIdsVariables>(
    GET_STATIONS_BY_IDS
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

  // sids deep links express intent purely through station order: the first
  // entry is the origin and the last is the destination. Direction is fixed to
  // INBOUND — callers reverse the sids list to share the opposite direction.
  const openRouteByStationIds = useCallback(
    async ({
      stationIds,
      autoMode,
      theme,
    }: {
      stationIds: number[];
      autoMode: boolean;
      theme: ThemePreference | undefined;
    }) => {
      if (theme) {
        setThemePreference(theme);
      }

      const { data } = await fetchStationsByIds({
        variables: { ids: stationIds },
      });
      const fetched = data?.stations ?? [];
      if (fetched.length === 0) {
        return;
      }

      // Preserve the order specified in the deep link; server response order is
      // not guaranteed and stations not resolved are silently dropped.
      const byId = new Map(fetched.map((sta) => [sta.id, sta] as const));
      const stations = stationIds
        .map((id) => byId.get(id))
        .filter((sta): sta is Station => sta != null);
      if (stations.length === 0) {
        return;
      }

      const head = stations[0];
      const line = head.line;
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
        station: head,
        stations,
        selectedBound: stations[stations.length - 1],
        selectedDirection: 'INBOUND',
        pendingStation: null,
        pendingStations: [],
        wantedDestination: null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        leftStations: [],
        trainType: (head.trainType ?? null) as TrainType | null,
        autoModeEnabled: autoMode ? true : prev.autoModeEnabled,
      }));

      await navigateToMain();
    },
    [
      fetchStationsByIds,
      navigateToMain,
      setLineState,
      setNavigationState,
      setStationState,
      setThemePreference,
    ]
  );

  // lineId is always required: it serves as the fallback query key when
  // lineGroupId is absent and is validated upstream in handleUrl.
  const openLink = useCallback(
    async ({
      stationGroupId,
      direction,
      lineGroupId,
      lineId,
      autoMode,
      theme,
    }: {
      stationGroupId: number;
      direction: 0 | 1;
      lineGroupId: number | undefined;
      lineId: number;
      autoMode: boolean;
      theme: ThemePreference | undefined;
    }) => {
      if (theme) {
        setThemePreference(theme);
      }
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
        if (autoMode) {
          setNavigationState((prev) => ({ ...prev, autoModeEnabled: true }));
        }
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
      if (autoMode) {
        setNavigationState((prev) => ({ ...prev, autoModeEnabled: true }));
      }
      await navigateToMain();
    },
    [
      applyRoute,
      fetchStationsByLineGroupId,
      fetchStationsByLineId,
      navigateToMain,
      setNavigationState,
      setThemePreference,
    ]
  );

  const handleUrl = useCallback(
    async (url: string) => {
      const parsed = Linking.parse(url);
      if (!parsed.queryParams) {
        return;
      }
      const { sgid, dir, lgid, lid, sids, auto, theme } = parsed.queryParams;

      const autoMode = auto === '1';
      const parsedTheme =
        typeof theme === 'string' &&
        (theme === 'AUTO' ||
          (Object.values(APP_THEME) as string[]).includes(theme))
          ? (theme as ThemePreference)
          : undefined;

      // New `sids` form takes precedence and ignores sgid/lid/lgid/dir
      // entirely — station order alone encodes the intended direction.
      if (typeof sids === 'string' && sids.length > 0) {
        const rawStationIds = sids.split(',').map((raw) => raw.trim());
        // Reject the entire link if any token is not a strict positive integer
        // (Number.parseInt would silently accept "123x" as 123).
        if (
          rawStationIds.length < 2 ||
          rawStationIds.some((raw) => !/^[1-9]\d*$/.test(raw))
        ) {
          return;
        }
        const stationIds = rawStationIds.map((raw) => Number(raw));
        await openRouteByStationIds({
          stationIds,
          autoMode,
          theme: parsedTheme,
        });
        return;
      }

      // Legacy `sgid`/`lid` form: `dir` is required.
      const direction = Number(dir);
      if (direction !== 0 && direction !== 1) {
        return;
      }

      // Match the strict positive-integer validation used for `sids` so that
      // values like "1.5" or "Infinity" no longer leak into GraphQL `Int`
      // variables. `lgid` is optional but, when present, must be a positive
      // integer; otherwise we reject the entire link instead of silently
      // falling through to the lineId path with a malformed value.
      const rawStationGroupId = typeof sgid === 'string' ? sgid.trim() : '';
      const rawLineId = typeof lid === 'string' ? lid.trim() : '';
      if (
        !/^[1-9]\d*$/.test(rawStationGroupId) ||
        !/^[1-9]\d*$/.test(rawLineId)
      ) {
        return;
      }

      const stationGroupId = Number(rawStationGroupId);
      const lineId = Number(rawLineId);

      let lineGroupId: number | undefined;
      if (typeof lgid === 'string' && lgid.trim().length > 0) {
        const rawLineGroupId = lgid.trim();
        if (!/^[1-9]\d*$/.test(rawLineGroupId)) {
          return;
        }
        lineGroupId = Number(rawLineGroupId);
      }

      await openLink({
        stationGroupId,
        direction,
        lineGroupId,
        lineId,
        autoMode,
        theme: parsedTheme,
      });
    },
    [openLink, openRouteByStationIds]
  );

  const [initialUrlProcessed, setInitialUrlProcessed] = useState(false);

  useEffect(() => {
    const checkInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleUrl(initialUrl);
        }
      } catch (e) {
        console.warn('useDeepLink: failed to process initial URL', e);
      } finally {
        setInitialUrlProcessed(true);
      }
    };
    checkInitialUrl();
  }, [handleUrl]);

  useEffect(() => {
    const listener = Linking.addEventListener('url', (e) => {
      handleUrl(e.url).catch((err) => {
        console.warn('useDeepLink: failed to process runtime URL', err);
      });
    });

    return listener.remove;
  }, [handleUrl]);

  return {
    initialUrlProcessed,
    isLoading:
      fetchStationsByLineGroupIdLoading ||
      fetchStationsByLineIdLoading ||
      fetchStationsByIdsLoading,
    error:
      fetchStationsByLineGroupIdError ||
      fetchStationsByLineIdError ||
      fetchStationsByIdsError,
  };
};
