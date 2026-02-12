import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import {
  APPROACHING_MAX_THRESHOLD,
  APPROACHING_MIN_THRESHOLD,
  ARRIVED_MAX_THRESHOLD,
  ARRIVED_MIN_THRESHOLD,
} from '../constants/threshold';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';
import { useThreshold } from './useThreshold';

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const { approachingThreshold, arrivedThreshold } = useThreshold();
  return (
    <Text testID="thresholds">
      {JSON.stringify({ approachingThreshold, arrivedThreshold })}
    </Text>
  );
};

describe('useThreshold', () => {
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('currentStationがnullの場合、デフォルトの閾値を返す', () => {
    mockUseCurrentStation.mockReturnValue(undefined);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('nextStationがnullの場合、デフォルトの閾値を返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('currentStationのlatitudeがnullの場合、デフォルトの閾値を返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: null,
      longitude: 139.7671,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('currentStationのlongitudeがnullの場合、デフォルトの閾値を返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.6812,
      longitude: null,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('nextStationのlatitudeがnullの場合、デフォルトの閾値を返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: null,
      longitude: 139.7671,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('nextStationのlongitudeがnullの場合、デフォルトの閾値を返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.6812,
      longitude: 139.7671,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.6812,
      longitude: null,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('駅間距離が短い場合、計算された閾値を返す（距離/2と距離/4）', () => {
    // 東京駅付近の座標 - 約500m離れた位置を設定
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.685175, // 約500m北
      longitude: 139.767125,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    // 約438mの距離 -> approachingThreshold = 219, arrivedThreshold = 109.5
    expect(result.approachingThreshold).toBeLessThan(APPROACHING_MAX_THRESHOLD);
    expect(result.approachingThreshold).toBeGreaterThanOrEqual(
      APPROACHING_MIN_THRESHOLD
    );
    expect(result.arrivedThreshold).toBeLessThan(ARRIVED_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBeGreaterThanOrEqual(
      ARRIVED_MIN_THRESHOLD
    );
    // approachingThresholdはarrivedThresholdの2倍
    expect(result.approachingThreshold).toBe(result.arrivedThreshold * 2);
  });

  it('駅間距離が長い場合、最大閾値を返す', () => {
    // 東京駅と新宿駅程度の距離（約6.5km）
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.681236, // 東京駅
      longitude: 139.767125,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.689487, // 新宿駅
      longitude: 139.700471,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    // 距離/2 > 1000 なので、最大閾値を返す
    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('駅間距離がapproachingThreshold上限付近の場合、正しく判定する', () => {
    // 約1000mの距離を設定 -> approachingThreshold = 500, arrivedThreshold = 250
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.690236, // 約1000m北
      longitude: 139.767125,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBeLessThan(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBeLessThan(ARRIVED_MAX_THRESHOLD);
  });

  it('駅間距離がarrivedThreshold上限付近でapproachingThresholdが最大値の場合', () => {
    // 約2500mの距離を設定 -> 両方とも最大値
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.703736, // 約2500m北
      longitude: 139.767125,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('駅間距離が非常に短い場合、最小閾値にクランプされる', () => {
    // 約200mの距離 -> distance/4 = 50 < ARRIVED_MIN_THRESHOLD(100)
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.683036, // 約200m北
      longitude: 139.767125,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.arrivedThreshold).toBeGreaterThanOrEqual(
      ARRIVED_MIN_THRESHOLD
    );
    expect(result.approachingThreshold).toBeGreaterThanOrEqual(
      APPROACHING_MIN_THRESHOLD
    );
  });
});
