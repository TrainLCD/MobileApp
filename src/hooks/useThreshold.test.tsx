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

    // 距離/2 > APPROACHING_MAX_THRESHOLD なので、最大閾値を返す
    expect(result.approachingThreshold).toBe(APPROACHING_MAX_THRESHOLD);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('駅間距離がapproachingThreshold上限付近の場合、正しく判定する', () => {
    // 約1000mの距離を設定 -> approachingThreshold = 500 (スケール内),
    // arrivedThreshold = 250 -> ARRIVED_MAX_THRESHOLD(200) でクランプ
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
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('駅間距離がarrivedThreshold上限付近の場合、approachingThresholdは距離/2を返す', () => {
    // 約2500mの距離を設定 -> approachingThreshold ≈ 1250 (上限2000mの手前),
    // arrivedThreshold ≈ 625 -> ARRIVED_MAX_THRESHOLD(200) でクランプ
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

    expect(result.approachingThreshold).toBeGreaterThan(1200);
    expect(result.approachingThreshold).toBeLessThan(1300);
    expect(result.arrivedThreshold).toBe(ARRIVED_MAX_THRESHOLD);
  });

  it('駅間距離が非常に短い場合、最小閾値にクランプされる', () => {
    // 約200mの距離 -> distance/4 ≈ 50 < ARRIVED_MIN_THRESHOLD(75) でクランプ、
    // distance/2 ≈ 100 < APPROACHING_MIN_THRESHOLD(200) で APPROACHING もクランプされる
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

  it('長い駅間では到着の1分以上前に「まもなく」となるよう接近閾値を2000mまで広げる', () => {
    // 室蘭本線 鷲別→幌別(約7.7km)。130km/h・減速度0.69m/s²ではブレーキ開始点が
    // 駅の約945m手前にあり、上限1000mでは減速開始とほぼ同時に「まもなく」となっていた
    mockUseCurrentStation.mockReturnValue({
      id: 1110421,
      groupId: 1110421,
      latitude: 42.35953,
      longitude: 141.042759,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 1110422,
      groupId: 1110422,
      latitude: 42.409782,
      longitude: 141.107293,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBe(2000);
  });

  it('駅間距離が2〜4kmの場合、接近閾値は1000mで頭打ちにせず距離/2を返す', () => {
    // 約3kmの駅間 -> approachingThreshold ≈ 1500
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
      latitude: 35.708236, // 約3km北
      longitude: 139.767125,
    } as ReturnType<typeof useNextStation>);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('thresholds').props.children);

    expect(result.approachingThreshold).toBeGreaterThan(1400);
    expect(result.approachingThreshold).toBeLessThan(1600);
  });
});
