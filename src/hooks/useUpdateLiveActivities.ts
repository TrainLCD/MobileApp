import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { getLocalizedLineName, isBusLine } from '~/utils/line';
import { parenthesisRegexp } from '../constants';
import { directionToDirectionName } from '../models/Bound';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getIsPass from '../utils/isPass';
import {
  startLiveUpdate,
  stopLiveUpdate,
  updateLiveUpdate,
} from '../utils/native/android/liveUpdateModule';
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/ios/liveActivityModule';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useIsNextLastStop } from './useIsNextLastStop';
import { useIsPassing } from './useIsPassing';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

export const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false);
  const {
    arrived: arrivedFromState,
    approaching: approachingFromState,
    selectedBound,
    selectedDirection,
    stations,
  } = useAtomValue(stationState);

  const currentLine = useCurrentLine();
  const previousStation = useCurrentStation(true);
  const currentStation = useCurrentStation(false, true);
  const nextStation = useNextStation();
  const { directionalStops } = useBounds(stations);
  const isNextLastStop = useIsNextLastStop();
  const getStationNumberIndex = useStationNumberIndexFunc();
  const trainType = useCurrentTrainType();
  const {
    isLoopLine: isFullLoopLine,
    isPartiallyLoopLine,
    isYamanoteLine,
    isOsakaLoopLine,
  } = useLoopLine();
  const isPassing = useIsPassing();

  const trainTypeName = useMemo(() => {
    // 現状種別が存在するバス路線を扱っていないので、種別名は表示しない
    if (isBusLine(currentLine)) {
      return '';
    }

    // 山手線か大阪環状線の直通がない種別が選択されていて、日本語環境でもない場合
    // 英語だとInbound/Outboundとなり本質と違うので空の文字列を渡して表示しないようにしている
    // 名古屋市営地下鉄名城線は主要行き先を登録していないので、Clockwise/Counterclockwiseのままにしている
    if ((isYamanoteLine || isOsakaLoopLine) && !isJapanese) {
      return '';
    }
    if (selectedDirection && isFullLoopLine) {
      return directionToDirectionName(currentStation?.line, selectedDirection);
    }
    if (isJapanese) {
      return (trainType?.name ?? '各駅停車')
        .replace(parenthesisRegexp, '')
        .replace(/\n/, '');
    }
    return (trainType?.nameRoman ?? 'Local')
      .replace(parenthesisRegexp, '')
      .replace(/\n/, '');
  }, [
    currentLine,
    currentStation?.line,
    isFullLoopLine,
    isOsakaLoopLine,
    isYamanoteLine,
    selectedDirection,
    trainType?.name,
    trainType?.nameRoman,
  ]);

  const boundStationName = useMemo(() => {
    const names = directionalStops
      .map((s) => (isJapanese ? s.name : s.nameRoman))
      .join(isJapanese ? '・' : '/');

    return isJapanese ? `${names}方面` : names;
  }, [directionalStops]);

  const boundStationNumber = useMemo(() => {
    return directionalStops
      .map((s) => {
        const stationIndex = getStationNumberIndex(s);
        return s?.stationNumbers?.[stationIndex]?.stationNumber;
      })
      .join('/');
  }, [directionalStops, getStationNumberIndex]);

  const stoppedStation = useMemo(
    () =>
      arrivedFromState && !approachingFromState && !getIsPass(currentStation)
        ? currentStation
        : previousStation,
    [approachingFromState, arrivedFromState, currentStation, previousStation]
  );
  const stationName = useMemo(
    () => (isJapanese ? stoppedStation?.name : stoppedStation?.nameRoman) ?? '',
    [stoppedStation?.name, stoppedStation?.nameRoman]
  );

  const nextStationName = useMemo(
    () => (isJapanese ? nextStation?.name : nextStation?.nameRoman) ?? '',
    [nextStation?.name, nextStation?.nameRoman]
  );

  const stoppedStationNumberingIndex = useMemo(
    () => getStationNumberIndex(stoppedStation),
    [getStationNumberIndex, stoppedStation]
  );
  const stationNumber = useMemo(
    () =>
      stoppedStation?.stationNumbers?.[stoppedStationNumberingIndex]
        ?.stationNumber ?? '',
    [stoppedStation?.stationNumbers, stoppedStationNumberingIndex]
  );

  const nextStationNumberingIndex = useMemo(
    () => getStationNumberIndex(nextStation),
    [getStationNumberIndex, nextStation]
  );
  const nextStationNumber = useMemo(() => {
    return (
      nextStation?.stationNumbers?.[nextStationNumberingIndex]?.stationNumber ??
      ''
    );
  }, [nextStation?.stationNumbers, nextStationNumberingIndex]);

  const stopped = useMemo(
    () => arrivedFromState && !isPassing,
    [arrivedFromState, isPassing]
  );

  const lineColor = useMemo(
    () => currentLine?.color ?? '#000000',
    [currentLine?.color]
  );
  const lineName = useMemo(
    () => getLocalizedLineName(currentLine, isJapanese),
    [currentLine]
  );

  const passingStationName = useMemo(
    () =>
      !isPassing
        ? ''
        : ((isJapanese ? currentStation?.name : currentStation?.nameRoman) ??
          ''),
    [currentStation?.name, currentStation?.nameRoman, isPassing]
  );

  const currentStationNumberingIndex = useMemo(
    () => getStationNumberIndex(currentStation),
    [currentStation, getStationNumberIndex]
  );

  const passingStationNumber = useMemo(
    () =>
      !isPassing
        ? ''
        : (currentStation?.stationNumbers?.[currentStationNumberingIndex]
            ?.stationNumber ?? ''),
    [currentStation?.stationNumbers, currentStationNumberingIndex, isPassing]
  );

  const isLoopLine = useMemo(
    () => isFullLoopLine || isPartiallyLoopLine,
    [isFullLoopLine, isPartiallyLoopLine]
  );

  const approaching = useMemo(
    () => approachingFromState,
    [approachingFromState]
  );

  const progress = useMemo(() => {
    if (stopped) {
      return 1.0;
    }
    if (approaching) {
      return 0.8;
    }
    return 0.3;
  }, [stopped, approaching]);

  const activityState = useMemo(
    () => ({
      stationName,
      nextStationName,
      stationNumber,
      nextStationNumber,
      approaching,
      stopped,
      boundStationName,
      boundStationNumber,
      trainTypeName,
      isLoopLine,
      isNextLastStop,
      lineColor,
      lineName,
      passingStationName,
      passingStationNumber,
      progress,
    }),
    [
      approaching,
      boundStationName,
      boundStationNumber,
      isLoopLine,
      isNextLastStop,
      lineColor,
      lineName,
      nextStationName,
      nextStationNumber,
      passingStationName,
      passingStationNumber,
      progress,
      stationName,
      stationNumber,
      stopped,
      trainTypeName,
    ]
  );

  useEffect(() => {
    if (selectedBound && !started) {
      startLiveActivity(activityState);
      startLiveUpdate(activityState);
      setStarted(true);
    }
  }, [activityState, selectedBound, started]);

  useEffect(() => {
    return () => {
      stopLiveActivity();
      stopLiveUpdate();
      setStarted(false);
    };
  }, []);

  useEffect(() => {
    if (started) {
      updateLiveActivity(activityState);
      updateLiveUpdate(activityState);
    }
  }, [activityState, started]);
};
