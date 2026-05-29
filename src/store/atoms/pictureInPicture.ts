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
