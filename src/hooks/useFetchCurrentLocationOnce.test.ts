import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';

jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 'Balanced' },
}));

jest.mock('jotai', () => {
  const actual = jest.requireActual('jotai');
  return {
    ...actual,
    useAtomValue: jest.fn(),
  };
});

import * as Location from 'expo-location';
import { useFetchCurrentLocationOnce } from './useFetchCurrentLocationOnce';

const mockUseAtomValue = useAtomValue as jest.MockedFunction<
  typeof useAtomValue
>;

describe('useFetchCurrentLocationOnce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('useLastKnown=true かつ lastKnown がある場合はそれを返し、APIを呼ばない', async () => {
    const lastKnown = {
      coords: { latitude: 35.0, longitude: 139.0 },
      timestamp: 1,
    } as unknown as Location.LocationObject;
    mockUseAtomValue.mockReturnValue(lastKnown);

    const { result } = renderHook(() => useFetchCurrentLocationOnce());

    await expect(result.current.fetchCurrentLocation(true)).resolves.toBe(
      lastKnown
    );
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('lastKnown が無い場合は getCurrentPositionAsync を呼び結果を返す', async () => {
    mockUseAtomValue.mockReturnValue(null);
    const pos = {
      coords: { latitude: 35.681236, longitude: 139.767125 },
      timestamp: 1730000000000,
    } as unknown as Location.LocationObject;
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(pos);

    const { result } = renderHook(() => useFetchCurrentLocationOnce());

    let resolved: Location.LocationObject | undefined;
    await act(async () => {
      resolved = await result.current.fetchCurrentLocation(false);
    });

    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
    expect(resolved).toBe(pos);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('getCurrentPositionAsync が失敗したら error を設定して reject する', async () => {
    mockUseAtomValue.mockReturnValue(null);
    const err = new Error('denied');
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(() => useFetchCurrentLocationOnce());

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.fetchCurrentLocation();
      } catch (e) {
        caught = e;
      }
    });
    expect((caught as Error).message).toBe('denied');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
  });
});
