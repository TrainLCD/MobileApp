import { atom } from 'jotai';

export type PictureInPictureActivityState = {
  stationName: string;
  nextStationName: string;
  stationNumber: string;
  nextStationNumber: string;
  approaching: boolean;
  stopped: boolean;
  boundStationName: string;
  boundStationNumber: string;
  trainTypeName: string;
  isLoopLine: boolean;
  isNextLastStop: boolean;
  lineColor: string;
  lineName: string;
  passingStationName: string;
  passingStationNumber: string;
  progress: number;
};

export type PictureInPictureState = {
  enabled: boolean;
  active: boolean;
  activityState: PictureInPictureActivityState | null;
};

export const pictureInPictureAtom = atom<PictureInPictureState>({
  enabled: true,
  active: false,
  activityState: null,
});

// activityState は位置更新のたびに書き換わる（progress を含む）ため、
// enabled / active だけが必要な購読者が pictureInPictureAtom を丸ごと購読すると
// 毎ティック再レンダーされてしまう。boolean の派生 atom は値が変わらない限り
// 通知されないので、こちらを購読する。
export const pictureInPictureEnabledAtom = atom(
  (get) => get(pictureInPictureAtom).enabled
);
export const pictureInPictureActiveAtom = atom(
  (get) => get(pictureInPictureAtom).active
);
