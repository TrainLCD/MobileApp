import { StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  DEFAULT_HEADER_TRANSITION_DELAY,
  DEFAULT_HEADER_TRANSITION_INTERVAL,
} from '../constants/threshold'

export type TuningSlice = {
  headerTransitionInterval: number
  headerTransitionDelay: number
  bottomTransitionInterval: number
  setTuning: (
    headerTransitionInterval: number,
    headerTransitionDelay: number,
    bottomTransitionInterval: number
  ) => void
}

export const createTuningSlice: StateCreator<
  TuningSlice,
  [],
  [['zustand/immer', never], ['zustand/devtools', never]],
  TuningSlice
> = immer(
  devtools((set) => ({
    headerTransitionInterval: DEFAULT_HEADER_TRANSITION_INTERVAL,
    headerTransitionDelay: DEFAULT_HEADER_TRANSITION_DELAY,
    bottomTransitionInterval: DEFAULT_BOTTOM_TRANSITION_INTERVAL,
    setTuning: (
      headerTransitionInterval,
      headerTransitionDelay,
      bottomTransitionInterval
    ) =>
      set((state) => ({
        ...state,
        headerTransitionInterval,
        headerTransitionDelay,
        bottomTransitionInterval,
      })),
  }))
)
