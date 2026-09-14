import * as Battery from 'expo-battery';
import type * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import { powerSavingLocationEnabledAtom } from '~/store/atoms/battery';
import {
  LOCATION_TASK_OPTIONS,
  LOCATION_TASK_OPTIONS_POWER_SAVING,
  LOCATION_WATCH_OPTIONS,
  LOCATION_WATCH_OPTIONS_POWER_SAVING,
} from '../constants';

type LocationProfile = {
  watchOptions: Location.LocationOptions;
  taskOptions: Location.LocationTaskOptions;
};

/**
 * 継続測位のプロファイル(既定/省電力)を選ぶ。継続測位本体
 * (useStartBackgroundLocationUpdates)と、配信が途絶えたときの補完測位
 * (useLocationHeartbeat)の双方から参照する。
 *
 * 選択規則を各フックへ複製すると、省電力プロファイルの条件を変えたときに片方だけが
 * 旧規則のまま残り、省電力モード中に補完測位だけHigh精度で走る、といった食い違いが
 * 静かに生まれる。プロファイルの決定はこの1か所に集約する。
 *
 * 返すオブジェクト自体は毎回新しく作られるが、中身はモジュール定数なので、
 * 呼び出し側がwatchOptions/taskOptionsをそのままeffect依存に置いても参照は安定する。
 */
export const useLocationProfile = (): LocationProfile => {
  const systemLowPowerMode = Battery.useLowPowerMode();
  // 省電力測位モード。精度をBalancedへ下げ、停車中の測位自動休止(iOSのみ)を
  // 許可する。旧プロファイルのHigh精度・更新間隔の緩和は実車検証を経て既定値へ
  // 昇格済み(constants/location.ts)。
  const powerSavingSettingEnabled = useAtomValue(
    powerSavingLocationEnabledAtom
  );
  // 「バッテリー」設定でONにしたときに加え、端末の省電力モード中も自動的に
  // 同じプロファイルへ切り替える。
  const powerSavingEnabled = powerSavingSettingEnabled || systemLowPowerMode;

  return {
    watchOptions: powerSavingEnabled
      ? LOCATION_WATCH_OPTIONS_POWER_SAVING
      : LOCATION_WATCH_OPTIONS,
    taskOptions: powerSavingEnabled
      ? LOCATION_TASK_OPTIONS_POWER_SAVING
      : LOCATION_TASK_OPTIONS,
  };
};
