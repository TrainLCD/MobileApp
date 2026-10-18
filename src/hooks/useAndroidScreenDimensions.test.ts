import { act, renderHook } from '@testing-library/react-native';
import { Dimensions, Platform, type ScaledSize } from 'react-native';
import { getRunningLayout } from '../utils/runningLayout';
import { useAndroidScreenDimensions } from './useAndroidScreenDimensions';

const size = (width: number, height: number): ScaledSize => ({
  width,
  height,
  scale: 1,
  fontScale: 1,
});

afterEach(() => jest.restoreAllMocks());

it('updates layout for screen-only transitions and removes its subscription', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const window = size(360, 280);
  jest.spyOn(Dimensions, 'get').mockReturnValue(size(360, 800));
  let onChange: (event: { window: ScaledSize; screen: ScaledSize }) => void;
  const remove = jest.fn();
  jest
    .spyOn(Dimensions, 'addEventListener')
    .mockImplementation((_, listener) => {
      onChange = (event) => listener(event);
      return { remove };
    });
  const { result, unmount } = renderHook(() => {
    const screen = useAndroidScreenDimensions();
    return getRunningLayout(window.width, window.height, false, screen);
  });
  expect(result.current).toBe('landscape');
  act(() => onChange({ window, screen: size(360, 374) }));
  expect(result.current).toBe('square');
  act(() => onChange({ window, screen: size(360, 800) }));
  expect(result.current).toBe('landscape');
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('does not subscribe to screen dimensions on iOS', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const subscribe = jest.spyOn(Dimensions, 'addEventListener');
  const { result } = renderHook(() => useAndroidScreenDimensions());
  expect(result.current).toBeUndefined();
  expect(subscribe).not.toHaveBeenCalled();
});
