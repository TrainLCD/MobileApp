import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import { portraitModeEnabledAtom } from '~/store/atoms/display';
import {
  canShowPortraitBanner,
  finishPortraitPromo,
  PORTRAIT_BANNER_MAX_COUNT,
  recordPortraitBannerShown,
} from '~/utils/portraitPromo';
import { PortraitModePromoBanner } from './PortraitModePromoBanner';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

const renderBanner = (portraitModeEnabled = false) => {
  const store = createStore();
  store.set(portraitModeEnabledAtom, portraitModeEnabled);

  return render(
    <Provider store={store}>
      <PortraitModePromoBanner />
    </Provider>
  );
};

describe('PortraitModePromoBanner', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('条件を満たすときに表示する', () => {
    const { queryByTestId } = renderBanner();

    expect(queryByTestId('portrait-mode-promo-banner')).toBeTruthy();
  });

  it('ポートレートモードが有効なら表示しない', () => {
    const { queryByTestId } = renderBanner(true);

    expect(queryByTestId('portrait-mode-promo-banner')).toBeNull();
  });

  it('訴求を打ち切ったあとは表示しない', () => {
    finishPortraitPromo();

    const { queryByTestId } = renderBanner();

    expect(queryByTestId('portrait-mode-promo-banner')).toBeNull();
  });

  it('上限回数まで表示したら出さない', () => {
    for (let i = 0; i < PORTRAIT_BANNER_MAX_COUNT; i++) {
      recordPortraitBannerShown();
    }

    const { queryByTestId } = renderBanner();

    expect(queryByTestId('portrait-mode-promo-banner')).toBeNull();
  });

  it('表示したら回数を記録する', () => {
    renderBanner();

    // 1回表示した分が減るので、残りは上限-1回
    for (let i = 1; i < PORTRAIT_BANNER_MAX_COUNT; i++) {
      expect(canShowPortraitBanner()).toBe(true);
      recordPortraitBannerShown();
    }
    expect(canShowPortraitBanner()).toBe(false);
  });

  it('1回の表示につき1回しか数えない（StrictModeのeffect二重実行対策）', () => {
    const { rerender } = renderBanner();

    // StrictMode 相当の再実行や、親の再レンダーで effect が再評価されても増えない
    rerender(
      <Provider store={createStore()}>
        <PortraitModePromoBanner />
      </Provider>
    );

    expect(storage.getString(STORAGE_KEYS.PORTRAIT_PROMO_BANNER_COUNT)).toBe(
      '1'
    );
  });

  it('タップすると外観設定へ遷移する', () => {
    const { getByTestId } = renderBanner();

    fireEvent.press(getByTestId('portrait-mode-promo-banner'));

    expect(mockNavigate).toHaveBeenCalledWith('ColorSchemeSettings');
  });
});
