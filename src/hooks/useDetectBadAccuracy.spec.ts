// eslint-disable-next-line import/no-extraneous-dependencies
import { renderHook } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import useDetectBadAccuracy from './useDetectBadAccuracy';
import { LineType } from '../models/StationAPI';
import { updateBadAccuracy } from '../store/actions/location';

const mockSelectorMockValue = {
  location: {
    location: {
      coords: {
        accuracy: 0,
      },
    },
  },
  line: {
    selectedLine: {
      lineType: LineType.Normal,
    },
  },
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

describe('useWatchLocation', () => {
  beforeEach(() => {
    mockUseDispatch.mockImplementation(() => mockDispatch);
    mockUseSelector.mockImplementation((callback) =>
      callback(mockSelectorMockValue)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be changed badAccuracy state to false', () => {
    renderHook(() => useDetectBadAccuracy());

    expect(mockDispatch).toHaveBeenCalledWith(updateBadAccuracy(false));
  });
  it('should be changed badAccuracy state to true', () => {
    const badAccuracyMockValue = {
      ...mockSelectorMockValue,
      location: {
        location: {
          coords: {
            accuracy: 1919,
          },
        },
      },
    };

    mockUseSelector.mockImplementation((callback) =>
      callback(badAccuracyMockValue)
    );

    renderHook(() => useDetectBadAccuracy());

    expect(mockDispatch).toHaveBeenCalledWith(updateBadAccuracy(true));
  });
});
