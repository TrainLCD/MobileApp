import { render } from '@testing-library/react-native';
import * as Application from 'expo-application';
import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import DevOverlay from './DevOverlay';

jest.mock('jotai', () => {
  const actual = jest.requireActual('jotai');
  return {
    ...actual,
    useAtomValue: jest.fn(),
  };
});

// Mock expo-application
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
}));

// Mock hooks
jest.mock('~/hooks', () => ({
  useLocationStore: jest.fn(),
  useDistanceToNextStation: jest.fn(),
  useNextStation: jest.fn(),
  // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
  useThemeStore: jest.fn((selector: any) => {
    // Return a default theme value
    const state = 'TY';
    return selector ? selector(state) : state;
  }),
}));

// Mock utils
jest.mock('~/utils/accuracyChart', () => ({
  generateAccuracyChart: jest.fn((history: number[]) => {
    // Mock implementation that returns AccuracyBlock[] format
    if (history.length === 0) {
      return [];
    }
    return history.map((_accuracy) => ({
      char: '▇',
      color: '#ffffff',
    }));
  }),
}));

jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabledByBuild: true,
}));

// Import mocked hooks for type safety
import {
  useDistanceToNextStation,
  useLocationStore,
  useNextStation,
} from '~/hooks';

const mockUseAtomValue = useAtomValue as jest.MockedFunction<
  typeof useAtomValue
>;

const mockUseLocationStore = useLocationStore as jest.MockedFunction<
  typeof useLocationStore
>;
const mockUseDistanceToNextStation =
  useDistanceToNextStation as jest.MockedFunction<
    typeof useDistanceToNextStation
  >;
const mockUseNextStation = useNextStation as jest.MockedFunction<
  typeof useNextStation
>;

describe('DevOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAtomValue.mockReturnValue({
      telemetryEnabled: true,
    });

    // Default mock implementations
    // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
    mockUseLocationStore.mockImplementation((selector: any) => {
      const state = {
        location: {
          coords: {
            speed: 10,
            accuracy: 15,
          },
        },
        accuracyHistory: [10, 15, 20],
      };
      return selector(state);
    });

    mockUseDistanceToNextStation.mockReturnValue('500');
    mockUseNextStation.mockReturnValue({
      id: 1,
      name: 'テスト駅',
      nameRoman: 'Test Station',
    } as Station);
  });

  describe('基本的なレンダリング', () => {
    it('クラッシュせずにレンダリングできる', () => {
      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('アプリケーションバージョンを表示する', () => {
      const { getByText } = render(<DevOverlay />);
      expect(
        getByText(
          `TrainLCD DO ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`
        )
      ).toBeTruthy();
    });

    it('テレメトリー状態を表示する', () => {
      const { getByText } = render(<DevOverlay />);
      expect(getByText('Telemetry: ON')).toBeTruthy();
    });
  });

  describe('位置情報の表示', () => {
    it('精度情報を表示する', () => {
      const { getByText } = render(<DevOverlay />);
      expect(getByText('Accuracy: 15m')).toBeTruthy();
    });

    it('速度情報をkm/hで表示する', () => {
      const { getByText } = render(<DevOverlay />);
      // speed: 10 m/s = 36 km/h
      expect(getByText('Speed: 36km/h')).toBeTruthy();
    });

    it('次の駅までの距離を表示する', () => {
      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Next: 500m テスト駅/)).toBeTruthy();
    });

    it('精度チャートを表示する', () => {
      const { getByText } = render(<DevOverlay />);
      // accuracyHistory: [10, 15, 20] -> '▇▇▇'
      expect(getByText('▇▇▇')).toBeTruthy();
    });
  });

  describe('エッジケース', () => {
    it('位置情報がnullの場合にクラッシュしない', () => {
      // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
      mockUseLocationStore.mockImplementation((selector: any) => {
        const state = {
          location: null,
          accuracyHistory: [],
        };
        return selector(state);
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('速度がnullの場合に0km/hを表示する', () => {
      // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
      mockUseLocationStore.mockImplementation((selector: any) => {
        const state = {
          location: {
            coords: {
              speed: null,
              accuracy: 15,
            },
          },
          accuracyHistory: [],
        };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Speed: 0km/h')).toBeTruthy();
    });

    it('速度が負の値の場合に0km/hを表示する', () => {
      // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
      mockUseLocationStore.mockImplementation((selector: any) => {
        const state = {
          location: {
            coords: {
              speed: -5,
              accuracy: 15,
            },
          },
          accuracyHistory: [],
        };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Speed: 0km/h')).toBeTruthy();
    });

    it('精度がnullの場合に空文字を表示する', () => {
      // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
      mockUseLocationStore.mockImplementation((selector: any) => {
        const state = {
          location: {
            coords: {
              speed: 10,
              accuracy: null,
            },
          },
          accuracyHistory: [],
        };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Accuracy: m')).toBeTruthy();
    });

    it('accuracyHistoryが空配列の場合にクラッシュしない', () => {
      // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
      mockUseLocationStore.mockImplementation((selector: any) => {
        const state = {
          location: {
            coords: {
              speed: 10,
              accuracy: 15,
            },
          },
          accuracyHistory: [],
        };
        return selector(state);
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('accuracyHistoryがnullの場合にクラッシュしない', () => {
      // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
      mockUseLocationStore.mockImplementation((selector: any) => {
        const state = {
          location: {
            coords: {
              speed: 10,
              accuracy: 15,
            },
          },
          accuracyHistory: null,
        };
        return selector(state);
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('次の駅までの距離が0の場合に適切に表示する', () => {
      mockUseDistanceToNextStation.mockReturnValue(0);

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Next:')).toBeTruthy();
    });

    it('次の駅情報がundefinedの場合に距離のみ表示する', () => {
      mockUseNextStation.mockReturnValue(undefined);

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Next: 500m$/)).toBeTruthy();
    });

    it('次の駅情報と距離の両方がundefined/0の場合', () => {
      mockUseDistanceToNextStation.mockReturnValue(0);
      mockUseNextStation.mockReturnValue(undefined);

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Next:')).toBeTruthy();
    });
  });

  describe('速度計算のロジック', () => {
    it('速度が0の場合に0km/hを表示する', () => {
      // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
      mockUseLocationStore.mockImplementation((selector: any) => {
        const state = {
          location: {
            coords: {
              speed: 0,
              accuracy: 15,
            },
          },
          accuracyHistory: [],
        };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Speed: 0km/h')).toBeTruthy();
    });

    it('速度が正の小数値の場合に正しく変換する', () => {
      // biome-ignore lint/suspicious/noExplicitAny: テストのモックではセレクター関数の型が不明なため
      mockUseLocationStore.mockImplementation((selector: any) => {
        const state = {
          location: {
            coords: {
              speed: 13.89, // 約50 km/h
              accuracy: 15,
            },
          },
          accuracyHistory: [],
        };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Speed: 50km/h')).toBeTruthy();
    });
  });
});
