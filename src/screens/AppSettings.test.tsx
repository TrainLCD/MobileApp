import { render, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';
import type {
  WalkthroughStep,
  WalkthroughStepId,
} from '~/components/WalkthroughOverlay';
import AppSettingsScreen from './AppSettings';

// --- モジュールモック ---

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-native-app-clip', () => ({
  isClip: () => false,
}));

jest.mock('expo-linear-gradient', () => {
  const { View: RNView } = require('react-native');
  return { LinearGradient: RNView };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View: RNView } = require('react-native');
  return { SafeAreaView: RNView };
});

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

jest.mock('~/components/WalkthroughOverlay', () => () => null);

// ヘッダーはマウント時に onLayout を発火させ、画面側の再計測を起動する
jest.mock('~/components/SettingsHeader', () => {
  const { useEffect: useEffectMock } = require('react');
  return {
    SettingsHeader: ({
      onLayout,
    }: {
      onLayout: (e: { nativeEvent: { layout: { height: number } } }) => void;
    }) => {
      useEffectMock(() => {
        onLayout({ nativeEvent: { layout: { height: 64 } } });
      }, [onLayout]);
      return null;
    },
  };
});

jest.mock('../components/FooterTabBar', () => ({
  __esModule: true,
  default: () => null,
  useFooterHeight: () => 0,
}));

const mockSetSpotlightArea = jest.fn();
let mockCurrentStepId: WalkthroughStepId | null = null;

jest.mock('~/hooks/useSettingsWalkthrough', () => ({
  useSettingsWalkthrough: () => ({
    isWalkthroughCompleted: false,
    isWalkthroughActive: true,
    currentStepIndex: 0,
    currentStepId: mockCurrentStepId,
    currentStep: null,
    totalSteps: 4,
    nextStep: jest.fn(),
    goToStep: jest.fn(),
    skipWalkthrough: jest.fn(),
    setSpotlightArea: mockSetSpotlightArea,
  }),
}));

const MEASURED_RECT = { x: 24, y: 120, width: 320, height: 76 };

const lastSpotlightArea = (): WalkthroughStep['spotlightArea'] => {
  const lastCall = mockSetSpotlightArea.mock.calls.at(-1);
  return lastCall?.[0];
};

// スポットライト対象の項目を持つステップ
const SPOTLIGHT_STEP_IDS: WalkthroughStepId[] = [
  'settingsTheme',
  'settingsTts',
  'settingsLanguages',
];

describe('AppSettingsScreen', () => {
  let measureSpy: jest.SpyInstance;

  beforeEach(() => {
    // jest 環境では measureInWindow のコールバックが呼ばれないため、固定の矩形を返す
    measureSpy = jest
      .spyOn(
        View.prototype as unknown as {
          measureInWindow: (
            callback: (
              x: number,
              y: number,
              width: number,
              height: number
            ) => void
          ) => void;
        },
        'measureInWindow'
      )
      .mockImplementation((callback) => {
        callback(
          MEASURED_RECT.x,
          MEASURED_RECT.y,
          MEASURED_RECT.width,
          MEASURED_RECT.height
        );
      });
  });

  afterEach(() => {
    mockCurrentStepId = null;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('ウォークスルーの切り抜きは全ステップで同一の角丸半径になる', async () => {
    const radii: (number | undefined)[] = [];

    for (const stepId of SPOTLIGHT_STEP_IDS) {
      mockCurrentStepId = stepId;
      mockSetSpotlightArea.mockClear();

      const { unmount } = render(<AppSettingsScreen />);

      await waitFor(() => expect(mockSetSpotlightArea).toHaveBeenCalled());
      radii.push(lastSpotlightArea()?.borderRadius);

      unmount();
    }

    expect(radii).toHaveLength(SPOTLIGHT_STEP_IDS.length);
    // 角丸なしのケースが混ざらないこと
    expect(radii.every((radius) => typeof radius === 'number')).toBe(true);
    expect(new Set(radii).size).toBe(1);
  });

  it('スポットライト対象がないステップでは切り抜きを設定しない', async () => {
    mockCurrentStepId = 'settingsWelcome';
    render(<AppSettingsScreen />);

    await waitFor(() => expect(measureSpy).toHaveBeenCalled());
    expect(mockSetSpotlightArea).not.toHaveBeenCalled();
  });
});
