import { CommonActions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import {
  type Station,
  StopCondition,
  type TrainType,
  type TrainTypeNested,
} from '~/@types/graphql';
import { parseTrainTypeOverride } from '~/lib/deepLinkTrainType';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_STATIONS_BY_IDS,
} from '~/lib/graphql/queries';
import {
  ROUTE_RESOLVER_ID_PATTERN,
  ROUTE_RESOLVER_TIMEOUT_MS,
  resolveSidsFromShortId,
} from '~/lib/routeResolver';
import type { LineDirection } from '../models/Bound';
import { APP_THEME, type ThemePreference } from '../models/Theme';
import { navigationRef } from '../stacks/rootNavigation';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { themePreferenceAtom } from '../store/atoms/theme';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';

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
  ] = useLazyGraphQLQuery<
    GetLineGroupStationsData,
    GetLineGroupStationsVariables
  >(GET_LINE_GROUP_STATIONS);
  const [
    fetchStationsByLineId,
    {
      loading: fetchStationsByLineIdLoading,
      error: fetchStationsByLineIdError,
    },
  ] = useLazyGraphQLQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS
  );
  const [
    fetchStationsByIds,
    { loading: fetchStationsByIdsLoading, error: fetchStationsByIdsError },
  ] = useLazyGraphQLQuery<GetStationsByIdsData, GetStationsByIdsVariables>(
    GET_STATIONS_BY_IDS
  );

  const [resolverError, setResolverError] = useState<Error | null>(null);
  const [resolverLoading, setResolverLoading] = useState(false);

  // When the deep link supplied a custom TrainType, every fetched station's
  // `trainType` is replaced with the override. `useCurrentTrainType` reads
  // `currentStation?.trainType` (and falls back to other stations[].trainType
  // when transferring lines), so only overriding `navigationState.trainType`
  // would be undone on the next render. Replacing it on every station keeps
  // the override stable throughout the shared route — which is what the user
  // signed up for when they encoded `ttname` / `ttcolor` in the URL.
  const applyOverrideToStations = useCallback(
    (stations: Station[], override: TrainTypeNested | null): Station[] => {
      if (!override) {
        return stations;
      }
      return stations.map(
        (station) =>
          ({
            ...station,
            trainType: override,
          }) as Station
      );
    },
    []
  );

  const applyRoute = useCallback(
    (
      station: Station,
      stations: Station[],
      direction: LineDirection,
      trainTypeOverride: TrainTypeNested | null
    ) => {
      const line = station?.line;
      if (!line) {
        return;
      }

      const overriddenStations = applyOverrideToStations(
        stations,
        trainTypeOverride
      );
      const overriddenHead =
        overriddenStations.find((s) => s.id === station.id) ?? station;

      setLineState((prev) => ({
        ...prev,
        selectedLine: line,
        pendingLine: null,
      }));
      setStationState((prev) => ({
        ...prev,
        station: overriddenHead,
        stations: overriddenStations,
        selectedBound:
          direction === 'INBOUND'
            ? overriddenStations[overriddenStations.length - 1]
            : overriddenStations[0],
        selectedDirection: direction,
        pendingStation: null,
        pendingStations: [],
        wantedDestination: null,
      }));
      setNavigationState((prev) => ({
        ...prev,
        leftStations: [],
        trainType: (trainTypeOverride ??
          overriddenHead.trainType ??
          null) as TrainType | null,
      }));
    },
    [applyOverrideToStations, setLineState, setStationState, setNavigationState]
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
  // `skipIndices` marks 0-origin positions in `stationIds` whose stopCondition
  // should be overridden to `Not` (通過扱い). Indices are resolved against the
  // requested `stationIds` order, not the (possibly filtered) fetched result —
  // missing stations are dropped without shifting other stations' skip state.
  const openRouteByStationIds = useCallback(
    async ({
      stationIds,
      skipIndices,
      trainTypeOverride,
      autoMode,
      theme,
    }: {
      stationIds: number[];
      skipIndices: ReadonlySet<number> | null;
      trainTypeOverride: TrainTypeNested | null;
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
      const baseStations = stationIds
        .map((id, idx) => {
          const sta = byId.get(id);
          if (!sta) {
            return undefined;
          }
          return skipIndices?.has(idx)
            ? { ...sta, stopCondition: StopCondition.Not }
            : sta;
        })
        .filter((sta): sta is Station => sta != null);
      if (baseStations.length === 0) {
        return;
      }

      const stations = applyOverrideToStations(baseStations, trainTypeOverride);

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
        trainType: (trainTypeOverride ??
          head.trainType ??
          null) as TrainType | null,
        autoModeEnabled: autoMode ? true : prev.autoModeEnabled,
      }));

      await navigateToMain();
    },
    [
      applyOverrideToStations,
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
      trainTypeOverride,
      autoMode,
      theme,
    }: {
      stationGroupId: number;
      direction: 0 | 1;
      lineGroupId: number | undefined;
      lineId: number;
      trainTypeOverride: TrainTypeNested | null;
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

        applyRoute(station, stations, lineDirection, trainTypeOverride);
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

      applyRoute(station, stations, lineDirection, trainTypeOverride);
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
      // useLazyGraphQLQuery-derived errors auto-reset on the next query, but resolverError
      // is held in local state — without an explicit reset, a previous failure
      // leaks into the next handleUrl call (including subsequent legacy-path
      // successes). Clear it once we know the URL has parseable params.
      setResolverError(null);
      const {
        sgid,
        dir,
        lgid,
        lid,
        sids,
        skips,
        id,
        auto,
        theme,
        ttname,
        ttcolor,
        ttkind,
        ttnameroman,
        ttnamekatakana,
        ttnamechinese,
        ttnamekorean,
        ttnameromanipa,
      } = parsed.queryParams;

      const autoMode = auto === '1';
      const parsedTheme =
        typeof theme === 'string' &&
        (theme === 'AUTO' ||
          (Object.values(APP_THEME) as string[]).includes(theme))
          ? (theme as ThemePreference)
          : undefined;

      // `id` (resolver short code) supersedes every other route param. When it
      // is present we must not silently fall through to sids/sgid: doing so
      // would resolve a different route than the one the user shared. Use
      // `!= null` rather than a length check so that `?id=` (empty string) and
      // non-string shapes (e.g. an array of values) still fail validation and
      // no-op, instead of leaking to the sids/legacy paths.
      if (id != null) {
        if (typeof id !== 'string' || !ROUTE_RESOLVER_ID_PATTERN.test(id)) {
          return;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          ROUTE_RESOLVER_TIMEOUT_MS
        );
        setResolverLoading(true);
        try {
          // `tt*` URL params are ignored on the `?id=` path: the resolver
          // payload is the single source of TrainType truth for short codes,
          // and any malformed trainType in that payload causes resolver to
          // throw, which we catch and surface as `resolverError` below.
          const { stationIds, skipIndices, trainType } =
            await resolveSidsFromShortId(id, controller.signal);
          await openRouteByStationIds({
            stationIds,
            skipIndices,
            trainTypeOverride: trainType,
            autoMode,
            theme: parsedTheme,
          });
        } catch (err) {
          setResolverError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          clearTimeout(timeoutId);
          setResolverLoading(false);
        }
        return;
      }

      // `tt*` parameters override the head station's TrainType for both
      // `sids` and `sgid`+`lid` URL forms. `direction` is intentionally not
      // forwarded: the URL forms encode direction through station order /
      // the legacy `dir` flag, so accepting it here would duplicate intent.
      // Validation failure (missing required field, malformed color, enum
      // miss, non-string optional) rejects the whole link to avoid showing
      // a half-built TrainType.
      const trainTypeResult = parseTrainTypeOverride({
        name: ttname,
        color: ttcolor,
        kind: ttkind,
        nameRoman: ttnameroman,
        nameKatakana: ttnamekatakana,
        nameChinese: ttnamechinese,
        nameKorean: ttnamekorean,
        nameRomanIpa: ttnameromanipa,
      });
      if (trainTypeResult.status === 'invalid') {
        return;
      }
      const trainTypeOverride =
        trainTypeResult.status === 'valid' ? trainTypeResult.trainType : null;

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

        // Optional `skips` lists 0-origin indices into `stationIds` whose
        // stations should be marked as 通過 (StopCondition.Not). The whole
        // link is rejected on malformed input — non-integer, out-of-range,
        // duplicate, or non-ascending — rather than silently ignoring it,
        // so receivers never display a partially-misinterpreted route.
        let skipIndices: ReadonlySet<number> | null = null;
        if (typeof skips === 'string' && skips.length > 0) {
          const rawSkips = skips.split(',').map((raw) => raw.trim());
          if (rawSkips.some((raw) => !/^(0|[1-9]\d*)$/.test(raw))) {
            return;
          }
          const parsedSkips = rawSkips.map((raw) => Number(raw));
          for (let i = 0; i < parsedSkips.length; i++) {
            if (parsedSkips[i] >= stationIds.length) {
              return;
            }
            // Strict ascending order also rules out duplicates.
            if (i > 0 && parsedSkips[i] <= parsedSkips[i - 1]) {
              return;
            }
          }
          skipIndices = new Set(parsedSkips);
        }

        await openRouteByStationIds({
          stationIds,
          skipIndices,
          trainTypeOverride,
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
        trainTypeOverride,
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
      fetchStationsByIdsLoading ||
      resolverLoading,
    error:
      fetchStationsByLineGroupIdError ||
      fetchStationsByLineIdError ||
      fetchStationsByIdsError ||
      resolverError,
  };
};
