import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import { approachingAtom } from '../store/atoms/station';
import { useApproachingStation } from './useApproachingStation';
import { useNextStation } from './useNextStation';

/**
 * 各表示面(ヘッダー・ライブアクティビティ・ウォッチ等)で「次の駅」として
 * 見せる駅を返す共通アクセサ。
 *
 * 接近中(まもなく)のときだけ、現在地基準で算出した実際に接近している駅
 * (useApproachingStation)を優先する。それ以外は従来通り useNextStation を返す。
 * 現在地が取得できず接近駅を特定できない場合は useNextStation にフォールバックする。
 */
export const useDisplayNextStation = (): Station | undefined => {
  const approaching = useAtomValue(approachingAtom);
  const nextStation = useNextStation();
  const approachingStation = useApproachingStation();

  if (approaching && approachingStation) {
    return approachingStation;
  }
  return nextStation;
};
