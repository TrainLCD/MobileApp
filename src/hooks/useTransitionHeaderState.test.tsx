import { act, render } from '@testing-library/react-native';
import { useAtom, useAtomValue } from 'jotai';
import type React from 'react';
import { createStation } from '~/utils/test/factories';
import { useCurrentStation } from './useCurrentStation';
import { useInterval } from './useInterval';
import { useIsPassing } from './useIsPassing';
import { useNextStation } from './useNextStation';
import { useTransitionHeaderState } from './useTransitionHeaderState';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtom: jest.fn(),
  useAtomValue: jest.fn(),
}));

jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  default: 'NAVIGATION_ATOM',
}));

jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: 'STATION_ATOM',
}));

jest.mock('../store/atoms/theme', () => ({
  __esModule: true,
  isLEDThemeAtom: 'LED_THEME_ATOM',
}));

jest.mock('../store/atoms/tuning', () => ({
  __esModule: true,
  default: 'TUNING_ATOM',
}));

jest.mock('../translation', () => ({
  __esModule: true,
  isJapanese: true,
}));

jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

jest.mock('./useIsPassing', () => ({
  __esModule: true,
  useIsPassing: jest.fn(),
}));

jest.mock('./useInterval', () => ({
  __esModule: true,
  useInterval: jest.fn(),
}));

jest.mock('./useValueRef', () => ({
  __esModule: true,
  useValueRef: jest.fn(() => ({
    get current() {
      return (
        globalThis as { __headerStateGetter?: () => string }
      ).__headerStateGetter?.();
    },
  })),
}));

const TestComponent: React.FC = () => {
  useTransitionHeaderState();
  return null;
};

describe('useTransitionHeaderState', () => {
  const mockUseAtom = useAtom as jest.Mock;
  const mockUseAtomValue = useAtomValue as jest.Mock;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockUseIsPassing = useIsPassing as jest.MockedFunction<
    typeof useIsPassing
  >;
  const mockUseInterval = useInterval as jest.MockedFunction<
    typeof useInterval
  >;

  let intervalHandler: (() => void) | undefined;
  let navigationAtomValue: {
    headerState: string;
    enabledLanguages: Array<'JA' | 'EN' | 'ZH' | 'KO'>;
    stationForHeader: { id: number } | null;
  };
  let stationAtomValue: {
    arrived: boolean;
    approaching: boolean;
    selectedBound: { id: number } | null;
  };
  let isLEDTheme = false;
  let setNavigationMock: jest.Mock;

  const tick = () => {
    expect(intervalHandler).toBeDefined();
    act(() => {
      intervalHandler?.();
    });
  };

  beforeEach(() => {
    intervalHandler = undefined;
    isLEDTheme = false;
    navigationAtomValue = {
      headerState: 'CURRENT_EN',
      enabledLanguages: ['JA', 'EN', 'ZH', 'KO'],
      stationForHeader: null,
    };
    stationAtomValue = {
      arrived: true,
      approaching: false,
      selectedBound: { id: 1 },
    };

    setNavigationMock = jest.fn((updater) => {
      navigationAtomValue = updater(navigationAtomValue);
    });
    (globalThis as { __headerStateGetter?: () => string }).__headerStateGetter =
      () => navigationAtomValue.headerState;

    mockUseAtom.mockImplementation((atom: unknown) => {
      if (atom === 'NAVIGATION_ATOM') {
        return [navigationAtomValue, setNavigationMock];
      }
      throw new Error('unknown atom');
    });

    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === 'STATION_ATOM') {
        return stationAtomValue;
      }
      if (atom === 'TUNING_ATOM') {
        return { headerTransitionInterval: 1000 };
      }
      if (atom === 'LED_THEME_ATOM') {
        return isLEDTheme;
      }
      throw new Error('unknown atom');
    });

    mockUseCurrentStation.mockReturnValue(
      createStation(10, {
        name: '新宿',
        nameKatakana: 'シンジュク',
        nameRoman: 'Shinjuku',
        nameChinese: '新宿',
        nameKorean: '신주쿠',
      })
    );
    mockUseNextStation.mockReturnValue(
      createStation(11, {
        name: '渋谷',
        nameKatakana: 'シブヤ',
        nameRoman: 'Shibuya',
        nameChinese: '涩谷',
        nameKorean: '시부야',
      })
    );
    mockUseIsPassing.mockReturnValue(false);
    mockUseInterval.mockImplementation((handler) => {
      intervalHandler = handler;
      return { isPausing: false, pause: jest.fn() };
    });
  });

  afterEach(() => {
    (globalThis as { __headerStateGetter?: () => string }).__headerStateGetter =
      undefined;
    jest.clearAllMocks();
  });

  it('EN -> ZH -> KO -> EN の順で循環する', () => {
    navigationAtomValue.enabledLanguages = ['EN', 'ZH', 'KO'];
    navigationAtomValue.headerState = 'CURRENT_EN';

    render(<TestComponent />);

    tick();
    expect(navigationAtomValue.headerState).toBe('CURRENT_ZH');

    tick();
    expect(navigationAtomValue.headerState).toBe('CURRENT_KO');

    tick();
    expect(navigationAtomValue.headerState).toBe('CURRENT_EN');
  });

  it('全言語有効時に KO の次は日本語（CURRENT）へ戻る', () => {
    navigationAtomValue.enabledLanguages = ['JA', 'EN', 'ZH', 'KO'];
    navigationAtomValue.headerState = 'CURRENT_KO';

    render(<TestComponent />);

    tick();

    expect(navigationAtomValue.headerState).toBe('CURRENT');
  });

  it('日本語無効かつ次言語が見つからない場合は JA に戻らない', () => {
    navigationAtomValue.enabledLanguages = ['EN', 'KO'];
    navigationAtomValue.headerState = 'NEXT_KO';
    stationAtomValue.arrived = false;
    mockUseNextStation.mockReturnValue(
      createStation(12, {
        name: '池袋',
        nameKatakana: 'イケブクロ',
        nameRoman: null,
        nameChinese: null,
        nameKorean: '이케부쿠로',
      })
    );

    render(<TestComponent />);

    tick();

    expect(navigationAtomValue.headerState).toBe('NEXT_KO');
  });
});
