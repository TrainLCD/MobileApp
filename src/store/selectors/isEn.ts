import { selector } from 'recoil';
import { RECOIL_STATES } from '~/constants';
import navigationState from '~/store/atoms/navigation';

export const isEnSelector = selector({
  key: RECOIL_STATES.isEnSelector,
  get: ({ get }) => {
    const { headerState } = get(navigationState);
    return headerState.endsWith('_EN') || headerState.endsWith('_ZH');
  },
});
