import { atom } from 'jotai';

export interface WrongDirectionState {
  isWrongDirection: boolean;
  isLoopLineWrongDirection: boolean;
}

const wrongDirectionAtom = atom<WrongDirectionState>({
  isWrongDirection: false,
  isLoopLineWrongDirection: false,
});

export default wrongDirectionAtom;
