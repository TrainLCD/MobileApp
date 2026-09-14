import * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  getLastTrackedLocationAtMs,
  handleTrackingLocation,
} from '~/utils/handleTrackingLocation';
import {
  LOCATION_HEARTBEAT_INTERVAL,
  LOCATION_HEARTBEAT_MAX_PENDING,
  LOCATION_HEARTBEAT_STALE_THRESHOLD,
  NEEDS_LOCATION_HEARTBEAT,
} from '../constants/location';
import { useLocationProfile } from './useLocationProfile';

/**
 * 継続測位の配信が途絶えたときだけ、測位を自前で取りに行く補完測位。
 *
 * iOSはtimeIntervalが無視され、変位ゲート(LOCATION_DISTANCE_INTERVAL=10m)に達するまで
 * CoreLocationがそもそもデリゲートを呼ばない。地下鉄のようにGPSが失われ、測位が
 * セル/Wi-Fi由来の同じ座標に張り付く区間では変位が10mに届かず配信が完全に止まるため、
 * 位置・最寄り駅・到着判定・ヘッダーが揃って凍結する。Androidは変位ゲートが0で
 * timeIntervalが効くため同じ区間でも10秒ごとに届く。この差が「Androidでは地下鉄でも
 * 更新されるのにiPhoneでは更新されない」の正体で、ここで埋める。
 *
 * 変位ゲート自体を0へ戻す選択は取らない。iOSでは約1Hzの配信になり電池を著しく消費
 * するため実車検証を経て10mが選ばれている(#6470)。本フックは無配信のときだけ動くので、
 * 地上走行中(10mは数秒で超える)は一度も発火せず、その決定を実質的に変えない。
 * 併せて#6470が狙った「停車中に測位が途絶えて到着判定を取りこぼす」ケースも、
 * 変位ゲートを維持したまま10秒ごとの測位で補える。
 */
export const useLocationHeartbeat = (): void => {
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);
  // 補完測位が継続測位より高精度を要求すると、省電力プロファイルを選んでいても
  // そちらだけHigh精度で走ってしまう。精度は継続測位と同じものを使う。
  const { watchOptions } = useLocationProfile();
  const accuracy = watchOptions.accuracy;

  useEffect(() => {
    // オートモードの現在地はシミュレーターが直接書き込むため、実測位を混ぜない。
    if (!NEEDS_LOCATION_HEARTBEAT || autoModeEnabled) {
      return;
    }

    let cancelled = false;
    // 取得が返らないうちに次のtickが重ねて要求すると、測位セッションだけが増えて
    // 電池を無駄にする。応答が返るまでは新しい要求を出さない。ただし返らないまま
    // 放置すると補完測位ごと止まるので、LOCATION_HEARTBEAT_MAX_PENDINGで見切る。
    let pendingSinceMs = 0;
    let pending = false;
    // 見切った要求が後から返ってきても、そのfinallyで新しい要求のガードを
    // 解いてしまわないよう、要求ごとの識別子で自分の番かを判断する。
    let requestSeq = 0;
    // 取得失敗はトンネル内など環境要因で連続しやすいので、連続中は先頭の1回だけ記録する。
    let consecutiveFailures = 0;

    const intervalId = setInterval(() => {
      if (
        pending &&
        Date.now() - pendingSinceMs < LOCATION_HEARTBEAT_MAX_PENDING
      ) {
        return;
      }

      const lastTrackedAtMs = getLastTrackedLocationAtMs();
      // 0は「起動後まだ一度も配信が無い」状態。地下で起動した場合もここに入るため、
      // 未配信は途絶と同じに扱って取りに行く。
      if (
        lastTrackedAtMs !== 0 &&
        Date.now() - lastTrackedAtMs < LOCATION_HEARTBEAT_STALE_THRESHOLD
      ) {
        return;
      }

      pending = true;
      pendingSinceMs = Date.now();
      requestSeq += 1;
      const seq = requestSeq;

      Location.getCurrentPositionAsync({ accuracy })
        .then((location) => {
          consecutiveFailures = 0;
          if (cancelled) {
            return;
          }
          // 継続測位と同じ入口へ通す。同じ測位が返ってきた場合は重複排除で捨てられ、
          // 精度フィルタ・EMA・速度フィルタも継続測位とまったく同じ扱いになる。
          // 見切ったあとに返ってきた測位も、古ければ重複排除が落とすのでそのまま通す。
          handleTrackingLocation(location);
        })
        .catch((error) => {
          if (consecutiveFailures === 0) {
            console.warn('補完測位の取得に失敗しました:', error);
          }
          consecutiveFailures += 1;
        })
        .finally(() => {
          if (seq === requestSeq) {
            pending = false;
          }
        });
    }, LOCATION_HEARTBEAT_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [accuracy, autoModeEnabled]);
};
