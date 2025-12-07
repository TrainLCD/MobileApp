import { renderHook } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import { useTelemetryEnabled } from './useTelemetryEnabled';

let mockIsTelemetryEnabledByBuild = true;

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('~/utils/telemetryConfig', () => ({
  get isTelemetryEnabledByBuild() {
    return mockIsTelemetryEnabledByBuild;
  },
}));

describe('useTelemetryEnabled', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;

  const setAtomValues = ({
    telemetryEnabled = true,
    autoModeEnabled = false,
  } = {}) => {
    mockUseAtomValue.mockReset();
    mockUseAtomValue.mockImplementationOnce(() => ({ telemetryEnabled }));
    mockUseAtomValue.mockImplementationOnce(() => ({ autoModeEnabled }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTelemetryEnabledByBuild = true;
    setAtomValues();
  });

  it('build フラグで無効化されているときは false を返す', () => {
    mockIsTelemetryEnabledByBuild = false;

    const { result } = renderHook(() => useTelemetryEnabled());

    expect(result.current).toBe(false);
  });

  it('ユーザー設定が無効なら false を返す', () => {
    setAtomValues({ telemetryEnabled: false });

    const { result } = renderHook(() => useTelemetryEnabled());

    expect(result.current).toBe(false);
  });

  it('自動運転モード時は false を返す', () => {
    setAtomValues({ autoModeEnabled: true });

    const { result } = renderHook(() => useTelemetryEnabled());

    expect(result.current).toBe(false);
  });

  it('ビルド・ユーザー設定が有効で自動運転モードでなければ true を返す', () => {
    const { result } = renderHook(() => useTelemetryEnabled());

    expect(result.current).toBe(true);
  });
});
