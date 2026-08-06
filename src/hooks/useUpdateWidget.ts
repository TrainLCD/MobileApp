import { useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';
import { getLocalizedLineName } from '~/utils/line';
import { selectedBoundAtom, stationsAtom } from '../store/atoms/station';
import { isJapanese } from '../translation';
import {
  clearWidget,
  updateWidget,
} from '../utils/native/android/widgetModule';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useNumbering } from './useNumbering';

/**
 * Androidのホーム画面ウィジェットへ乗車中の路線情報を同期する。
 *
 * iOSはライブアクティビティの更新ついでにウィジェット用のApp Groupへ書き込んでいるが、
 * Android側の同等フック(useUpdateLiveActivities)はiOSでしかマウントされないため、
 * ウィジェットが必要とする低頻度の項目だけを購読する専用フックとして分離している。
 * 駅の到着・通過など毎秒変化する状態は購読しない。
 */
export const useUpdateWidget = (): void => {
  const selectedBound = useAtomValue(selectedBoundAtom);
  const stations = useAtomValue(stationsAtom);
  const currentLine = useCurrentLine();
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
    }),
    [boundStationName, currentLine, currentNumbering?.lineSymbol]
  );

  useEffect(() => {
    if (!selectedBound) {
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
