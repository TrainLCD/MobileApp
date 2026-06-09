import { atom } from 'jotai';
import navigationState from '~/store/atoms/navigation';

// navigationStateはheaderStateのローテーション(数秒間隔)で頻繁に新オブジェクトへ
// 置き換わるため、全体を購読するとheaderStateを使わないコンポーネントまで
// 数秒ごとに再レンダーされる。フィールド単位の派生atomで購読を絞る。
// (派生atomは算出結果がObject.isで前回と同一なら購読者へ通知しない)
export const leftStationsAtom = atom(
  (get) => get(navigationState).leftStations
);
export const enabledLanguagesAtom = atom(
  (get) => get(navigationState).enabledLanguages
);
