import { act, renderHook } from '@testing-library/react-native';
import {
  type EmitterSubscription,
  Keyboard,
  type KeyboardEvent,
  type KeyboardEventName,
  Platform,
} from 'react-native';
import { useKeyboardBottomInset } from './useKeyboardBottomInset';

const mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

// jest-expo の既定 Platform.OS は 'ios'。プラットフォーム固有の挙動は
// 明示的に切り替えてから検証する
const originalPlatformOS = Platform.OS;
const setPlatformOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

const listeners = new Map<string, (event: KeyboardEvent) => void>();

const emit = (name: KeyboardEventName, event: Partial<KeyboardEvent>) =>
  act(() => {
    listeners.get(name)?.(event as KeyboardEvent);
  });

const keyboardEvent = (height: number, duration = 0): Partial<KeyboardEvent> =>
  ({
    duration,
    easing: 'keyboard',
    endCoordinates: { height, width: 375, screenX: 0, screenY: 0 },
  }) as Partial<KeyboardEvent>;

const loadHook = (os: typeof Platform.OS) => {
  setPlatformOS(os);
  return renderHook(() => useKeyboardBottomInset());
};

describe('useKeyboardBottomInset', () => {
  beforeEach(() => {
    listeners.clear();
    mockInsets.bottom = 0;
    jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((name, handler): EmitterSubscription => {
        listeners.set(name, handler as (event: KeyboardEvent) => void);
        return {
          remove: () => {
            listeners.delete(name);
          },
        } as EmitterSubscription;
      });
  });

  afterEach(() => {
    setPlatformOS(originalPlatformOS);
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('iOS', () => {
    it('キーボード非表示時は安全領域の下端を返す', () => {
      mockInsets.bottom = 34;
      const { result } = loadHook('ios');

      expect(result.current.value).toBe(34);
      expect(result.current.visible).toBe(false);
    });

    it('will系イベントを購読し、キーボード高さをそのまま余白にする', () => {
      mockInsets.bottom = 34;
      const { result } = loadHook('ios');

      expect(listeners.has('keyboardWillShow')).toBe(true);
      expect(listeners.has('keyboardDidShow')).toBe(false);

      // iOS の endCoordinates.height はホームインジケータ領域を含むため加算しない
      emit('keyboardWillShow', keyboardEvent(336, 250));

      expect(result.current.value).toBe(336);
      expect(result.current.duration).toBe(250);
      expect(result.current.visible).toBe(true);
    });

    // iOS でも duration が 0 で届くことがあり、そのまま使うと追従が瞬間移動になる
    it('duration が 0 で届いた場合はフォールバック値を使う', () => {
      const { result } = loadHook('ios');

      emit('keyboardWillShow', keyboardEvent(336, 0));

      expect(result.current.duration).toBe(250);
    });

    it('キーボードを閉じると安全領域の下端へ戻る', () => {
      mockInsets.bottom = 34;
      const { result } = loadHook('ios');

      emit('keyboardWillShow', keyboardEvent(336, 250));
      emit('keyboardWillHide', keyboardEvent(0, 250));

      expect(result.current.value).toBe(34);
      expect(result.current.visible).toBe(false);
    });
  });

  describe('Android', () => {
    it('did系イベントを購読する', () => {
      loadHook('android');

      expect(listeners.has('keyboardDidShow')).toBe(true);
      expect(listeners.has('keyboardWillShow')).toBe(false);
    });

    // RN は imeInsets.bottom - barInsets.bottom を送るため、エッジトゥエッジで
    // ウィンドウ下端からの重なり量へ戻すにはナビゲーションバー分を足し直す
    it('ナビゲーションバー分を加算した余白を返す', () => {
      mockInsets.bottom = 48;
      const { result } = loadHook('android');

      emit('keyboardDidShow', keyboardEvent(300));

      expect(result.current.value).toBe(348);
      expect(result.current.visible).toBe(true);
    });

    // did 系は IME の遷移後に届きうるため、そこからさらにアニメーションさせると
    // 入力バーが隠れたままの時間が伸びる。即座に確定させる
    it('追従アニメーションを行わない', () => {
      const { result } = loadHook('android');

      emit('keyboardDidShow', keyboardEvent(300));
      expect(result.current.duration).toBe(0);

      emit('keyboardDidHide', keyboardEvent(0));
      expect(result.current.duration).toBe(0);
    });

    it('システムバー非表示時は加算せずキーボード高さのみを返す', () => {
      mockInsets.bottom = 0;
      const { result } = loadHook('android');

      emit('keyboardDidShow', keyboardEvent(300));

      expect(result.current.value).toBe(300);
    });
  });

  it('アンマウント時にリスナを解除する', () => {
    const { unmount } = loadHook('android');

    expect(listeners.size).toBe(2);

    unmount();

    expect(listeners.size).toBe(0);
  });
});
