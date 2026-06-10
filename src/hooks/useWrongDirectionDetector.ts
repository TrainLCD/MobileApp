import getDistance from 'geolib/es/getDistance';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import { locationAtom } from '~/store/atoms/location';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import notifyState from '~/store/atoms/notify';
import { arrivedAtom, selectedBoundAtom } from '~/store/atoms/station';
import wrongDirectionAtom, {
  type WrongDirectionState,
} from '~/store/atoms/wrongDirection';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';

// 連続何回の距離増加で逆方向と判定するか
const WRONG_DIRECTION_CONSECUTIVE_COUNT = 4;
// 逆方向判定に必要な最小累積距離(m)
const WRONG_DIRECTION_MIN_DISTANCE = 300;
// GPSノイズとみなして無視する減少幅(m)。これ以下の減少では検知カウンタを維持する
const WRONG_DIRECTION_NOISE_TOLERANCE = 10;

const INITIAL_STATE: WrongDirectionState = {
  isWrongDirection: false,
  isLoopLineWrongDirection: false,
};

/**
 * 逆方向検知ロジックの本体。位置情報・路線条件から逆方向状態を判定し、
 * 結果を `wrongDirectionAtom` に書き込む。
 *
 * このフックはコンポーネントツリーで **1 回だけ** マウントする想定。
 * 複数箇所から呼ぶと位置更新ごとに `getDistance` 計算と state 更新が
 * 重複して走り、バッテリーを余計に消費する。
 */
export const useWrongDirectionDetectorEffect = (): void => {
  const location = useAtomValue(locationAtom);
  const arrived = useAtomValue(arrivedAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);
  const { wrongDirectionNotifyEnabled } = useAtomValue(notifyState);
  const nextStation = useNextStation();
  const { isLoopLine } = useLoopLine();
  const setWrongDirection = useSetAtom(wrongDirectionAtom);

  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
  const accuracy = location?.coords.accuracy;

  // 依存配列用のプリミティブ値（オブジェクト参照の変化による不要な再実行を防ぐ）
  const selectedBoundId = selectedBound?.id;
  const nextStationId = nextStation?.id;
  const nextStationLat = nextStation?.latitude;
  const nextStationLon = nextStation?.longitude;

  // 前回のnextStationまでの距離を保持
  const prevDistanceRef = useRef<number | null>(null);
  // 連続で距離が増加した回数
  const consecutiveIncreaseCountRef = useRef(0);
  // 連続増加中の累積距離(m)
  const cumulativeIncreaseRef = useRef(0);
  // 通知済みのnextStation ID（undefinedは未設定、null/numberは通知済み駅ID）
  const notifiedForStationIdRef = useRef<number | null | undefined>(undefined);
  // 前回のnextStation ID（駅変更検知用）
  const prevNextStationIdRef = useRef<number | null | undefined>(undefined);
  // 現在の判定結果ローカルコピー（atom再書き込みのスキップ判定用）
  const detectedRef = useRef(false);

  // atom の値を一括で更新するヘルパー
  const writeState = useCallback(
    (detected: boolean, loopLine: boolean) => {
      if (!detected && !detectedRef.current) {
        // false → false の重複書き込みを避け、不要な再レンダリングを抑制する
        return;
      }
      detectedRef.current = detected;
      setWrongDirection({
        isWrongDirection: !loopLine && detected,
        isLoopLineWrongDirection: loopLine && detected,
      });
    },
    [setWrongDirection]
  );

  // 検知状態を全てリセットするヘルパー（誤判定要因が発生した際の完全リセット用）
  // detected=false の場合 writeState は loopLine 引数に関わらず両フラグを false にするため、
  // ここでは isLoopLine を渡さない。これにより isLoopLine の変化で
  // resetDetectionState の参照が更新されることを防ぎ、依存している useEffect の
  // 不要な再実行（と意図しないリセット）を避ける。
  const resetDetectionState = useCallback(() => {
    prevDistanceRef.current = null;
    consecutiveIncreaseCountRef.current = 0;
    cumulativeIncreaseRef.current = 0;
    notifiedForStationIdRef.current = undefined;
    writeState(false, false);
  }, [writeState]);

  // 到着時にリセット
  useEffect(() => {
    if (arrived) {
      resetDetectionState();
    }
  }, [arrived, resetDetectionState]);

  // selectedBound変更時にリセット
  useEffect(() => {
    if (selectedBoundId != null) {
      resetDetectionState();
    }
  }, [selectedBoundId, resetDetectionState]);

  // 位置更新ごとに距離変化を計算し、逆方向判定を行う
  useEffect(() => {
    // 前提条件を満たさない場合は検知状態をリセットして終了
    // 逆走通知設定が OFF の場合も検知を完全停止する。
    // 検知ロジック自体を止めることで `getDistance` 計算と atom 書き込みが
    // 発生しなくなり、位置更新ごとの CPU 消費を最小化する。
    // 結果として画面の逆走警告パネル（useWarningInfo の `isWrongDirection`
    // 分岐）も出なくなるが、他の警告（offline / badAccuracy など）は
    // 影響を受けない。
    if (
      !wrongDirectionNotifyEnabled ||
      selectedBoundId == null ||
      autoModeEnabled ||
      latitude == null ||
      longitude == null ||
      nextStationId === undefined ||
      nextStationLat == null ||
      nextStationLon == null ||
      (accuracy != null && accuracy > BAD_ACCURACY_THRESHOLD)
    ) {
      resetDetectionState();
      return;
    }

    // nextStationが変わった場合は前回距離をリセットし、初回測定として扱う
    if (prevNextStationIdRef.current !== nextStationId) {
      prevNextStationIdRef.current = nextStationId;
      resetDetectionState();
    }

    const currentDistance = getDistance(
      { latitude, longitude },
      {
        latitude: nextStationLat as number,
        longitude: nextStationLon as number,
      }
    );

    const prevDistance = prevDistanceRef.current;
    prevDistanceRef.current = currentDistance;

    // 初回測定は比較対象がないのでスキップ
    if (prevDistance == null) {
      return;
    }

    const increase = currentDistance - prevDistance;

    if (increase > 0) {
      // 遠ざかった: 連続カウンタと累積距離を伸ばす
      consecutiveIncreaseCountRef.current += 1;
      cumulativeIncreaseRef.current += increase;
    } else if (increase < -WRONG_DIRECTION_NOISE_TOLERANCE) {
      // 明確に近づいた: 連続カウンタをリセット
      // ただし wrongDirectionDetected 自体は据え置き、通知発火済みフラグも維持する。
      // 一度逆方向と判定された後、GPSノイズで一時的に近づいたとしても、
      // 次駅が変わるか到着するまでは「逆方向状態」のまま扱う
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
    }
    // 上記いずれにも当てはまらない小さな減少は GPS ノイズとして無視する

    if (
      consecutiveIncreaseCountRef.current >=
        WRONG_DIRECTION_CONSECUTIVE_COUNT &&
      cumulativeIncreaseRef.current >= WRONG_DIRECTION_MIN_DISTANCE
    ) {
      // 同一のnextStationに対して既に通知済みならスキップ
      if (
        notifiedForStationIdRef.current !== undefined &&
        notifiedForStationIdRef.current === nextStationId
      ) {
        return;
      }
      notifiedForStationIdRef.current = nextStationId;
      writeState(true, isLoopLine);
    }
  }, [
    accuracy,
    autoModeEnabled,
    isLoopLine,
    latitude,
    longitude,
    nextStationId,
    nextStationLat,
    nextStationLon,
    resetDetectionState,
    selectedBoundId,
    wrongDirectionNotifyEnabled,
    writeState,
  ]);
};

/**
 * 逆方向検知結果を購読する公開フック。
 * 実体は `wrongDirectionAtom` を読むだけなので、複数箇所から呼んでも安全。
 * 計算ロジック本体は `useWrongDirectionDetectorEffect` 側で 1 度だけ動く。
 */
export const useWrongDirectionDetector = (): WrongDirectionState => {
  return useAtomValue(wrongDirectionAtom) ?? INITIAL_STATE;
};
