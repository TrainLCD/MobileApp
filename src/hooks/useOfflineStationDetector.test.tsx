import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { useOfflineStationDetector } from './useOfflineStationDetector';

// モック状態
let mockLocationState: { coords: { accuracy: number | null } } | null = null;
let mockMotionState = {
  phase: 'unknown' as const,
  confidence: 0,
  phaseStartTime: 0,
  lastStopTime: null as number | null,
  isEnabled: false,
  stopCount: 0,
  currentAcceleration: 0,
  currentVariance: 0,
};
let mockStationStopCount = 0;
let mockIsForced = false;
let mockNavigationState = {
  autoModeEnabled: false,
  headerState: 'CURRENT',
  leftStations: [],
  trainType: null,
  stationForHeader: null,
  fetchedTrainTypes: [],
  firstStop: true,
  presetsFetched: false,
  presetRoutes: [],
};

// モック関数
const mockSetMotionEnabled = jest.fn();
const mockSetStation = jest.fn();
const mockSetNavigation = jest.fn();

// Atom モック
jest.mock('~/store/atoms/location', () => ({
  __esModule: true,
  locationAtom: 'LOCATION_ATOM',
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: 'NAVIGATION_ATOM',
}));

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: 'STATION_ATOM',
}));

jest.mock('~/store/atoms/trainMotion', () => ({
  __esModule: true,
  trainMotionAtom: 'TRAIN_MOTION_ATOM',
  stationStopDetectedAtom: 'STATION_STOP_DETECTED_ATOM',
  motionDetectionEnabledAtom: 'MOTION_DETECTION_ENABLED_ATOM',
  motionDetectionForcedAtom: 'MOTION_DETECTION_FORCED_ATOM',
}));

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  useSetAtom: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(() => ({
    id: '2',
    groupId: 2,
    name: 'テスト駅',
    nameKatakana: 'テストエキ',
    nameRoman: 'Test Station',
    nameChinese: '测试站',
    nameKorean: '테스트역',
    latitude: 35.682,
    longitude: 139.768,
    prefectureId: 13,
    lines: [],
    hasTrainTypes: false,
    linesList: [],
  })),
}));

jest.mock('./useTrainMotionDetector', () => ({
  __esModule: true,
  useTrainMotionDetector: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const state = useOfflineStationDetector();
  return (
    <Text testID="detector">
      {JSON.stringify({
        isOfflineModeActive: state.isOfflineModeActive,
        detectedStopCount: state.detectedStopCount,
      })}
    </Text>
  );
};

describe('useOfflineStationDetector', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseSetAtom = useSetAtom as jest.MockedFunction<typeof useSetAtom>;

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルト状態をリセット
    mockLocationState = { coords: { accuracy: 10 } };
    mockMotionState = {
      phase: 'unknown',
      confidence: 0,
      phaseStartTime: 0,
      lastStopTime: null,
      isEnabled: false,
      stopCount: 0,
      currentAcceleration: 0,
      currentVariance: 0,
    };
    mockStationStopCount = 0;
    mockIsForced = false;
    mockNavigationState = {
      autoModeEnabled: false,
      headerState: 'CURRENT',
      leftStations: [],
      trainType: null,
      stationForHeader: null,
      fetchedTrainTypes: [],
      firstStop: true,
      presetsFetched: false,
      presetRoutes: [],
    };

    mockSetMotionEnabled.mockClear();
    mockSetStation.mockClear();
    mockSetNavigation.mockClear();

    mockUseAtomValue.mockImplementation((atom: unknown) => {
      switch (atom) {
        case 'LOCATION_ATOM':
          return mockLocationState;
        case 'TRAIN_MOTION_ATOM':
          return mockMotionState;
        case 'STATION_STOP_DETECTED_ATOM':
          return mockStationStopCount;
        case 'MOTION_DETECTION_FORCED_ATOM':
          return mockIsForced;
        case 'NAVIGATION_ATOM':
          return mockNavigationState;
        default:
          throw new Error(`Unknown atom: ${String(atom)}`);
      }
    });

    mockUseSetAtom.mockImplementation((atom: unknown) => {
      switch (atom) {
        case 'MOTION_DETECTION_ENABLED_ATOM':
          return mockSetMotionEnabled;
        case 'STATION_ATOM':
          return mockSetStation;
        case 'NAVIGATION_ATOM':
          return mockSetNavigation;
        default:
          return jest.fn();
      }
    });
  });

  it('正常にレンダリングされる', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('detector')).toBeTruthy();
  });

  it('GPS精度が良い場合、モーション検出を有効化しない', () => {
    mockLocationState = { coords: { accuracy: 10 } };
    mockMotionState = { ...mockMotionState, isEnabled: false };

    render(<TestComponent />);

    expect(mockSetMotionEnabled).not.toHaveBeenCalledWith(true);
  });

  it('オートモードが有効な場合、モーション検出を有効化しない', () => {
    mockLocationState = { coords: { accuracy: 200 } }; // 悪いGPS精度
    mockNavigationState = { ...mockNavigationState, autoModeEnabled: true };
    mockMotionState = { ...mockMotionState, isEnabled: false };

    render(<TestComponent />);

    // オートモード時はGPS精度が悪くてもモーション検出を有効化しない
    expect(mockSetMotionEnabled).not.toHaveBeenCalledWith(true);
  });

  it('オートモードが有効でモーション検出が有効な場合、無効化する', async () => {
    mockNavigationState = { ...mockNavigationState, autoModeEnabled: true };
    mockMotionState = { ...mockMotionState, isEnabled: true };

    render(<TestComponent />);

    await waitFor(() => {
      expect(mockSetMotionEnabled).toHaveBeenCalledWith(false);
    });
  });

  it('強制モード時はGPS精度が回復しても無効化しない', () => {
    mockLocationState = { coords: { accuracy: 10 } }; // 良いGPS精度
    mockIsForced = true;
    mockMotionState = { ...mockMotionState, isEnabled: true };

    render(<TestComponent />);

    // 強制モードなので無効化されない
    expect(mockSetMotionEnabled).not.toHaveBeenCalledWith(false);
  });

  it('強制モードでない場合、GPS精度が回復したら無効化する', () => {
    mockLocationState = { coords: { accuracy: 10 } }; // 良いGPS精度
    mockIsForced = false;
    mockMotionState = { ...mockMotionState, isEnabled: true };

    render(<TestComponent />);

    expect(mockSetMotionEnabled).toHaveBeenCalledWith(false);
  });

  it('isOfflineModeActiveがmotionState.isEnabledを反映する', () => {
    mockMotionState = { ...mockMotionState, isEnabled: true };

    const { getByTestId } = render(<TestComponent />);
    const text = getByTestId('detector').props.children;
    const parsed = JSON.parse(text);

    expect(parsed.isOfflineModeActive).toBe(true);
  });

  it('detectedStopCountがstationStopCountを反映する', () => {
    mockStationStopCount = 5;

    const { getByTestId } = render(<TestComponent />);
    const text = getByTestId('detector').props.children;
    const parsed = JSON.parse(text);

    expect(parsed.detectedStopCount).toBe(5);
  });
});
