import { atom } from 'jotai';

export interface HeaderTransitionDelay {
  value: number;
}

const initialHeaderTransitionDelay: HeaderTransitionDelay = {
  value: 100,
};

const headerTransitionDelayState = atom<HeaderTransitionDelay>(initialHeaderTransitionDelay);

export default headerTransitionDelayState;