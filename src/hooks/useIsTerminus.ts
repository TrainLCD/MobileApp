import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import { selectedBoundAtom, stationsAtom } from '../store/atoms/station';
import { useLoopLine } from './useLoopLine';

export const useIsTerminus = (station: Station | undefined) => {
  const stations = useAtomValue(stationsAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const { isLoopLine, isOedoLine } = useLoopLine();

  if (!station || isLoopLine) {
    return false;
  }

  if (isOedoLine) {
    // 都庁前は環状区間と光が丘方面直通区間の接続点として駅配列内に2回
    // 出現する（外回り/内回り）。配列の先頭・末尾一致だけで終点判定すると、
    // 環状区間を通過するだけの都庁前を誤って終点扱いしてしまうため、
    // 実際に選択されている行き先(selectedBound)と一致する場合のみ終点とする。
    return selectedBound?.id === station.id;
  }

  return (
    stations[0]?.id === station.id ||
    stations[stations.length - 1]?.id === station.id
  );
};
