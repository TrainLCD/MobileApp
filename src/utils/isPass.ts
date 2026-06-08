import { type Station, StopCondition } from '~/@types/graphql';
import { getIsHoliday } from './isHoliday';

// NOTE: 以前 lodash.memoize で Station オブジェクトを キャッシュキーにしていたが、
//   1) Station の参照が常に新しくなるため LRU 無しのキャッシュが無限に膨張する
//   2) 祝日/平日判定が初回呼び出し時点に固定され、日付跨ぎでステイル化する
// という致命的な問題があった。中身は単純な enum スイッチで memoize 自体のコストの方が
// 高いため、素直に毎回計算する。
const getIsPass = (station: Station | undefined): boolean =>
  getIsPassFromStopCondition(station?.stopCondition);

export const getIsPassFromStopCondition = (
  stopCondition: StopCondition | undefined | null
) => {
  switch (stopCondition) {
    case StopCondition.All:
    case StopCondition.PartialStop: // 一部停車は一旦停車扱い
    case StopCondition.Partial: // 一部通過は停車扱い
      return false;
    case StopCondition.Not:
      return true;
    case StopCondition.Weekday:
      // 若干分かりづらい感じはするけど休日に飛ばすという意味
      return getIsHoliday(new Date());
    case StopCondition.Holiday:
      return !getIsHoliday(new Date());
    default:
      return false;
  }
};

export default getIsPass;
