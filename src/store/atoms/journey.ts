import { atom } from 'jotai';
import type { Station, TrainType } from '~/@types/graphql';

/** 乗換経路の 1 区間(1 本の列車) */
export type JourneyLeg = {
  /** この区間で乗る列車種別(既定は各停) */
  trainType: TrainType;
  /** この区間で乗れる列車種別(connectedRoutes の RouteLeg.trainTypes) */
  trainTypes: TrainType[];
  /** 乗車駅。同じ駅グループでも路線ごとに駅 id が異なる */
  fromStation: Station;
  /** 降車駅。最後の区間では探している駅になる */
  toStation: Station;
};

/** 乗換を含む経路。乗換のない経路はこれを使わず従来の 1 系統の乗車になる */
export type Journey = {
  legs: JourneyLeg[];
  /** 乗車中の区間の添字 */
  currentLegIndex: number;
};

/** 行先選択中の経路。方面を選んだ時点で journeyAtom へ移す */
export const pendingJourneyAtom = atom<Journey | null>(null);

/** 乗車中の経路 */
export const journeyAtom = atom<Journey | null>(null);
