import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Path } from 'react-native-svg';
import { THEME_PREFERENCE } from '~/models/Theme';
import { themePreferenceAtom } from '~/store/atoms/theme';
import { buildRoundedRectPath } from '~/utils/roundedRectPath';
import WalkthroughOverlay, { type WalkthroughStep } from './WalkthroughOverlay';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

const SPOTLIGHT_BORDER_RADIUS = 12;
const SPOTLIGHT_RECT = { x: 24, y: 120, width: 320, height: 76 };

const step: WalkthroughStep = {
  id: 'settingsTheme',
  titleKey: 'settingsWalkthroughTitle2',
  descriptionKey: 'settingsWalkthroughDescription2',
  spotlightArea: {
    ...SPOTLIGHT_RECT,
    borderRadius: SPOTLIGHT_BORDER_RADIUS,
  },
};

const renderOverlay = (
  isLEDTheme: boolean,
  spotlightArea: WalkthroughStep['spotlightArea'] = step.spotlightArea
) => {
  const store = createStore();
  store.set(
    themePreferenceAtom,
    isLEDTheme ? THEME_PREFERENCE.LED : THEME_PREFERENCE.TOKYO_METRO
  );

  return render(
    <Provider store={store}>
      <WalkthroughOverlay
        visible
        step={{ ...step, spotlightArea }}
        currentStepIndex={0}
        totalSteps={4}
        onNext={jest.fn()}
        onGoToStep={jest.fn()}
        onSkip={jest.fn()}
      />
    </Provider>
  );
};

// マスク内の切り抜きは fill="black" の Path のみ
const getSpotlightPath = (screen: ReturnType<typeof renderOverlay>) =>
  screen.UNSAFE_getAllByType(Path).find((path) => path.props.fill === 'black')
    ?.props.d;

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
    expect(getSpotlightPath(renderOverlay(false))).toBe(
      buildRoundedRectPath({
        ...SPOTLIGHT_RECT,
        topLeft: SPOTLIGHT_BORDER_RADIUS,
        topRight: SPOTLIGHT_BORDER_RADIUS,
        bottomRight: SPOTLIGHT_BORDER_RADIUS,
        bottomLeft: SPOTLIGHT_BORDER_RADIUS,
      })
    );
  });

  it('LEDテーマでは角丸なしで切り抜く', () => {
    expect(getSpotlightPath(renderOverlay(true))).toBe(
      buildRoundedRectPath({
        ...SPOTLIGHT_RECT,
        topLeft: 0,
        topRight: 0,
        bottomRight: 0,
        bottomLeft: 0,
      })
    );
  });

  it('隅ごとの指定があれば対象要素の形に合わせて切り抜く', () => {
    const path = getSpotlightPath(
      renderOverlay(false, {
        ...SPOTLIGHT_RECT,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      })
    );

    expect(path).toBe(
      buildRoundedRectPath({
        ...SPOTLIGHT_RECT,
        topLeft: 0,
        topRight: 0,
        bottomRight: 16,
        bottomLeft: 16,
      })
    );
  });

  it('隅ごとの指定がない隅には borderRadius が使われる', () => {
    const path = getSpotlightPath(
      renderOverlay(false, {
        ...SPOTLIGHT_RECT,
        borderRadius: SPOTLIGHT_BORDER_RADIUS,
        borderTopLeftRadius: 0,
      })
    );

    expect(path).toBe(
      buildRoundedRectPath({
        ...SPOTLIGHT_RECT,
        topLeft: 0,
        topRight: SPOTLIGHT_BORDER_RADIUS,
        bottomRight: SPOTLIGHT_BORDER_RADIUS,
        bottomLeft: SPOTLIGHT_BORDER_RADIUS,
      })
    );
  });

  it('LEDテーマでは隅ごとの指定があっても角丸なしにする', () => {
    const path = getSpotlightPath(
      renderOverlay(true, {
        ...SPOTLIGHT_RECT,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      })
    );

    expect(path).toBe(
      buildRoundedRectPath({
        ...SPOTLIGHT_RECT,
        topLeft: 0,
        topRight: 0,
        bottomRight: 0,
        bottomLeft: 0,
      })
    );
  });

  it('LEDテーマではツールチップも角丸なしになる', () => {
    const { getByLabelText } = renderOverlay(true);

    const nextButton = getByLabelText('walkthroughNext');

    expect(nextButton).toHaveStyle({ borderRadius: 0 });
  });
});
