import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type { AvailableLanguage } from '~/constants';
import type { HeaderTransitionState } from '~/models/HeaderTransitionState';
import {
  enabledLanguagesAtom,
  headerStateAtom,
} from '~/store/atoms/navigation';
import { EstimatedMinutesUnitLabel } from './EstimatedMinutesUnitLabel';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

const renderWithState = (
  headerState: HeaderTransitionState,
  enabledLanguages?: AvailableLanguage[]
) => {
  const store = createStore();
  store.set(headerStateAtom, headerState);
  if (enabledLanguages) {
    store.set(enabledLanguagesAtom, enabledLanguages);
  }
  return render(
    <Provider store={store}>
      <EstimatedMinutesUnitLabel />
    </Provider>
  );
};

describe('EstimatedMinutesUnitLabel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('中国語Stateでは駅名の英語表示に追従して「min.」を表示する', () => {
    const { getByText } = renderWithState('CURRENT_ZH');
    expect(getByText('min.')).toBeTruthy();
  });

  it('中国語StateでもENが無効なら「分」を表示する', () => {
    const { getByText } = renderWithState('CURRENT_ZH', ['JA', 'ZH']);
    expect(getByText('分')).toBeTruthy();
  });

  it('韓国語Stateでは「分」を表示する(韓国語専用表記は持たない)', () => {
    const { getByText } = renderWithState('CURRENT_KO');
    expect(getByText('分')).toBeTruthy();
  });
});
