import { useApolloClient, useLazyQuery } from '@apollo/client/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Line, Station } from '~/@types/graphql';
import { GET_LINE_STATIONS, GET_STATIONS_NEARBY } from '~/lib/graphql/queries';
import lineState from '~/store/atoms/line';
import { locationAtom } from '~/store/atoms/location';
import routeEstimationState from '~/store/atoms/routeEstimation';
import stationState from '~/store/atoms/station';
import { estimateRoutes } from '~/utils/routeEstimation/estimateRoute';
import {
  appendToBuffer,
  getAvgSpeed,
  getTotalDistance,
  isMoving,
  isTransferStop,
  MIN_POINTS_FOR_ESTIMATION,
  preprocessLogs,
} from '~/utils/routeEstimation/preprocessLogs';
import type {
  CandidateLine,
  EstimationResult,
  LocationLog,
  RouteCandidate,
} from '~/utils/routeEstimation/types';
import { toLocationLog } from '~/utils/routeEstimation/types';

type GetStationsNearbyData = {
  stationsNearby: Station[];
};

type GetStationsNearbyVariables = {
  latitude: number;
  longitude: number;
  limit?: number;
};

type GetLineStationsData = {
  lineStations: Station[];
};

type GetLineStationsVariables = {
  lineId: number;
  stationId?: number;
};

/**
 * 路線推定のメインフック
 * isDevApp限定のデバッグモーダルから呼び出される
 */
export const useRouteEstimation = (): EstimationResult => {
  const client = useApolloClient();
  const location = useAtomValue(locationAtom);
  const [state, setState] = useAtom(routeEstimationState);
  const setLineState = useSetAtom(lineState);
  const setStationState = useSetAtom(stationState);

  const bufferRef = useRef<LocationLog[]>(state.locationBuffer);
  const estimatingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // bufferRefをatomの値と同期する（外部からの変更に追従）
  useEffect(() => {
    bufferRef.current = state.locationBuffer;
  }, [state.locationBuffer]);

  // アンマウント時に進行中のリクエストをキャンセル
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // GraphQL queries
  const [fetchNearbyStart] = useLazyQuery<
    GetStationsNearbyData,
    GetStationsNearbyVariables
  >(GET_STATIONS_NEARBY);

  const [fetchNearbyEnd] = useLazyQuery<
    GetStationsNearbyData,
    GetStationsNearbyVariables
  >(GET_STATIONS_NEARBY);

  // 新しいGPSポイントをバッファに追加
  useEffect(() => {
    if (!location || !state.isEstimating) return;

    const newLog = toLocationLog(location);
    const newBuffer = appendToBuffer(bufferRef.current, newLog);
    bufferRef.current = newBuffer;

    setState((prev) => ({
      ...prev,
      locationBuffer: newBuffer,
      status: prev.status === 'idle' ? 'collecting' : prev.status,
    }));
  }, [location, state.isEstimating, setState]);

  // 乗り換え検知でバッファリセット
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.locationBufferはバッファ更新ごとに乗り換え判定を再実行するため意図的に依存に含めている
  useEffect(() => {
    if (!state.isEstimating) return;

    const buffer = bufferRef.current;
    // ポイントが少なすぎる段階では乗り換え判定を行わない（偽陽性を防止）
    if (buffer.length < MIN_POINTS_FOR_ESTIMATION) return;

    const logs = preprocessLogs(buffer);
    if (logs.length > 0 && isTransferStop(logs)) {
      bufferRef.current = [];
      setState((prev) => ({
        ...prev,
        locationBuffer: [],
        candidates: [],
        status: 'collecting',
      }));
    }
  }, [state.locationBuffer, state.isEstimating, setState]);

  // 5ポイントごとに再評価
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.locationBuffer.lengthはバッファ長の変化をトリガーとして再評価するため意図的に依存に含めている
  useEffect(() => {
    if (!state.isEstimating) return;
    if (estimatingRef.current) return;

    const buffer = bufferRef.current;
    if (buffer.length < MIN_POINTS_FOR_ESTIMATION) return;
    if (buffer.length % MIN_POINTS_FOR_ESTIMATION !== 0) return;

    const logs = preprocessLogs(buffer);
    if (!isMoving(logs)) {
      setState((prev) => ({ ...prev, status: 'collecting' }));
      return;
    }

    const runEstimation = async () => {
      // 前回の推定リクエストが残っていればキャンセル
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      estimatingRef.current = true;
      setState((prev) => ({ ...prev, status: 'estimating' }));

      try {
        // 始点と最新点で近傍駅を取得
        const startPoint = buffer[0];
        const endPoint = buffer[buffer.length - 1];

        const fetchOptions = { signal };
        const [startResult, endResult] = await Promise.all([
          fetchNearbyStart({
            variables: {
              latitude: startPoint.latitude,
              longitude: startPoint.longitude,
              limit: 10,
            },
            context: { fetchOptions },
          }),
          fetchNearbyEnd({
            variables: {
              latitude: endPoint.latitude,
              longitude: endPoint.longitude,
              limit: 10,
            },
            context: { fetchOptions },
          }),
        ]);

        const nearbyStations = [
          ...(startResult.data?.stationsNearby ?? []),
          ...(endResult.data?.stationsNearby ?? []),
        ];

        // 各駅の路線から候補路線IDを収集
        const lineIdSet = new Set<number>();
        const lineMap = new Map<number, Line>();
        for (const station of nearbyStations) {
          for (const line of station.lines ?? []) {
            if (line?.id != null && !lineIdSet.has(line.id)) {
              lineIdSet.add(line.id);
              lineMap.set(line.id, line);
            }
          }
        }

        // 各候補路線の駅リストを取得
        const candidates: CandidateLine[] = [];
        const lineStationResults = await Promise.all(
          Array.from(lineIdSet).map(async (lineId) => {
            const result = await client.query<
              GetLineStationsData,
              GetLineStationsVariables
            >({
              query: GET_LINE_STATIONS,
              variables: { lineId },
              context: { fetchOptions },
            });
            return {
              lineId,
              stations: result.data?.lineStations ?? [],
            };
          })
        );

        for (const { lineId, stations } of lineStationResults) {
          const line = lineMap.get(lineId);
          if (line && stations.length > 0) {
            candidates.push({ line, stations });
          }
        }

        // 推定実行
        const results = estimateRoutes(candidates, logs);

        setState((prev) => ({
          ...prev,
          candidates: results,
          status: results.length > 0 ? 'ready' : 'collecting',
        }));
      } catch (err) {
        if (signal.aborted) return;
        console.error('useRouteEstimation: estimation failed', err);
        setState((prev) => ({ ...prev, status: 'collecting' }));
      } finally {
        estimatingRef.current = false;
      }
    };

    runEstimation();
  }, [
    state.locationBuffer.length,
    state.isEstimating,
    setState,
    fetchNearbyStart,
    fetchNearbyEnd,
    client,
  ]);

  // 候補選択: 既存のstationState / lineStateに反映
  const selectCandidate = useCallback(
    (candidate: RouteCandidate) => {
      setLineState((prev) => ({
        ...prev,
        selectedLine: candidate.line,
      }));
      setStationState((prev) => ({
        ...prev,
        station: candidate.currentStation,
        stations: candidate.stations,
        selectedDirection: candidate.direction,
        selectedBound: candidate.boundStation,
      }));

      // 推定を停止（進行中のリクエストもキャンセル）
      abortControllerRef.current?.abort();
      bufferRef.current = [];
      setState((prev) => ({
        ...prev,
        isEstimating: false,
        locationBuffer: [],
        candidates: [],
        status: 'idle',
      }));
    },
    [setLineState, setStationState, setState]
  );

  // リセット
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    bufferRef.current = [];
    setState({
      status: 'idle',
      candidates: [],
      locationBuffer: [],
      isEstimating: false,
    });
  }, [setState]);

  // バッファ情報（デバッグ用）
  const bufferInfo = useMemo(() => {
    const logs = preprocessLogs(state.locationBuffer);
    return {
      pointCount: state.locationBuffer.length,
      totalDistance: logs.length > 0 ? getTotalDistance(logs) : 0,
      avgSpeed: logs.length > 0 ? getAvgSpeed(logs) : 0,
      isMoving: logs.length > 0 ? isMoving(logs) : false,
    };
  }, [state.locationBuffer]);

  return {
    status: state.status,
    candidates: state.candidates,
    selectCandidate,
    reset,
    bufferInfo,
  };
};

/**
 * 推定の開始/停止を制御するフック
 */
export const useRouteEstimationControl = () => {
  const [state, setState] = useAtom(routeEstimationState);

  const startEstimation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isEstimating: true,
      status: 'collecting',
    }));
  }, [setState]);

  const stopEstimation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isEstimating: false,
      status: 'idle',
    }));
  }, [setState]);

  return {
    isEstimating: state.isEstimating,
    startEstimation,
    stopEstimation,
  };
};
