import * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  getMsSinceLastTrackedLocation,
  handleTrackingLocation,
} from '~/utils/handleTrackingLocation';
import {
  countLocationHeartbeatAbandoned,
  countLocationHeartbeatDiscarded,
  countLocationHeartbeatFailed,
  countLocationHeartbeatRequested,
  countLocationHeartbeatSucceeded,
  countLocationHeartbeatTornDown,
  type LocationHeartbeatState,
  setLocationHeartbeatState,
} from '~/utils/locationHeartbeatStats';
import { monotonicNow } from '~/utils/monotonicNow';
import {
  LOCATION_HEARTBEAT_MAX_PENDING,
  LOCATION_HEARTBEAT_STALE_THRESHOLD,
  NEEDS_LOCATION_HEARTBEAT,
} from '../constants/location';
import { useIsAppForeground } from './useIsAppForeground';
import { useLocationProfile } from './useLocationProfile';

/** 測位を1件だけ取りに行く要求。見切るときは stop で購読を閉じる。 */
type SingleLocationRequest = {
  promise: Promise<Location.LocationObject>;
  stop: () => void;
};

/**
 * 継続測位と同じ startUpdatingLocation で測位を1件だけ取り、届いたら購読を閉じる。
 *
 * 一発取得(getCurrentPositionAsync)は使わない。あちらは CLLocationManager の
 * requestLocation() で、Apple の仕様では「If a location fix cannot be determined in a
 * timely manner, the location manager calls the delegate's method instead and reports a
 * error.」となっており、fixが取れない地下では毎回エラーで終わる(要求精度は理由にならない。
 * 同じDiscussionに「If obtaining the desired accuracy would take too long, the location
 * manager delivers a less accurate location value rather than reporting an error.」とある)。
 * 一方 watchPositionAsync が使う startUpdatingLocation は、expo-location 側が
 * locationUnknown(code 0) を明示的に無視して待ち続ける(Providers/LocationsStreamer.swift)。
 * 地下でセル測位が出た瞬間を拾えるのはこちらだけなので、1件で閉じる前提でこちらを使う。
 *
 * 変位ゲートは0で張る。ここへ来る時点で「変位がLOCATION_DISTANCE_INTERVALに届かず配信が
 * 止まっている」ことが分かっており、同じゲートを張り直したら待っても届かない。1件で閉じる
 * ので、#6470が避けた「常時1Hzで回り続ける」状態にはならない。
 */
const watchSingleLocation = (
  accuracy: Location.LocationOptions['accuracy']
): SingleLocationRequest => {
  let subscription: Location.LocationSubscription | null = null;
  // 購読を開く前に見切られることがある(watchPositionAsyncの解決待ちの間)。その場合は
  // 開いた直後に閉じないと、誰も参照しない購読が測位を回し続ける。
  let finished = false;

  const stop = () => {
    finished = true;
    subscription?.remove();
    subscription = null;
  };

  const promise = new Promise<Location.LocationObject>((resolve, reject) => {
    Location.watchPositionAsync(
      { accuracy, distanceInterval: 0 },
      (location) => {
        if (finished) {
          return;
        }
        stop();
        resolve(location);
      }
    )
      .then((sub) => {
        if (finished) {
          sub.remove();
          return;
        }
        subscription = sub;
      })
      .catch((error) => {
        finished = true;
        reject(error);
      });
  });

  return { promise, stop };
};

/**
 * 補完測位を止めている条件を返す。動かしてよいときは null。
 *
 * 早期returnを条件の論理和で書くと、止まっていること自体は分かっても何が止めたのかが
 * 残らない。要求数が0のとき「途絶が無くて出す必要がなかった」のか「そもそも動いていない」
 * のかは診断で必ず問題になるので、判定したその場で理由として持ち出せる形にする。
 * 先に成立したものを理由とするため、判定の順序がそのまま優先順位になる。
 */
const resolveInactiveState = ({
  autoModeEnabled,
  isAppForeground,
  powerSavingEnabled,
}: {
  autoModeEnabled: boolean;
  isAppForeground: boolean;
  powerSavingEnabled: boolean;
}): LocationHeartbeatState | null => {
  if (!NEEDS_LOCATION_HEARTBEAT) {
    return 'unnecessary';
  }
  // オートモードの現在地はシミュレーターが直接書き込むため、実測位を混ぜない。
  if (autoModeEnabled) {
    return 'auto-mode';
  }
  if (!isAppForeground) {
    return 'app-background';
  }
  if (powerSavingEnabled) {
    return 'power-saving';
  }
  return null;
};

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
 * 継続測位の変位ゲート自体を0へ戻す選択は取らない。iOSでは約1Hzの配信になり電池を
 * 著しく消費するため実車検証を経て10mが選ばれている(#6470)。本フックは無配信のときだけ
 * 動き、取れた1件で購読を閉じるので、前景で走行中(10mは数秒で超える)は一度も発火せず、
 * その決定を実質的に変えない。併せて#6470が狙った「停車中に測位が途絶えて到着判定を
 * 取りこぼす」ケースも、継続測位側の変位ゲートを維持したまま補える。
 *
 * 動かさない条件が3つある。
 *  - 背景: expo-locationのタスクは前景でだけ測位を即時報告し、それ以外では
 *    deferredUpdatesInterval(=10秒)ぶん貯めてから報告する。つまり背景では正常時も
 *    配信間隔が10秒以上になり、途絶と区別できない。加えて補完測位が作る
 *    CLLocationManagerはallowsBackgroundLocationUpdatesを立てない
 *    (Providers/BaseLocationProvider.swift)ため、背景ではそもそも測位を受け取れない。
 *    取りに行っても無駄で、地上でも誤って発火する。判定にはuseIsAppForegroundを使い、
 *    iOSの'inactive'は前景として扱う。'inactive'はコントロールセンターを引き下ろした間や
 *    Appスイッチャーを開いた間に入る状態で、アプリは画面に出たまま、測位も前景と同じように
 *    届く。ここをfalseにすると、乗車中に一度でもそれらを開いただけでeffectが張り直され、
 *    進行中の要求が結果を残さず捨てられる(#6995の診断で要求だけが増え、成功・失敗・見切りが
 *    揃って0だったのがこれ)。
 *  - 前景の位置情報権限が無い: 「許可せずに開始」した利用者では測位の要求が毎回失敗する
 *    だけになる(権限プロンプトも出ない)。前景復帰のたびに再評価する。
 *  - 省電力測位プロファイル中: このプロファイルはiOSで停車中の測位休止
 *    (pausesUpdatesAutomatically)を許可している(#6395)。休止すれば配信は当然途絶えるので、
 *    補完測位を動かすと休止をそのまま打ち消してしまう。電池優先という設定の意図を守り、
 *    省電力中は凍結を許容する。
 */
export const useLocationHeartbeat = (): void => {
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);
  const isAppForeground = useIsAppForeground();
  const { powerSavingEnabled, watchOptions } = useLocationProfile();
  // 補完測位が継続測位より高精度を要求すると、片方だけ電池の重い測位で走ってしまう。
  // 精度は継続測位と同じものを使う。
  const accuracy = watchOptions.accuracy;

  useEffect(() => {
    const inactiveState = resolveInactiveState({
      autoModeEnabled,
      isAppForeground,
      powerSavingEnabled,
    });
    if (inactiveState !== null) {
      setLocationHeartbeatState(inactiveState);
      // 非稼働のまま画面を離れたときも状態を戻す。戻さないと「省電力で止まっている」等の
      // 古い理由がダンプに残り、いま何が止めているのかと読み違える。
      return () => {
        countLocationHeartbeatTornDown();
        setLocationHeartbeatState('not-mounted');
      };
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // 配信をまだ一度も受けていない間の基準時刻。起動直後は継続測位が数秒で最初の
    // 測位を届けるので、そこへ譲るために「effectが始まった時刻に配信があった」と
    // 見なして途絶時間ぶん待つ。待たずに取りに行くと、継続測位と一発取得が起動時に
    // 必ず二重に走る。
    const effectStartedAtMs = monotonicNow();
    // 取得が返らないうちに重ねて要求すると、測位セッションだけが増えて電池を無駄に
    // する。応答が返るまでは新しい要求を出さない。ただし返らないまま放置すると補完
    // 測位ごと止まるので、LOCATION_HEARTBEAT_MAX_PENDINGで見切る。
    let pending = false;
    // 見切りは経過時間の計算ではなくタイマーで行う。時計がどうであれ必ず解けるので、
    // monotonicNowがDate.nowへフォールバックした環境で時計が巻き戻っても、応答が
    // 返らない要求のまま補完測位が止まることがない。
    let giveUpTimeoutId: ReturnType<typeof setTimeout> | null = null;
    // 現役の要求。見切りとクリーンアップから購読を閉じるために持つ。
    let activeRequest: SingleLocationRequest | null = null;
    // 見切った要求が後から返ってきても、そのfinallyで新しい要求のガードを
    // 解いてしまわないよう、要求ごとの識別子で自分の番かを判断する。
    let requestSeq = 0;
    // 取得失敗はトンネル内など環境要因で連続しやすいので、連続中は先頭の1回だけ記録する。
    let consecutiveFailures = 0;

    const schedule = (delayMs: number) => {
      timeoutId = setTimeout(check, Math.max(delayMs, 0));
    };

    const clearGiveUp = () => {
      if (giveUpTimeoutId !== null) {
        clearTimeout(giveUpTimeoutId);
        giveUpTimeoutId = null;
      }
    };

    // 一定間隔のタイマーではなく、「次に途絶が成立する時刻」へ都度置き直す。
    // 固定グリッドにすると、自分が取得した測位で途絶タイマーが巻き戻るぶん必ず
    // 1回ぶん空振りし、実際の取得間隔が閾値の2倍(20秒)まで開いてしまう。
    function check() {
      timeoutId = null;
      if (cancelled) {
        return;
      }

      const now = monotonicNow();

      // 取得中は何もしない。次の点検は応答のfinallyか、見切りタイマーが置き直す。
      // 保留を「経過時間の計算」で解かないのが要点で、時計が巻き戻っても
      // 進んでも、保留の長さは見切りタイマーだけが決める。
      if (pending) {
        return;
      }

      // nullは「起動後まだ一度も配信が無い」状態。基準をeffect開始時刻に置き換え、
      // 起動直後は継続測位へ譲りつつ、届かないままなら途絶として取りに行く。
      const sinceDeliveryMs =
        getMsSinceLastTrackedLocation() ?? now - effectStartedAtMs;
      if (
        sinceDeliveryMs >= 0 &&
        sinceDeliveryMs < LOCATION_HEARTBEAT_STALE_THRESHOLD
      ) {
        schedule(LOCATION_HEARTBEAT_STALE_THRESHOLD - sinceDeliveryMs);
        return;
      }

      pending = true;
      requestSeq += 1;
      const seq = requestSeq;
      countLocationHeartbeatRequested();

      const request = watchSingleLocation(accuracy);
      activeRequest = request;

      // 測位が得られない地下では購読が延々と待ち続ける。待たせたままだと「取得中は次を
      // 出さない」ガードが解けず補完測位が二度と動かないため、ここで見切る。識別子を
      // 進めてから次へ進むので、見切った要求が後から返っても現役の要求のガードは触られない。
      // 一発取得と違い、購読は放置すると測位を回し続けるので必ず閉じる。
      clearGiveUp();
      giveUpTimeoutId = setTimeout(() => {
        giveUpTimeoutId = null;
        if (cancelled) {
          return;
        }
        countLocationHeartbeatAbandoned();
        request.stop();
        if (activeRequest === request) {
          activeRequest = null;
        }
        requestSeq += 1;
        pending = false;
        check();
      }, LOCATION_HEARTBEAT_MAX_PENDING);

      request.promise
        .then((location) => {
          consecutiveFailures = 0;
          if (cancelled) {
            return;
          }
          // 配信と見切りがほぼ同時だったときだけ、同じ要求で succeeded と abandoned の
          // 両方が立つ(locationHeartbeatStats)。
          countLocationHeartbeatSucceeded();
          // 継続測位と同じ入口へ通す。同じ測位が返ってきた場合は重複排除で捨てられ、
          // 精度フィルタ・EMA・速度フィルタも継続測位とまったく同じ扱いになる。
          handleTrackingLocation(location);
        })
        .catch((error) => {
          if (consecutiveFailures === 0) {
            console.warn('補完測位の取得に失敗しました:', error);
          }
          consecutiveFailures += 1;
          // ログは連続中の先頭1回しか出さないので、件数と直近の理由はここで必ず残す。
          countLocationHeartbeatFailed(error);
        })
        .finally(() => {
          // 解決・棄却のどちらで終わっても購読は閉じる。resolve 経路は watchSingleLocation
          // が自分で閉じるが、reject 経路と「見切られたあとに終わった要求」はここでしか
          // 閉じる機会が無い。
          request.stop();
          if (activeRequest === request) {
            activeRequest = null;
          }
          // 見切られたあとの要求は、現役の要求のガードも点検予定も触らない。
          if (cancelled || seq !== requestSeq) {
            return;
          }
          pending = false;
          clearGiveUp();
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
        if (cancelled) {
          return;
        }
        if (!granted) {
          setLocationHeartbeatState('permission-denied');
          return;
        }
      } catch (error) {
        console.warn('前景の位置情報権限の確認に失敗しました:', error);
        // 張り直されたあとに古いeffectの確認が失敗することがある。cancelledを見ないと、
        // 新しいeffectが書いた状態をこの古い失敗が上書きする。
        if (cancelled) {
          return;
        }
        // 確認できなかった場合も補完測位は動かないので、同じ状態として残す。
        // 権限が無いのか確認に失敗したのかは、このログでしか区別しない。
        setLocationHeartbeatState('permission-denied');
        return;
      }
      setLocationHeartbeatState('running');
      // 初回も待たずにcheckへ入れる。ここで固定の途絶時間を待つと、既に途絶した
      // 状態で前景へ戻ったとき(地下でアプリを開き直した等)に、取りに行くまで
      // さらに途絶時間ぶん遅れる。待つかどうかの判断はcheckが一手に持つ。
      schedule(0);
    })();

    return () => {
      cancelled = true;
      countLocationHeartbeatTornDown();
      // 画面を離れた・effectを張り直した時点で点検は止まる。'running' のまま残すと、
      // 動いていない区間のダンプが動作中に見える。張り直しなら直後に再評価が上書きする。
      setLocationHeartbeatState('not-mounted');
      // 進行中の要求はここで終わる。要求も保留ガードも見切りタイマーもこのeffectの
      // ローカル変数なので、張り直しの向こう側へは何も残らない。捨てた事実を数えないと、
      // 結果のカウンタがどれも動かないまま要求数だけが進むダンプになり、「応答が返って
      // いない」のか「返る前に捨てた」のかが読めなくなる。
      if (activeRequest !== null) {
        countLocationHeartbeatDiscarded();
      }
      // 購読はアンマウントで自然に閉じない。閉じ忘れると画面を離れたあとも測位が回る。
      activeRequest?.stop();
      activeRequest = null;
      clearGiveUp();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [accuracy, autoModeEnabled, isAppForeground, powerSavingEnabled]);
};
