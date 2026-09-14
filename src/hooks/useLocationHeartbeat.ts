import * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  getLastTrackedLocationAtMs,
  handleTrackingLocation,
} from '~/utils/handleTrackingLocation';
import {
  LOCATION_HEARTBEAT_MAX_PENDING,
  LOCATION_HEARTBEAT_STALE_THRESHOLD,
  NEEDS_LOCATION_HEARTBEAT,
} from '../constants/location';
import { useIsAppActive } from './useIsAppActive';
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
 * 前景で走行中(10mは数秒で超える)は一度も発火せず、その決定を実質的に変えない。
 * 併せて#6470が狙った「停車中に測位が途絶えて到着判定を取りこぼす」ケースも、
 * 変位ゲートを維持したまま補える。
 *
 * 動かさない条件が3つある。
 *  - 背景(前景以外): expo-locationのタスクは前景でだけ測位を即時報告し、それ以外では
 *    deferredUpdatesInterval(=10秒)ぶん貯めてから報告する。つまり背景では正常時も
 *    配信間隔が10秒以上になり、途絶と区別できない。加えて背景での一発取得に使われる
 *    CLLocationManagerはallowsBackgroundLocationUpdatesを立てないため、そもそも
 *    測位を受け取れない。取りに行っても無駄で、地上でも誤って発火する。
 *  - 前景の位置情報権限が無い: 「許可せずに開始」した利用者ではgetCurrentPositionAsyncが
 *    毎回失敗するだけになる(権限プロンプトも出ない)。前景復帰のたびに再評価する。
 *  - 省電力測位プロファイル中: このプロファイルはiOSで停車中の測位休止
 *    (pausesUpdatesAutomatically)を許可している(#6395)。休止すれば配信は当然途絶えるので、
 *    補完測位を動かすと休止をそのまま打ち消してしまう。電池優先という設定の意図を守り、
 *    省電力中は凍結を許容する。
 */
export const useLocationHeartbeat = (): void => {
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);
  const isAppActive = useIsAppActive();
  const { powerSavingEnabled, watchOptions } = useLocationProfile();
  // 補完測位が継続測位より高精度を要求すると、片方だけ電池の重い測位で走ってしまう。
  // 精度は継続測位と同じものを使う。
  const accuracy = watchOptions.accuracy;

  useEffect(() => {
    if (
      !NEEDS_LOCATION_HEARTBEAT ||
      // オートモードの現在地はシミュレーターが直接書き込むため、実測位を混ぜない。
      autoModeEnabled ||
      !isAppActive ||
      powerSavingEnabled
    ) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // 取得が返らないうちに重ねて要求すると、測位セッションだけが増えて電池を無駄に
    // する。応答が返るまでは新しい要求を出さない。ただし返らないまま放置すると補完
    // 測位ごと止まるので、LOCATION_HEARTBEAT_MAX_PENDINGで見切る。
    let pending = false;
    let pendingSinceMs = 0;
    // 見切った要求が後から返ってきても、そのfinallyで新しい要求のガードを
    // 解いてしまわないよう、要求ごとの識別子で自分の番かを判断する。
    let requestSeq = 0;
    // 取得失敗はトンネル内など環境要因で連続しやすいので、連続中は先頭の1回だけ記録する。
    let consecutiveFailures = 0;

    const schedule = (delayMs: number) => {
      timeoutId = setTimeout(check, Math.max(delayMs, 0));
    };

    // 一定間隔のタイマーではなく、「次に途絶が成立する時刻」へ都度置き直す。
    // 固定グリッドにすると、自分が取得した測位で途絶タイマーが巻き戻るぶん必ず
    // 1回ぶん空振りし、実際の取得間隔が閾値の2倍(20秒)まで開いてしまう。
    function check() {
      timeoutId = null;
      if (cancelled) {
        return;
      }

      const now = Date.now();

      if (pending) {
        const pendingMs = now - pendingSinceMs;
        if (pendingMs < LOCATION_HEARTBEAT_MAX_PENDING) {
          schedule(LOCATION_HEARTBEAT_MAX_PENDING - pendingMs);
          return;
        }
      }

      const lastTrackedAtMs = getLastTrackedLocationAtMs();
      // 0は「起動後まだ一度も配信が無い」状態。地下で起動した場合もここに入るため、
      // 未配信は途絶と同じに扱って取りに行く。
      if (lastTrackedAtMs !== 0) {
        const sinceDeliveryMs = now - lastTrackedAtMs;
        if (sinceDeliveryMs < LOCATION_HEARTBEAT_STALE_THRESHOLD) {
          schedule(LOCATION_HEARTBEAT_STALE_THRESHOLD - sinceDeliveryMs);
          return;
        }
      }

      pending = true;
      pendingSinceMs = now;
      requestSeq += 1;
      const seq = requestSeq;
      // 応答を待つ前に次の点検を置く。応答が返らないケースでも点検が止まらない。
      schedule(LOCATION_HEARTBEAT_STALE_THRESHOLD);

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
          // 見切られたあとの要求は、現役の要求のガードも点検予定も触らない。
          if (cancelled || seq !== requestSeq) {
            return;
          }
          pending = false;
          // 要求時に置いた点検は「応答が返らない場合」のための保険で、応答が返った
          // いまは遠すぎる(見切り時刻まで延びている)。この応答を起点に置き直さないと、
          // 次の取得が見切り時間ぶん遅れる。
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
          }
          schedule(LOCATION_HEARTBEAT_STALE_THRESHOLD);
        });
    }

    (async () => {
      try {
        // 権限はフックの外(Privacy画面)で決まり、設定アプリでいつでも変わる。
        // このeffectは前景復帰のたびに張り直されるので、そのたびに見に行けばよい。
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (cancelled || !granted) {
          return;
        }
      } catch (error) {
        console.warn('前景の位置情報権限の確認に失敗しました:', error);
        return;
      }
      schedule(LOCATION_HEARTBEAT_STALE_THRESHOLD);
    })();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [accuracy, autoModeEnabled, isAppActive, powerSavingEnabled]);
};
