import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import {
  useRouteEstimation,
  useRouteEstimationControl,
} from './useRouteEstimation';

// 不一致判定に必要な最小信頼度
const MIN_MISMATCH_CONFIDENCE = 0.7;

/**
 * ユーザーが選択した列車種別と路線推定結果の種別が一致しているか検出するフック
 *
 * useRouteEstimationを利用してGPSベースで実際の路線を推定し、
 * ユーザーが選択した種別のgroupIdと比較して不一致を検出する。
 */
export const useTrainTypeMismatchDetector = (): boolean => {
  const { trainType } = useAtomValue(navigationState);
  const { selectedBound } = useAtomValue(stationState);

  const { candidates, status } = useRouteEstimation();
  const { startEstimation, stopEstimation, isEstimating } =
    useRouteEstimationControl();

  const prevSelectedBoundId = useRef<number | null | undefined>(undefined);

  // 方面が選択されたら推定を開始、解除されたら停止
  useEffect(() => {
    const boundId = selectedBound?.id;

    if (boundId != null && trainType && !isEstimating) {
      startEstimation();
    }

    if (boundId == null && isEstimating) {
      stopEstimation();
    }

    // 方面が変わったら一旦停止して再開（バッファリセットのため）
    if (
      prevSelectedBoundId.current !== undefined &&
      prevSelectedBoundId.current !== boundId &&
      boundId != null
    ) {
      stopEstimation();
      startEstimation();
    }

    prevSelectedBoundId.current = boundId ?? null;
  }, [
    selectedBound?.id,
    trainType,
    isEstimating,
    startEstimation,
    stopEstimation,
  ]);

  const isMismatch = useMemo(() => {
    if (!trainType || candidates.length === 0 || status !== 'ready') {
      return false;
    }

    const topCandidate = candidates[0];
    if (topCandidate.confidence < MIN_MISMATCH_CONFIDENCE) {
      return false;
    }

    const estimatedTrainType = topCandidate.line.trainType;
    if (!estimatedTrainType) {
      return false;
    }

    // groupIdが取得できない場合は判定不能
    const selectedGroupId = trainType.groupId;
    const estimatedGroupId = estimatedTrainType.groupId;
    if (selectedGroupId == null || estimatedGroupId == null) {
      return false;
    }

    // 同一groupIdなら不一致なし
    return selectedGroupId !== estimatedGroupId;
  }, [trainType, candidates, status]);

  return isMismatch;
};
