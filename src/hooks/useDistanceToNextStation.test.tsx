import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { useDistanceToNextStation } from './useDistanceToNextStation';
import { useNextStation } from './useNextStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const distance = useDistanceToNextStation();
  return <Text testID="distance">{String(distance)}</Text>;
};

describe('useDistanceToNextStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('位置情報がnullの場合、0を返す', () => {
    mockUseAtomValue.mockReturnValue(null);
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });

  it('位置情報のlatitudeがnullの場合、0を返す', () => {
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: null,
        longitude: 139.7671,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });

  it('位置情報のlongitudeがnullの場合、0を返す', () => {
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 35.6812,
        longitude: null,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });

  it('nextStationがundefinedの場合、0を返す', () => {
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 35.6812,
        longitude: 139.7671,
      },
    });
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });

  it('nextStationのlatitudeがnullの場合、0を返す', () => {
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 35.6812,
        longitude: 139.7671,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: null,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });

  it('nextStationのlongitudeがnullの場合、0を返す', () => {
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 35.6812,
        longitude: 139.7671,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 35.6812,
      longitude: null,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });

  it('すべての座標が有効な場合、距離を計算して返す', () => {
    // 東京駅付近の座標 - 約500m離れた位置を設定
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 35.681236,
        longitude: 139.767125,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 35.685175, // 約438m北
      longitude: 139.767125,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = getByTestId('distance').props.children;

    // 距離が計算されて文字列で返される（ロケールフォーマット）
    expect(result).not.toBe('0');
    // 距離は約438mなので、3桁の数字が含まれる
    expect(result).toMatch(/\d+/);
  });

  it('同じ位置の場合、0を返す', () => {
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 35.681236,
        longitude: 139.767125,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });

  it('遠い距離の場合、大きな数値を返す', () => {
    // 東京駅と大阪駅程度の距離（約400km）
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 35.681236, // 東京駅
        longitude: 139.767125,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 34.702485, // 大阪駅
      longitude: 135.495951,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = getByTestId('distance').props.children;

    expect(result).not.toBe('0');
    // 400km以上の距離なので、6桁以上の数字（ロケールフォーマットでカンマ含む可能性あり）
    expect(result.replace(/,/g, '').length).toBeGreaterThanOrEqual(6);
  });

  it('latitude=0の場合、falsyとして扱われ0を返す', () => {
    // JavaScriptでは0はfalsyな値として扱われるため、
    // latitude && longitude の条件は false になる
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 0,
        longitude: 139.767125,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });

  it('longitude=0の場合、falsyとして扱われ0を返す', () => {
    mockUseAtomValue.mockReturnValue({
      coords: {
        latitude: 35.6812,
        longitude: 0,
      },
    });
    mockUseNextStation.mockReturnValue({
      id: 1,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('distance').props.children).toBe('0');
  });
});
