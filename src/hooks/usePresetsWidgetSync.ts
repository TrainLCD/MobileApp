import { useEffect, useMemo, useRef } from 'react';
import type { SavedRoute } from '~/models/SavedRoute';
import type { LoopItem } from '~/store/atoms/navigation';
import { isJapanese } from '~/translation';
import { getLocalizedLineName } from '~/utils/line';
import {
  type PresetsWidgetItem,
  updatePresetsWidget,
} from '~/utils/native/presetsWidget';
import { getPresetRouteEndpoints } from '~/utils/presetRouteEndpoints';
import { getStationName } from '~/utils/station';

/**
 * ウィジェットへ渡すプリセットの最大件数。
 * iOS(systemLarge) / Android(5x5)でも表示しきれる件数を上限とし、
 * プリセットが増えてもApp Group / SharedPreferencesへ書き込む量が膨らまないようにする。
 */
export const MAX_PRESETS_WIDGET_ITEMS = 8;

type Params = {
  carouselData: LoopItem[];
  routes: SavedRoute[];
  isRoutesDBInitialized: boolean;
};

const toWidgetItem = (item: LoopItem): PresetsWidgetItem => {
  const { from, to } = getPresetRouteEndpoints(item);
  const line = from?.line;

  return {
    id: item.id,
    name: item.name,
    fromStationName: getStationName(from),
    toStationName: getStationName(to),
    lineName: getLocalizedLineName(line, isJapanese),
    // 空文字はネイティブ側でブランドカラー・路線名の先頭1文字へフォールバックされる
    lineColor: line?.color ?? '',
    lineSymbol:
      from?.stationNumbers?.[0]?.lineSymbol ??
      line?.lineSymbols?.[0]?.symbol ??
      '',
  };
};

/**
 * ホーム画面のプリセットウィジェットへ表示内容を同期する。
 *
 * プリセットの駅情報は `usePresetCarouselData` が取得済みのものを使い回す。
 * ウィジェット更新はOSのリロードバジェットを消費するため、
 * 実際に表示内容が変わったときだけネイティブへ書き込む。
 */
export const usePresetsWidgetSync = ({
  carouselData,
  routes,
  isRoutesDBInitialized,
}: Params): void => {
  // DB未初期化、または駅情報の取得待ちで一時的に空になっている間は同期しない。
  // ここで空配列を書き込むと、既に置かれているウィジェットが一瞬空表示になる
  const isReady =
    isRoutesDBInitialized && (routes.length === 0 || carouselData.length > 0);

  const presets = useMemo(
    () => carouselData.slice(0, MAX_PRESETS_WIDGET_ITEMS).map(toWidgetItem),
    [carouselData]
  );
  const serialized = useMemo(() => JSON.stringify(presets), [presets]);
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || lastSerializedRef.current === serialized) {
      return;
    }
    lastSerializedRef.current = serialized;
    updatePresetsWidget(presets);
  }, [isReady, presets, serialized]);
};
