import { atom } from 'jotai';
import stationState from '~/store/atoms/station';

// stationStateはモノリシックなオブジェクトatomのため、全体を購読すると
// 無関係なフィールドの変更でも購読コンポーネントが再レンダーされる。
// jotaiの派生atomは算出結果がObject.isで前回と同一なら購読者へ通知しないため、
// 単一フィールドの派生atom経由で購読することで再レンダーを必要時に限定できる。
export const arrivedAtom = atom((get) => get(stationState).arrived);
export const approachingAtom = atom((get) => get(stationState).approaching);
export const stationsAtom = atom((get) => get(stationState).stations);
