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

  const setAtomValues = ({ telemetryEnabled = true } = {}) => {
    mockUseAtomValue.mockReset();
    mockUseAtomValue.mockImplementationOnce(() => ({ telemetryEnabled }));
  };

  beforeEach(() => {
    mockIsTelemetryEnabledByBuild = true;
    setAtomValues();
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  it('ビルド・ユーザー設定が有効なら true を返す', () => {
    const { result } = renderHook(() => useTelemetryEnabled());

    expect(result.current).toBe(true);
  });
});
