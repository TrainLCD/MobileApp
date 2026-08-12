import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Rect } from 'react-native-svg';
import { THEME_PREFERENCE } from '~/models/Theme';
import { themePreferenceAtom } from '~/store/atoms/theme';
import WalkthroughOverlay, { type WalkthroughStep } from './WalkthroughOverlay';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

const SPOTLIGHT_BORDER_RADIUS = 12;

const step: WalkthroughStep = {
  id: 'settingsTheme',
  titleKey: 'settingsWalkthroughTitle2',
  descriptionKey: 'settingsWalkthroughDescription2',
  spotlightArea: {
    x: 24,
    y: 120,
    width: 320,
    height: 76,
    borderRadius: SPOTLIGHT_BORDER_RADIUS,
  },
};

const renderOverlay = (isLEDTheme: boolean) => {
  const store = createStore();
  store.set(
    themePreferenceAtom,
    isLEDTheme ? THEME_PREFERENCE.LED : THEME_PREFERENCE.TOKYO_METRO
  );

  return render(
    <Provider store={store}>
      <WalkthroughOverlay
        visible
        step={step}
        currentStepIndex={0}
        totalSteps={4}
        onNext={jest.fn()}
        onGoToStep={jest.fn()}
        onSkip={jest.fn()}
      />
    </Provider>
  );
};

// マスク内の切り抜き矩形は fill="black" の Rect のみ
const getSpotlightRect = (screen: ReturnType<typeof renderOverlay>) =>
  screen.UNSAFE_getAllByType(Rect).find((rect) => rect.props.fill === 'black');

describe('WalkthroughOverlay', () => {
  beforeEach(() => {
    // ツールチップ位置のアニメーションがテスト外で進行しないよう固定する
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('通常テーマでは指定された角丸で切り抜く', () => {
    const spotlightRect = getSpotlightRect(renderOverlay(false));

    expect(spotlightRect?.props.rx).toBe(SPOTLIGHT_BORDER_RADIUS);
    expect(spotlightRect?.props.ry).toBe(SPOTLIGHT_BORDER_RADIUS);
  });

  it('LEDテーマでは角丸なしで切り抜く', () => {
    const spotlightRect = getSpotlightRect(renderOverlay(true));

    expect(spotlightRect?.props.rx).toBe(0);
    expect(spotlightRect?.props.ry).toBe(0);
  });

  it('LEDテーマではツールチップも角丸なしになる', () => {
    const { getByLabelText } = renderOverlay(true);

    const nextButton = getByLabelText('walkthroughNext');

    expect(nextButton).toHaveStyle({ borderRadius: 0 });
  });
});
