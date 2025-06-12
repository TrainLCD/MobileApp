import { atom } from 'jotai';

export interface NotifyState {
  targetStationIds: number[];
}

const notifyState = atom<NotifyState>({
  targetStationIds: [],
});

export default notifyState;
