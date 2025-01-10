import { create } from "zustand";
import {
	DEFAULT_BOTTOM_TRANSITION_INTERVAL,
	DEFAULT_HEADER_TRANSITION_DELAY,
	DEFAULT_HEADER_TRANSITION_INTERVAL,
} from "../constants";

export const useTuningStore = create<{
	headerTransitionInterval: number;
	headerTransitionDelay: number;
	bottomTransitionInterval: number;
}>(() => ({
	headerTransitionInterval: DEFAULT_HEADER_TRANSITION_INTERVAL,
	headerTransitionDelay: DEFAULT_HEADER_TRANSITION_DELAY,
	bottomTransitionInterval: DEFAULT_BOTTOM_TRANSITION_INTERVAL,
}));
