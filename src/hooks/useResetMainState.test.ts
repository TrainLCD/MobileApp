import { act, renderHook } from '@testing-library/react-native';
import { isJapanese } from '../translation';
import { resetFirstSpeech } from '../utils/tts/backgroundTTSTrigger';
import { useResetMainState } from './useResetMainState';

jest.mock('../utils/tts/backgroundTTSTrigger', () => ({
  resetFirstSpeech: jest.fn(),
}));

const mockSetNavigationState = jest.fn();
const mockSetStationState = jest.fn();

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useSetAtom: jest.fn((atom) => {
    // atomの参照で判別（navigationStateかstationStateか）
    if (atom === require('../store/atoms/navigation').default) {
      return mockSetNavigationState;
    }
    if (atom === require('../store/atoms/station').default) {
      return mockSetStationState;
    }
    return jest.fn();
  }),
}));

jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  default: { _name: 'navigationState' },
}));

jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: { _name: 'stationState' },
}));

const mockResetFirstSpeech = resetFirstSpeech as jest.Mock;

describe('useResetMainState', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return a reset function', () => {
    const { result } = renderHook(() => useResetMainState());

    expect(typeof result.current).toBe('function');
  });

  test('should call setNavigationState with correct values when reset is called', () => {
    const { result } = renderHook(() => useResetMainState());

    act(() => {
      result.current();
    });

    expect(mockSetNavigationState).toHaveBeenCalledTimes(1);
    expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

    // setNavigationStateに渡された関数をテスト
    const updaterFn = mockSetNavigationState.mock.calls[0][0];
    const prevState = {
      headerState: 'NEXT',
      bottomState: 'TRANSFER',
      leftStations: [1, 2, 3],
    };
    const newState = updaterFn(prevState);

    expect(newState).toEqual({
      ...prevState,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
      leftStations: [],
    });
  });

  test('should call setStationState with correct values when reset is called', () => {
    const { result } = renderHook(() => useResetMainState());

    act(() => {
      result.current();
    });

    expect(mockSetStationState).toHaveBeenCalledTimes(1);
    expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));

    // setStationStateに渡された関数をテスト
    const updaterFn = mockSetStationState.mock.calls[0][0];
    const prevState = {
      selectedDirection: 'INBOUND',
      selectedBound: { id: 1 },
      arrived: false,
      approaching: true,
      stations: [],
    };
    const newState = updaterFn(prevState);

    expect(newState).toEqual({
      ...prevState,
      selectedDirection: null,
      selectedBound: null,
      arrived: true,
      approaching: false,
    });
  });

  test('should call resetFirstSpeech when reset is called', () => {
    const { result } = renderHook(() => useResetMainState());

    act(() => {
      result.current();
    });

    expect(mockResetFirstSpeech).toHaveBeenCalledTimes(1);
  });

  test('should return the same reset function reference on re-renders', () => {
    const { result, rerender } = renderHook(() => useResetMainState());

    const firstReset = result.current;
    rerender({});
    const secondReset = result.current;

    expect(firstReset).toBe(secondReset);
  });
});
