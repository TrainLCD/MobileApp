import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import {
  sendMessage,
  updateApplicationContext,
  useReachability,
} from 'react-native-watch-connectivity';
import type { Station } from '~/@types/graphql';
import { isJapanese } from '~/translation';
import { getLocalizedLineName } from '~/utils/line';
import { parenthesisRegexp } from '../constants';
import {
  arrivedAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useLoopLine } from './useLoopLine';
import { useNumbering } from './useNumbering';
import { useStoppingState } from './useStoppingState';

export const useAppleWatch = (): void => {
  const arrived = useAtomValue(arrivedAtom);
  const stations = useAtomValue(stationsAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const station = useCurrentStation();
  const currentLine = useCurrentLine();

  const reachable = useReachability();
  const [currentNumbering] = useNumbering();
  // まもなく表示時は現在地基準で実際に接近している駅を次駅としてウォッチへ送る
  const nextStation = useDisplayNextStation();
  const stoppingState = useStoppingState();
  const { isLoopLine: isFullLoopLine, isPartiallyLoopLine } = useLoopLine();
  const { directionalStops } = useBounds(stations);

  const switchedStation = useMemo<Station | undefined>(
    () => (arrived && !getIsPass(station) ? station : nextStation),
    [arrived, nextStation, station]
  );

  const boundStationName = useMemo(() => {
    const enPrefix = 'For ';
    const jaSuffix = isFullLoopLine || isPartiallyLoopLine ? '方面' : 'ゆき';

    return `${isJapanese ? '' : enPrefix}${directionalStops
      .map((s: Station) => (isJapanese ? s.name : s.nameRoman))
      .join(isJapanese ? '・' : '/')}${isJapanese ? jaSuffix : ''}`;
  }, [directionalStops, isFullLoopLine, isPartiallyLoopLine]);

  // 全駅リストは駅一覧か方向が変わった時だけ作り直す。
  // 以前はstoppingStateやナンバリングの変化でもmessage再構築のたびに
  // slice().reverse()と全駅mapを再実行していた。
  const stationList = useMemo(() => {
    const switchedStations =
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse();
    return switchedStations.map((s: Station) => ({
      id: s.id,
      name: isJapanese ? s.name : s.nameRoman,
      lines: [],
      stationNumber: s?.stationNumbers?.[0]?.stationNumber,
      pass: getIsPass(s),
    }));
  }, [selectedDirection, stations]);

  const message = useMemo(() => {
    if (!switchedStation || !currentLine) {
      return {};
    }

    return {
      state: stoppingState,
      station: {
        id: switchedStation.id,
        name: isJapanese ? switchedStation.name : switchedStation.nameRoman,
        lines: (switchedStation.lines ?? [])
          .filter((l) => l.id !== currentLine.id)
          .map((l) => ({
            id: l.id,
            lineColorC: l.color,
            name: getLocalizedLineName(l, isJapanese).replace(
              parenthesisRegexp,
              ''
            ),
            lineSymbol: currentNumbering?.lineSymbol ?? '',
          })),
        stationNumber: currentNumbering?.stationNumber,
        pass: false,
      },
      stationList,
      selectedLine: {
        id: currentLine.id,
        name: getLocalizedLineName(currentLine, isJapanese).replace(
          parenthesisRegexp,
          ''
        ),
        lineColorC: currentLine.color,
        lineSymbol: currentNumbering?.lineSymbol ?? '',
      },
      boundStationName,
    };
  }, [
    currentLine,
    currentNumbering,
    switchedStation,
    stoppingState,
    boundStationName,
    stationList,
  ]);

  const sendMessagesToWatch = useCallback(async (): Promise<void> => {
    sendMessage(message, console.log, (err) => {
      console.error(err);
      updateApplicationContext(message);
    });
  }, [message]);

  const updateWatchApplicationContext = useCallback(() => {
    updateApplicationContext(message);
  }, [message]);

  // 直近に送った内容と送信経路(reachable)を記録し、内容が変わらない再構築では
  // ウォッチへの再送信(ブリッジ越しのシリアライズ)をスキップする
  const lastSentRef = useRef<{ payload: string; reachable: boolean } | null>(
    null
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const payload = JSON.stringify(message);
    if (
      lastSentRef.current?.payload === payload &&
      lastSentRef.current.reachable === reachable
    ) {
      return;
    }
    lastSentRef.current = { payload, reachable };

    if (reachable) {
      sendMessagesToWatch();
    } else {
      updateWatchApplicationContext();
    }
  }, [message, reachable, sendMessagesToWatch, updateWatchApplicationContext]);
};
