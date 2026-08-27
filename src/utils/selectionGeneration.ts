/**
 * 路線・列車種別・プリセットの選択で共有する世代カウンタ。
 *
 * これらの選択はいずれも非同期に駅一覧を取得してから `stationState` /
 * `navigationState` を書き換えるため、取得中に別の選択が行われると、遅れて
 * 完了した古い要求が新しい選択を上書きしうる。各フックがそれぞれ `useRef` で
 * 世代を持つとフックをまたいだ競合(例: 乗車中に種別を選んだ直後に路線選択画面で
 * 別路線を選ぶ)を検出できないため、モジュールレベルで1つの世代を共有する。
 *
 * 選択の開始時に `beginSelection()` を呼んで世代を受け取り、`await` の直後に
 * `isLatestSelection()` で自分がまだ最新の選択かを確認してから state を書き換える。
 */
let currentGeneration = 0;

/** 新しい選択を開始し、その世代を返す。 */
export const beginSelection = (): number => ++currentGeneration;

/** 与えられた世代が最新の選択かどうかを返す。 */
export const isLatestSelection = (generation: number): boolean =>
  generation === currentGeneration;
