/* eslint-disable import/no-extraneous-dependencies */
import { useDispatch, useSelector } from 'react-redux';
import { renderHook } from '@testing-library/react-hooks';
import {
  updateScoredStations,
  updateArrived,
  updateApproaching,
  refreshNearestStation,
} from '../store/actions/station';
import useRefreshStation from './useRefreshStation';
import {
  yamanoteLineFixture,
  mockYamanoteLineStations,
} from '../fixtures/yamanoteLine';
import calcStationDistances from '../utils/stationDistance';

const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

const osakiStationCoordinates = {
  latitude: 35.619772,
  longitude: 139.728439,
};

const gotandaStationApproachingCoordinates = {
  latitude: 35.6248197,
  longitude: 139.722066,
};

const mockSelectorValue = {
  station: {
    stations: mockYamanoteLineStations,
  },
  line: {
    selectedLine: yamanoteLineFixture,
  },
  location: {
    location: {
      coords: osakiStationCoordinates,
    },
  },
  navigation: {
    leftStations: mockYamanoteLineStations.slice(0, 8),
  },
  notify: {
    targetStationIds: [],
  },
};

describe('useRefreshStation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('arrived', () => {
    beforeEach(() => {
      mockUseDispatch.mockImplementation(() => mockDispatch);
      mockUseSelector.mockImplementation((callback) =>
        callback(mockSelectorValue)
      );
      renderHook(() => useRefreshStation());
    });

    it('should be updated scored stations', () => {
      const expectedScoredStations = calcStationDistances(
        mockYamanoteLineStations,
        osakiStationCoordinates.latitude,
        osakiStationCoordinates.longitude
      );
      expect(mockDispatch.mock.calls[0][0]).toEqual(
        updateScoredStations(expectedScoredStations)
      );
    });

    it('should be arrived', () => {
      expect(mockDispatch.mock.calls[1][0]).toEqual(updateArrived(true));
    });

    it('should not be approached', () => {
      expect(mockDispatch.mock.calls[2][0]).toEqual(updateApproaching(false));
    });

    it('should be updated nearest station', () => {
      expect(mockDispatch.mock.calls[3][0]).toEqual(
        refreshNearestStation({
          ...mockYamanoteLineStations[0],
          distance: 0,
        })
      );
    });
  });

  describe('approaching', () => {
    beforeEach(() => {
      mockUseDispatch.mockImplementation(() => mockDispatch);
      mockUseSelector.mockImplementation((callback) =>
        callback({
          ...mockSelectorValue,
          location: {
            location: {
              coords: gotandaStationApproachingCoordinates,
            },
          },
        })
      );
      renderHook(() => useRefreshStation());
    });

    it('should be updated scored stations', () => {
      const expectedScoredStations = calcStationDistances(
        mockYamanoteLineStations,
        gotandaStationApproachingCoordinates.latitude,
        gotandaStationApproachingCoordinates.longitude
      );
      expect(mockDispatch.mock.calls[0][0]).toEqual(
        updateScoredStations(expectedScoredStations)
      );
    });

    it('should be arrived', () => {
      expect(mockDispatch.mock.calls[1][0]).toEqual(updateArrived(false));
    });

    it('should be approached', () => {
      expect(mockDispatch.mock.calls[2][0]).toEqual(updateApproaching(true));
    });

    it('should not be updated nearest station', () => {
      expect(mockDispatch.mock.calls.length).toBe(3);
    });
  });
});
