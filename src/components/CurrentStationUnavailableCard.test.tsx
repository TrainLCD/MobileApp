import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { stationSearchModalVisibleAtom } from '~/store/atoms/stationSearchPrompt';
import { CurrentStationUnavailableCard } from './CurrentStationUnavailableCard';

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: true,
}));

describe('CurrentStationUnavailableCard', () => {
  const renderCard = (onRetry = jest.fn()) => {
    const store = createStore();
    const utils = render(
      <Provider store={store}>
        <CurrentStationUnavailableCard onRetry={onRetry} />
      </Provider>
    );
    return { store, onRetry, ...utils };
  };

  it('駅名で検索を押すと駅名検索モーダルを開く', () => {
    const { store, getByText } = renderCard();

    fireEvent.press(getByText('searchByStationName'));

    expect(store.get(stationSearchModalVisibleAtom)).toBe(true);
  });

  it('位置情報を再取得を押すと再取得を呼ぶ', () => {
    const { onRetry, store, getByText } = renderCard();

    fireEvent.press(getByText('retryFetchLocation'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(store.get(stationSearchModalVisibleAtom)).toBe(false);
  });
});
