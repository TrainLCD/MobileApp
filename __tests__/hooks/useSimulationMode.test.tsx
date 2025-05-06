import { renderHook, act } from '@testing-library/react-native';
import { useSimulationMode } from '~/hooks/useSimulationMode';
import * as Recoil from 'recoil';
import * as currentLineHook from '~/hooks/useCurrentLine';
import { useLocationStore } from '~/hooks/useLocationStore';
import { isDevApp } from '~/utils/isDevApp';

jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: {
    setState: jest.fn(),
  },
}));

jest.mock('~/hooks/useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

jest.mock('~/hooks/useInRadiusStation', () => ({
  __esModule: true,
  useInRadiusStation: jest.fn(),
}));

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: true,
}));

describe('useSimulationMode', () => {
  const mockStation = {
    id: 's1',
    groupId: 1,
    latitude: 35.0,
    longitude: 139.0,
  };

  const mockNextStation = {
    id: 's2',
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
    });

    jest.spyOn(currentLineHook, 'useCurrentLine').mockReturnValue({
      lineType: 0,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } as any);

    require('~/hooks/useNextStation').useNextStation.mockReturnValue(
      mockNextStation
    );
    require('~/hooks/useInRadiusStation').useInRadiusStation.mockReturnValue(
      mockStation
    );
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

  it('updates location over time', () => {
    renderHook(() => useSimulationMode(true));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(useLocationStore.setState).toHaveBeenCalled();
  });

  it('does not run simulation if disabled', () => {
    renderHook(() => useSimulationMode(false));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // 初期設定以外に呼ばれていないはず
    expect(useLocationStore.setState).not.toHaveBeenCalled();
  });
});
