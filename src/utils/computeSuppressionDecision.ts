/**
 * TTS再生抑制の判定と状態遷移を行う。
 *
 * 2つの抑制パターンがあり、それぞれ独立した状態遷移を持つ:
 *
 * 1. Post-first-speech (初回放送後の抑制)
 *    トリガー: speakFromPath実行時に firstSpeechRef=false に変更
 *    動作: firstSpeechRef変更によるテキスト再計算で生じる更新を1回だけ無視
 *    解除: 1回抑制後に自動クリア
 *
 * 2. Suppress-until-departure (発車待ち抑制)
 *    トリガー: 行先選択時に有効化
 *    動作: 停車中(arrived=true)は初回TTSを抑止し続ける
 *    解除: 発車後(arrived=false)に解放
 */
export const computeSuppressionDecision = (params: {
  suppressPostFirstSpeechRef: { current: boolean };
  firstSpeechRef: { current: boolean };
  suppressFirstSpeechUntilDepartureRef: { current: boolean };
  arrived: boolean;
}): boolean => {
  // 1. Post-first-speech: firstSpeechRef→falseで生じるテキスト変化を1回だけ無視
  if (params.suppressPostFirstSpeechRef.current) {
    params.suppressPostFirstSpeechRef.current = false;
    return true;
  }

  // 2. Suppress-until-departure
  if (
    params.firstSpeechRef.current &&
    params.suppressFirstSpeechUntilDepartureRef.current
  ) {
    // 停車中は初回TTSを抑止し、発車後の更新で初回を再開する
    if (params.arrived) {
      return true;
    }
    params.suppressFirstSpeechUntilDepartureRef.current = false;
  }

  return false;
};
