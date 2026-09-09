import { act, renderHook } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import { useWarningInfo } from '~/hooks/useWarningInfo';
import { storage } from '~/lib/storage';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: { toString: () => 'stationState' },
  selectedBoundAtom: { toString: () => 'selectedBoundAtom' },
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: { toString: () => 'navigationState' },
  autoModeEnabledAtom: { toString: () => 'autoModeEnabledAtom' },
  leftStationsAtom: { toString: () => 'leftStationsAtom' },
}));

jest.mock('~/store/atoms/tuning', () => ({
  __esModule: true,
  default: { toString: () => 'tuningState' },
}));

jest.mock('~/translation', () => ({
  __esModule: true,
  isJapanese: true,
  translate: (key: string) => key,
}));

jest.mock('react-native-app-clip', () => ({
  isClip: () => false,
}));

const mockUseForegroundPermissions = jest.fn(() => ({ granted: false }));

jest.mock('expo-location', () => ({
  ...jest.requireActual('expo-location'),
  useForegroundPermissions: () => [mockUseForegroundPermissions()],
}));

const mockUseConnectivity = jest.fn(() => true);
const mockUseBadAccuracy = jest.fn(() => false);
const mockUseLocationPermissionsGranted = jest.fn(() => true);

jest.mock('~/hooks/useConnectivity', () => ({
  useConnectivity: () => mockUseConnectivity(),
}));

jest.mock('~/hooks/useBadAccuracy', () => ({
  useBadAccuracy: () => mockUseBadAccuracy(),
}));

jest.mock('~/hooks/useLocationPermissionsGranted', () => ({
  useLocationPermissionsGranted: () => mockUseLocationPermissionsGranted(),
}));

jest.mock('~/hooks/useWrongDirectionDetector', () => ({
  useWrongDirectionDetector: () => ({
    isWrongDirection: false,
    isLoopLineWrongDirection: false,
  }),
}));

const mockedUseAtomValue = useAtomValue as jest.Mock;

type AtomValues = {
  autoModeEnabled: boolean;
  selectedBound: unknown;
  untouchableModeEnabled: boolean;
};

const setAtomValues = ({
  autoModeEnabled,
  selectedBound,
  untouchableModeEnabled,
}: AtomValues) => {
  mockedUseAtomValue.mockImplementation((atom: unknown) => {
    switch (String(atom)) {
      case 'autoModeEnabledAtom':
        return autoModeEnabled;
      case 'selectedBoundAtom':
        return selectedBound;
      case 'leftStationsAtom':
        return [];
      case 'tuningState':
        return { untouchableModeEnabled };
      default:
        return undefined;
    }
  });
};

describe('useWarningInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 長押し案内は表示済み扱いにして、オートモード通知の挙動だけを見る
    storage.set(STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED, 'true');
    mockUseConnectivity.mockReturnValue(true);
    mockUseBadAccuracy.mockReturnValue(false);
    mockUseLocationPermissionsGranted.mockReturnValue(true);
    mockUseForegroundPermissions.mockReturnValue({ granted: false });
    setAtomValues({
      autoModeEnabled: true,
      selectedBound: { id: 1 },
      untouchableModeEnabled: false,
    });
  });

  it('オートモード中は通知パネルを表示する', () => {
    const { result } = renderHook(() => useWarningInfo());
    expect(result.current.warningInfo?.text).toBe('autoModeInProgress');
  });

  it('タップで閉じたオートモード通知は再表示されない', () => {
    const { result } = renderHook(() => useWarningInfo());

    act(() => {
      result.current.clearWarningInfo();
    });

    expect(result.current.warningInfo).toBeNull();
  });

  it('閉じたオートモード通知はオフライン検知を挟んでも復活しない', () => {
    const { result, rerender } = renderHook(() => useWarningInfo());

    act(() => {
      result.current.clearWarningInfo();
    });
    expect(result.current.warningInfo).toBeNull();

    // 通信が切れると、オートモード通知ではなくオフライン警告だけが出る
    mockUseConnectivity.mockReturnValue(false);
    rerender({});
    expect(result.current.warningInfo?.text).toBe('offlineWarningText');

    // 通信が復帰してもオートモード通知は閉じたまま
    mockUseConnectivity.mockReturnValue(true);
    rerender({});
    expect(result.current.warningInfo).toBeNull();
  });

  it('オフライン警告を閉じても、再度オフラインになれば改めて表示される', () => {
    setAtomValues({
      autoModeEnabled: false,
      selectedBound: { id: 1 },
      untouchableModeEnabled: false,
    });
    mockUseConnectivity.mockReturnValue(false);
    const { result, rerender } = renderHook(() => useWarningInfo());
    expect(result.current.warningInfo?.text).toBe('offlineWarningText');

    act(() => {
      result.current.clearWarningInfo();
    });
    expect(result.current.warningInfo).toBeNull();

    mockUseConnectivity.mockReturnValue(true);
    rerender({});
    mockUseConnectivity.mockReturnValue(false);
    rerender({});
    expect(result.current.warningInfo?.text).toBe('offlineWarningText');
  });

  it('オートモードを切り直すとオートモード通知が改めて表示される', () => {
    const { result, rerender } = renderHook(() => useWarningInfo());

    act(() => {
      result.current.clearWarningInfo();
    });
    expect(result.current.warningInfo).toBeNull();

    setAtomValues({
      autoModeEnabled: false,
      selectedBound: { id: 1 },
      untouchableModeEnabled: false,
    });
    rerender({});

    setAtomValues({
      autoModeEnabled: true,
      selectedBound: { id: 1 },
      untouchableModeEnabled: false,
    });
    rerender({});

    expect(result.current.warningInfo?.text).toBe('autoModeInProgress');
  });

  describe('長押し案内が未読の場合', () => {
    beforeEach(() => {
      storage.remove(STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED);
    });

    it('長押し案内を閉じたときだけ既読状態が永続化される', () => {
      const { result } = renderHook(() => useWarningInfo());
      expect(result.current.warningInfo?.text).toBe('longPressNotice');

      act(() => {
        result.current.clearWarningInfo();
      });

      expect(storage.getString(STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED)).toBe(
        'true'
      );
      // 長押し案内を閉じると、次点のオートモード通知へ切り替わる
      expect(result.current.warningInfo?.text).toBe('autoModeInProgress');
    });

    it('権限警告を閉じても長押し案内は既読にならない', () => {
      // 位置情報の常時許可が無い状態にして、長押し案内より上位の警告を出す
      mockUseForegroundPermissions.mockReturnValue({ granted: true });
      mockUseLocationPermissionsGranted.mockReturnValue(false);

      const { result } = renderHook(() => useWarningInfo());
      expect(result.current.warningInfo?.text).toBe(
        'alwaysPermissionNotGrantedPanelText'
      );

      act(() => {
        result.current.clearWarningInfo();
      });

      expect(
        storage.getString(STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED)
      ).toBeUndefined();
      expect(result.current.warningInfo?.text).toBe('longPressNotice');
    });
  });

  it('オートモード通知を閉じても、条件が成立した別の警告は表示される', () => {
    const { result, rerender } = renderHook(() => useWarningInfo());

    act(() => {
      result.current.clearWarningInfo();
    });

    mockUseBadAccuracy.mockReturnValue(true);
    rerender({});

    expect(result.current.warningInfo?.text).toBe('badAccuracy');
    expect(result.current.warningInfo?.level).toBe('URGENT');
  });
});
