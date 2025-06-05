import { atom } from 'jotai';
import navigationState from '~/store/atoms/navigation';

export const isEnAtom = atom((get) => {
  const { headerState } = get(navigationState);
  return headerState.endsWith('_EN') || headerState.endsWith('_ZH');
});
