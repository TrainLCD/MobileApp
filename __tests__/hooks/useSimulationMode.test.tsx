import { renderHook, act } from '@testing-library/react-native';
import { useSimulationMode } from '~/hooks/useSimulationMode';
import * as Recoil from 'recoil';
import * as currentLineHook from '~/hooks/useCurrentLine';
import * as nextStationHook from '~/hooks/useNextStation';
import { useLocationStore } from '~/hooks/useLocationStore';

jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: {
    setState: jest.fn(),
  },
}));

jest.mock('~/hooks/useCurrentLine', () => ({
  __esModule: true,
  useCurrentLine: jest.fn(() => ({ lineType: 0 })),
}));

jest.mock('~/hooks/useNextStation', () => ({
  useNextStation: jest.fn(),
}));

describe('useSimulationMode', () => {
  const mockStation = {
    groupId: 1,
    latitude: 35.0,
    longitude: 139.0,
  };

  const mockNextStation = {
    groupId: 2,
    latitude: 35.001,
    longitude: 139.001,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    jest.spyOn(Recoil, 'useRecoilValue').mockReturnValue({
      stations: [mockStation, mockNextStation],
      selectedDirection: 'INBOUND',
      station: mockStation,
    });

    jest.spyOn(currentLineHook, 'useCurrentLine').mockReturnValue({
      lineType: 0,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } as any);

    jest
      .spyOn(nextStationHook, 'useNextStation')
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      .mockReturnValue(mockNextStation as any);
  });

  it('sets initial location when enabled is true', () => {
    renderHook(() => useSimulationMode(true));
    expect(useLocationStore.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        coords: expect.objectContaining({
          latitude: mockStation.latitude,
          longitude: mockStation.longitude,
        }),
      })
    );
  });

  it('updates location every second based on speed profile', () => {
    renderHook(() => useSimulationMode(true));

    // simulate 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // 1 initial + 3 updates
    expect(useLocationStore.setState).toHaveBeenCalledTimes(4);
  });

  it('does not crash if station is null', () => {
    jest.spyOn(Recoil, 'useRecoilValue').mockReturnValueOnce({
      stations: [],
      selectedDirection: 'INBOUND',
      station: null,
    });

    expect(() => renderHook(() => useSimulationMode(true))).not.toThrow();
    expect(useLocationStore.setState).not.toHaveBeenCalled();
  });
});
