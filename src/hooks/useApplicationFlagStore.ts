import { create } from 'zustand';

type State = {
  autoModeEnabled: boolean;
  toggleAutoModeEnabled: () => void;
};

export const useApplicationFlagStore = create<State>((set) => ({
  autoModeEnabled: false,
  toggleAutoModeEnabled: () =>
    set((state) => ({ autoModeEnabled: !state.autoModeEnabled })),
}));
