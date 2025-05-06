import { renderHook, act } from '@testing-library/react-native';
import { useSimulationMode } from '~/hooks/useSimulationMode';
import * as Recoil from 'recoil';
import * as currentLineHook from '~/hooks/useCurrentLine';
import { useLocationStore } from '~/hooks/useLocationStore';
import { TrainTypeKind } from '../../gen/proto/stationapi_pb';

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

jest.mock('~/hooks/useCurrentTrainType', () => ({
  __esModule: true,
  default: jest.fn(),
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

  const testTrainKind = (kind: TrainTypeKind) => {
    require('~/hooks/useCurrentTrainType').default.mockReturnValue({ kind });

    renderHook(() => useSimulationMode(true));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(useLocationStore.setState).toHaveBeenCalled();
  };

  it('handles LimitedExpress correctly', () => {
    testTrainKind(TrainTypeKind.LimitedExpress);
  });

  it('handles Default train correctly', () => {
    testTrainKind(TrainTypeKind.Default);
  });

  it('handles Rapid train correctly', () => {
    testTrainKind(TrainTypeKind.Rapid);
  });

  it('handles empty kind fallback correctly', () => {
    require('~/hooks/useCurrentTrainType').default.mockReturnValue({
      kind: undefined,
    });

    renderHook(() => useSimulationMode(true));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(useLocationStore.setState).toHaveBeenCalled();
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

    expect(useLocationStore.setState).not.toHaveBeenCalled();
  });

  it('handles null station gracefully', () => {
    jest.spyOn(Recoil, 'useRecoilValue').mockReturnValue({
      stations: [],
      selectedDirection: 'INBOUND',
    });

    require('~/hooks/useInRadiusStation').useInRadiusStation.mockReturnValue(
      null
    );

    renderHook(() => useSimulationMode(true));

    expect(useLocationStore.setState).not.toHaveBeenCalled();
  });

  it('resets to first station if nextStation is null', () => {
    require('~/hooks/useNextStation').useNextStation.mockReturnValue(null);

    renderHook(() => useSimulationMode(true));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(useLocationStore.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        coords: expect.objectContaining({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
        }),
      })
    );
  });

  it('skips update if no speed profile exists', () => {
    jest.spyOn(Recoil, 'useRecoilValue').mockReturnValue({
      stations: [],
      selectedDirection: 'INBOUND',
    });

    renderHook(() => useSimulationMode(true));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(useLocationStore.setState).not.toHaveBeenCalled();
  });
});
