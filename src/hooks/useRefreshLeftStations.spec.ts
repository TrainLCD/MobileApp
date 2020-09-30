/* eslint-disable import/no-extraneous-dependencies */
import { useSelector, useDispatch } from 'react-redux';
import { renderHook } from '@testing-library/react-hooks';
import useRefreshLeftStations from './useRefreshLeftStations';
import { refreshLeftStations } from '../store/actions/navigation';
import {
  mockNormalStations,
  normalHeavyRailLineFixture,
} from '../fixtures/normal';
import {
  yamanoteLineFixture,
  mockYamanoteLineStations,
} from '../fixtures/yamanoteLine';
import {
  mockOsakaLoopLineStations,
  osakaLoopLineFixture,
} from '../fixtures/osakaLoopLine';

const mockSelectorValue = {
  station: {
    station: mockNormalStations[8],
    stations: mockNormalStations,
  },
};

const mockSelectorMockYamanoteLineNotEdgeValue = {
  station: {
    station: mockYamanoteLineStations[8],
    stations: mockYamanoteLineStations,
  },
};

const mockSelectorMockYamanoteLineEdgeValue = {
  station: {
    station: mockYamanoteLineStations[0],
    stations: mockYamanoteLineStations,
  },
};

const mockSelectorMockOsakaLoopLineNotEdgeValue = {
  station: {
    station: mockOsakaLoopLineStations[8],
    stations: mockOsakaLoopLineStations,
  },
};

const mockSelectorMockOsakaLoopLineEdgeValue = {
  station: {
    station: mockOsakaLoopLineStations[0],
    stations: mockOsakaLoopLineStations,
  },
};

const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

describe('useRefreshLeftStations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Heavy Line', () => {
    beforeEach(() => {
      mockUseDispatch.mockImplementationOnce(() => mockDispatch);
      mockUseSelector.mockImplementationOnce((callback) =>
        callback(mockSelectorValue)
      );
    });
    it('Inbound', () => {
      renderHook(() =>
        useRefreshLeftStations(normalHeavyRailLineFixture, 'INBOUND')
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations(mockNormalStations.slice(8, 8 * 2))
      );
    });

    it('Outbound', () => {
      renderHook(() =>
        useRefreshLeftStations(normalHeavyRailLineFixture, 'OUTBOUND')
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations(mockNormalStations.slice(1, 9).reverse())
      );
    });
  });

  describe('Yamanote Line(Not Edge)', () => {
    beforeEach(() => {
      mockUseDispatch.mockImplementationOnce(() => mockDispatch);
      mockUseSelector.mockImplementationOnce((callback) =>
        callback(mockSelectorMockYamanoteLineNotEdgeValue)
      );
    });

    it('Inbound', () => {
      renderHook(() => useRefreshLeftStations(yamanoteLineFixture, 'INBOUND'));
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations(mockYamanoteLineStations.slice(1, 9).reverse())
      );
    });

    it('Outbound', () => {
      renderHook(() => useRefreshLeftStations(yamanoteLineFixture, 'OUTBOUND'));
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations(mockYamanoteLineStations.slice(8, 8 * 2))
      );
    });
  });

  describe('Yamanote Line(Edge)', () => {
    beforeEach(() => {
      mockUseDispatch.mockImplementationOnce(() => mockDispatch);
      mockUseSelector.mockImplementationOnce((callback) =>
        callback(mockSelectorMockYamanoteLineEdgeValue)
      );
    });

    it('Inbound', () => {
      renderHook(() => useRefreshLeftStations(yamanoteLineFixture, 'INBOUND'));
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations([
          mockYamanoteLineStations[0],
          ...mockYamanoteLineStations.slice().reverse().slice(0, 6),
        ])
      );
    });

    it('Outbound', () => {
      renderHook(() => useRefreshLeftStations(yamanoteLineFixture, 'OUTBOUND'));
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations(mockYamanoteLineStations.slice(0, 8))
      );
    });
  });

  describe('Osaka Loop Line(Not Edge)', () => {
    beforeEach(() => {
      mockUseDispatch.mockImplementationOnce(() => mockDispatch);
      mockUseSelector.mockImplementationOnce((callback) =>
        callback(mockSelectorMockOsakaLoopLineNotEdgeValue)
      );
    });

    it('Inbound', () => {
      renderHook(() => useRefreshLeftStations(osakaLoopLineFixture, 'INBOUND'));
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations(mockOsakaLoopLineStations.slice(1, 9).reverse())
      );
    });

    it('Outbound', () => {
      renderHook(() =>
        useRefreshLeftStations(osakaLoopLineFixture, 'OUTBOUND')
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations(mockOsakaLoopLineStations.slice(8, 8 * 2))
      );
    });
  });

  describe('Osaka Loop Line(Edge)', () => {
    beforeEach(() => {
      mockUseDispatch.mockImplementationOnce(() => mockDispatch);
      mockUseSelector.mockImplementationOnce((callback) =>
        callback(mockSelectorMockOsakaLoopLineEdgeValue)
      );
    });

    it('Inbound', () => {
      renderHook(() => useRefreshLeftStations(yamanoteLineFixture, 'INBOUND'));
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations([
          mockOsakaLoopLineStations[0],
          ...mockOsakaLoopLineStations.slice().reverse().slice(0, 6),
        ])
      );
    });

    it('Outbound', () => {
      renderHook(() =>
        useRefreshLeftStations(osakaLoopLineFixture, 'OUTBOUND')
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        refreshLeftStations(mockOsakaLoopLineStations.slice(0, 8))
      );
    });
  });
});
