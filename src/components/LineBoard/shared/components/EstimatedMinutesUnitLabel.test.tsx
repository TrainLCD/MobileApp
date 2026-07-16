import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type { HeaderTransitionState } from '~/models/HeaderTransitionState';
import { headerStateAtom } from '~/store/atoms/navigation';
import { EstimatedMinutesUnitLabel } from './EstimatedMinutesUnitLabel';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

const renderWithState = (headerState: HeaderTransitionState) => {
  const store = createStore();
  store.set(headerStateAtom, headerState);
  return render(
    <Provider store={store}>
      <EstimatedMinutesUnitLabel />
    </Provider>
  );
};

describe('EstimatedMinutesUnitLabel', () => {
  it.each<HeaderTransitionState>(['CURRENT', 'NEXT', 'ARRIVING'])(
    '日本語State(%s)では「分」を表示する',
    (state) => {
      const { getByText } = renderWithState(state);
      expect(getByText('分')).toBeTruthy();
    }
  );

  it('かなStateでは「分」を表示する', () => {
    const { getByText } = renderWithState('CURRENT_KANA');
    expect(getByText('分')).toBeTruthy();
  });

  it('英語Stateでは「min.」を表示する', () => {
    const { getByText } = renderWithState('CURRENT_EN');
    expect(getByText('min.')).toBeTruthy();
  });

  it('中国語Stateでは「分」を表示する', () => {
    const { getByText } = renderWithState('CURRENT_ZH');
    expect(getByText('分')).toBeTruthy();
  });

  it('韓国語Stateでは「분」を表示する', () => {
    const { getByText } = renderWithState('CURRENT_KO');
    expect(getByText('분')).toBeTruthy();
  });
});
