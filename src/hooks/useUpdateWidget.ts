import { useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';
import { getLocalizedLineName } from '~/utils/line';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
  stationsAtom,
} from '../store/atoms/station';
import { isJapanese } from '../translation';
import getIsPass from '../utils/isPass';
import {
  clearWidget,
  updateWidget,
} from '../utils/native/android/widgetModule';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useNextStation } from './useNextStation';
import { useNumbering } from './useNumbering';
import { pickLiveActivityNextStation } from './useUpdateLiveActivities';

/**
 * Androidのホーム画面ウィジェットへ乗車中の路線情報を同期する。
 *
 * iOSはライブアクティビティの更新ついでにウィジェット用のApp Groupへ書き込んでいるが、
 * Android側の同等フック(useUpdateLiveActivities)はiOSでしかマウントされないため、
 * ウィジェットが必要とする低頻度の項目だけを購読する専用フックとして分離している。
 * 駅の表示に必要な到着・接近状態を購読し、座標そのものは購読しない。
 */
export const useUpdateWidget = (): void => {
  const selectedBound = useAtomValue(selectedBoundAtom);
  const stations = useAtomValue(stationsAtom);
  const currentLine = useCurrentLine();
  const arrived = useAtomValue(arrivedAtom);
  const approaching = useAtomValue(approachingAtom);
  const previousStation = useCurrentStation(true);
  const currentStation = useCurrentStation(false, true);
  const displayNextStation = useDisplayNextStation();
  const recordNextStation = useNextStation();
  // ライブアクティビティと同じ停車駅基準と同駅への折り返し防止を使う。
  const stoppedStation =
    arrived && !approaching && !getIsPass(currentStation)
      ? currentStation
      : previousStation;
  const nextStation = pickLiveActivityNextStation(
    displayNextStation,
    recordNextStation,
    stoppedStation
  );
  const stationName =
    (isJapanese ? stoppedStation?.name : stoppedStation?.nameRoman) ?? '';
  const nextStationName =
    (isJapanese ? nextStation?.name : nextStation?.nameRoman) ?? '';
  const [currentNumbering] = useNumbering();
  const { directionalStops } = useBounds(stations);

  // iOS側のウィジェットが受け取る文字列と同じ組み立て方に揃える
  const boundStationName = useMemo(() => {
    const names = directionalStops
      .map((s) => (isJapanese ? s.name : s.nameRoman))
      .join(isJapanese ? '・' : '/');

    return isJapanese ? `${names}方面` : names;
  }, [directionalStops]);

  const widgetState = useMemo(
    () => ({
      lineName: getLocalizedLineName(currentLine, isJapanese),
      lineColor: currentLine?.color ?? '',
      lineSymbol: currentNumbering?.lineSymbol ?? '',
      boundStationName,
      stationName,
      nextStationName,
    }),
    [
      boundStationName,
      currentLine,
      currentNumbering?.lineSymbol,
      stationName,
      nextStationName,
    ]
  );

  useEffect(() => {
    // 行先が解除されたらマウントされたままでも未乗車表示へ戻す
    if (!selectedBound) {
      clearWidget();
      return;
    }

    updateWidget(widgetState);
  }, [selectedBound, widgetState]);

  // 降車(画面のアンマウント)でウィジェットを未乗車表示へ戻す
  useEffect(() => {
    return () => {
      clearWidget();
    };
  }, []);
};
