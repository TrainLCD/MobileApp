import { renderHook } from '@testing-library/react-native';
import {
  LOCATION_TASK_OPTIONS,
  LOCATION_TASK_OPTIONS_POWER_SAVING,
  LOCATION_WATCH_OPTIONS,
  LOCATION_WATCH_OPTIONS_POWER_SAVING,
} from '../constants';
import { useLocationProfile } from './useLocationProfile';

let mockSystemLowPowerMode = false;
jest.mock('expo-battery', () => ({
  useLowPowerMode: () => mockSystemLowPowerMode,
}));

jest.mock('~/store/atoms/battery', () => ({
  powerSavingLocationEnabledAtom: {
    toString: () => 'powerSavingLocationEnabledAtom',
  },
}));

let mockPowerSavingLocationEnabled = false;
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn((atom: unknown) => {
    if (String(atom) === 'powerSavingLocationEnabledAtom') {
      return mockPowerSavingLocationEnabled;
    }
    return undefined;
  }),
}));

describe('useLocationProfile', () => {
  beforeEach(() => {
    mockPowerSavingLocationEnabled = false;
    mockSystemLowPowerMode = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('既定では通常プロファイルを返す', () => {
    const { result } = renderHook(() => useLocationProfile());

    expect(result.current.powerSavingEnabled).toBe(false);
    expect(result.current.watchOptions).toBe(LOCATION_WATCH_OPTIONS);
    expect(result.current.taskOptions).toBe(LOCATION_TASK_OPTIONS);
  });

  // 「バッテリー」設定のトグルと端末の省電力モードは、どちらか一方でも有効なら
  // 省電力プロファイルへ切り替わる。
  it.each([
    ['「バッテリー」設定の省電力測位', 'setting'],
    ['端末の省電力モード', 'system'],
  ] as const)('%s が有効なら省電力プロファイルを返す', (_label, kind) => {
    if (kind === 'setting') {
      mockPowerSavingLocationEnabled = true;
    } else {
      mockSystemLowPowerMode = true;
    }

    const { result } = renderHook(() => useLocationProfile());

    expect(result.current.powerSavingEnabled).toBe(true);
    expect(result.current.watchOptions).toBe(
      LOCATION_WATCH_OPTIONS_POWER_SAVING
    );
    expect(result.current.taskOptions).toBe(LOCATION_TASK_OPTIONS_POWER_SAVING);
  });

  // 呼び出し側(useStartBackgroundLocationUpdates)はこの返り値をeffect依存に置く。
  // 再レンダーのたびに参照が変わると、測位タスクの停止→再開が毎回走る。
  it('再レンダーしても同じ参照を返す', () => {
    const { result, rerender } = renderHook(() => useLocationProfile());
    const firstWatch = result.current.watchOptions;
    const firstTask = result.current.taskOptions;

    rerender({});

    expect(result.current.watchOptions).toBe(firstWatch);
    expect(result.current.taskOptions).toBe(firstTask);
  });
});
