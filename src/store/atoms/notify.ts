import { atom } from 'jotai';

export interface NotifyState {
  targetStationIds: number[];
  wrongDirectionNotifyEnabled: boolean;
}

const notifyState = atom<NotifyState>({
  targetStationIds: [],
  wrongDirectionNotifyEnabled: false,
});

export default notifyState;
