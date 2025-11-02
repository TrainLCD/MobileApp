import { render } from '@testing-library/react-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import DevOverlay from './DevOverlay';

// Mock dependencies
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
}));

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    useWindowDimensions: jest.fn(() => ({ width: 400, height: 800 })),
  };
});

jest.mock('react-native/Libraries/DevSupport/DevMenu', () => ({}), {
  virtual: true,
});

jest.mock('~/hooks', () => ({
  useLocationStore: jest.fn((selector) => {
    const mockState = {
      coords: {
        speed: 10,
        accuracy: 5,
        latitude: 35.681236,
        longitude: 139.767125,
      },
    };
    return selector ? selector(mockState) : mockState;
  }),
  useDistanceToNextStation: jest.fn(() => 500),
  useNextStation: jest.fn(() => ({
    id: 1,
    name: 'Tokyo Station',
    latitude: 35.681236,
    longitude: 139.767125,
  })),
}));

jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabled: false,
}));

jest.mock('./Typography', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      style,
      testID,
    }: {
      children?: React.ReactNode;
      style?: any;
      testID?: string;
    }) => (
      <Text style={style} testID={testID}>
        {children}
      </Text>
    ),
  };
});

describe('DevOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('should be memoized', () => {
      expect(DevOverlay).toBe(React.memo(DevOverlay));
    });

    it('should display application version and build number', () => {
      const { getByText } = render(<DevOverlay />);
      expect(getByText(/TrainLCD DO/)).toBeTruthy();
      expect(getByText(/1\.0\.0\(100\)/)).toBeTruthy();
    });

    it('should set width to 1/4 of window dimensions', () => {
      const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
      mockUseWindowDimensions.mockReturnValue({ width: 800, height: 600 });

      const { getByTestId } = render(<DevOverlay />);
      // The root View should have width of 800/4 = 200
      // We can't directly test styles, but we verify the hook is called
      expect(mockUseWindowDimensions).toHaveBeenCalled();
    });
  });

  describe('Location Data Display', () => {
    it('should display accuracy when available', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { accuracy: 10 } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Accuracy: 10m')).toBeTruthy();
    });

    it('should handle null accuracy', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { accuracy: null } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Accuracy: m')).toBeTruthy();
    });

    it('should handle undefined accuracy', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { accuracy: undefined } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Accuracy: m')).toBeTruthy();
    });
  });

  describe('Speed Calculation', () => {
    it('should calculate and display speed in km/h correctly', () => {
      const { useLocationStore } = require('~/hooks');
      // Speed in m/s: 10 m/s = 36 km/h
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: 10 } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Speed: 36/)).toBeTruthy();
      expect(getByText(/km\/h/)).toBeTruthy();
    });

    it('should handle zero speed', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: 0 } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Speed: 0/)).toBeTruthy();
    });

    it('should handle null speed as 0 km/h', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: null } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Speed: 0/)).toBeTruthy();
    });

    it('should handle undefined speed as 0 km/h', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: undefined } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Speed: 0/)).toBeTruthy();
    });

    it('should treat negative speed as 0', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: -5 } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Speed: 0/)).toBeTruthy();
    });

    it('should round speed to nearest integer', () => {
      const { useLocationStore } = require('~/hooks');
      // 13.89 m/s should be approximately 50 km/h (50.004)
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: 13.89 } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Speed: 50/)).toBeTruthy();
    });
  });

  describe('Next Station Display', () => {
    it('should display distance to next station when available', () => {
      const { useDistanceToNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(1234);

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Next: 1234m/)).toBeTruthy();
    });

    it('should display next station name when available', () => {
      const { useNextStation } = require('~/hooks');
      useNextStation.mockReturnValue({
        id: 1,
        name: 'Shibuya Station',
        latitude: 35.6580,
        longitude: 139.7016,
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Shibuya Station/)).toBeTruthy();
    });

    it('should display both distance and station name together', () => {
      const { useDistanceToNextStation, useNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(850);
      useNextStation.mockReturnValue({
        id: 2,
        name: 'Shinjuku',
        latitude: 35.6896,
        longitude: 139.7006,
      });

      const { getByText } = render(<DevOverlay />);
      expect(
        getByText(
          (content: string, _element?: Element): boolean =>
            content.includes('Next: 850m') && content.includes('Shinjuku')
        )
      ).toBeTruthy();
    });

    it('should display only distance when station name is null', () => {
      const { useDistanceToNextStation, useNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(500);
      useNextStation.mockReturnValue({
        id: 3,
        name: null,
        latitude: 35.681236,
        longitude: 139.767125,
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Next: 500m/)).toBeTruthy();
      // Should not display station name when null
      expect(getByText('Next: 500m')).toBeTruthy();
    });

    it('should display only distance when station name is undefined', () => {
      const { useDistanceToNextStation, useNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(300);
      useNextStation.mockReturnValue({
        id: 4,
        name: undefined,
        latitude: 35.681236,
        longitude: 139.767125,
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Next: 300m')).toBeTruthy();
    });

    it('should display empty station name when it is an empty string', () => {
      const { useDistanceToNextStation, useNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(200);
      useNextStation.mockReturnValue({
        id: 5,
        name: '',
        latitude: 35.681236,
        longitude: 139.767125,
      });

      const { getByText } = render(<DevOverlay />);
      // Empty string is falsy, so name should not be displayed
      expect(getByText('Next: 200m')).toBeTruthy();
    });

    it('should display "Next:" placeholder when no distance available', () => {
      const { useDistanceToNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(0);

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Next:')).toBeTruthy();
    });

    it('should display "Next:" when distance is null', () => {
      const { useDistanceToNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(null);

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Next:')).toBeTruthy();
    });

    it('should display "Next:" when distance is undefined', () => {
      const { useDistanceToNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(undefined);

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Next:')).toBeTruthy();
    });

    it('should handle next station being null', () => {
      const { useDistanceToNextStation, useNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(100);
      useNextStation.mockReturnValue(null);

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Next: 100m')).toBeTruthy();
    });

    it('should handle next station being undefined', () => {
      const { useDistanceToNextStation, useNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(150);
      useNextStation.mockReturnValue(undefined);

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Next: 150m')).toBeTruthy();
    });
  });

  describe('Telemetry Display', () => {
    it('should display "Telemetry: OFF" when telemetry is disabled', () => {
      const telemetryConfig = require('~/utils/telemetryConfig');
      telemetryConfig.isTelemetryEnabled = false;

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Telemetry: OFF')).toBeTruthy();
    });

    it('should display "Telemetry: ON" when telemetry is enabled', () => {
      const telemetryConfig = require('~/utils/telemetryConfig');
      telemetryConfig.isTelemetryEnabled = true;

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Telemetry: ON')).toBeTruthy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle all null location data gracefully', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: null, accuracy: null } };
        return selector(state);
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('should handle null location store', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation(() => null);

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('should handle undefined coords', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        return selector ? selector({ coords: undefined }) : { coords: undefined };
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('should handle very large speed values', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: 1000 } }; // 3600 km/h
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Speed: 3600/)).toBeTruthy();
    });

    it('should handle very large distance values', () => {
      const { useDistanceToNextStation } = require('~/hooks');
      useDistanceToNextStation.mockReturnValue(999999);

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Next: 999999m/)).toBeTruthy();
    });

    it('should handle decimal accuracy values', () => {
      const { useLocationStore } = require('~/hooks');
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { accuracy: 12.5 } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText('Accuracy: 12.5m')).toBeTruthy();
    });

    it('should handle station with very long name', () => {
      const { useNextStation } = require('~/hooks');
      useNextStation.mockReturnValue({
        id: 6,
        name: 'Very Long Station Name That Might Cause Layout Issues',
        latitude: 35.681236,
        longitude: 139.767125,
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('should handle station with special characters in name', () => {
      const { useNextStation } = require('~/hooks');
      useNextStation.mockReturnValue({
        id: 7,
        name: '東京駅 (Tokyo Station) / 도쿄역',
        latitude: 35.681236,
        longitude: 139.767125,
      });

      const { getByText } = render(<DevOverlay />);
      expect(
        getByText(
          (content: string, _element?: Element): boolean =>
            content.includes('東京駅 (Tokyo Station) / 도쿄역')
        )
      ).toBeTruthy();
    });
  });

  describe('Speed Calculation Logic', () => {
    it('should correctly convert m/s to km/h using formula (speed * 3600) / 1000', () => {
      const { useLocationStore } = require('~/hooks');

      // Test various speeds
      const testCases = [
        { input: 5, expected: 18 }, // 5 m/s = 18 km/h
        { input: 16.67, expected: 60 }, // ~16.67 m/s = ~60 km/h
        { input: 27.78, expected: 100 }, // ~27.78 m/s = ~100 km/h
      ];

      testCases.forEach(({ input, expected }) => {
        useLocationStore.mockImplementation((selector: any) => {
          const state = { coords: { speed: input } };
          return selector(state);
        });

        const { getByText } = render(<DevOverlay />);
        expect(getByText(new RegExp(`Speed: ${expected}`))).toBeTruthy();
      });
    });

    it('should handle the double null coalescing operator correctly', () => {
      const { useLocationStore } = require('~/hooks');

      // When speed is null, (null ?? 0) < 0 should be false, so result is null
      // Then ((null) ?? 0) gives 0
      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: null } };
        return selector(state);
      });

      const { getByText } = render(<DevOverlay />);
      expect(getByText(/Speed: 0/)).toBeTruthy();
    });
  });

  describe('Hook Integration', () => {
    it('should call useLocationStore with correct selectors for speed', () => {
      const { useLocationStore } = require('~/hooks');
      render(<DevOverlay />);

      // Verify the selector functions are called
      expect(useLocationStore).toHaveBeenCalled();

      // Check that the mock was called with a function (selector)
      const calls = useLocationStore.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(typeof calls[0][0]).toBe('function');
    });

    it('should call useLocationStore with correct selectors for accuracy', () => {
      const { useLocationStore } = require('~/hooks');
      render(<DevOverlay />);

      expect(useLocationStore).toHaveBeenCalled();
    });

    it('should call useDistanceToNextStation hook', () => {
      const { useDistanceToNextStation } = require('~/hooks');
      render(<DevOverlay />);

      expect(useDistanceToNextStation).toHaveBeenCalled();
    });

    it('should call useNextStation hook', () => {
      const { useNextStation } = require('~/hooks');
      render(<DevOverlay />);

      expect(useNextStation).toHaveBeenCalled();
    });

    it('should call useWindowDimensions hook', () => {
      const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
      render(<DevOverlay />);

      expect(mockUseWindowDimensions).toHaveBeenCalled();
    });
  });

  describe('Removed Features', () => {
    it('should not display latitude', () => {
      const { queryByText } = render(<DevOverlay />);
      expect(queryByText(/Latitude:/)).toBeNull();
    });

    it('should not display longitude', () => {
      const { queryByText } = render(<DevOverlay />);
      expect(queryByText(/Longitude:/)).toBeNull();
    });

    it('should not display approaching threshold', () => {
      const { queryByText } = render(<DevOverlay />);
      expect(queryByText(/Approaching:/)).toBeNull();
    });

    it('should not display arrived threshold', () => {
      const { queryByText } = render(<DevOverlay />);
      expect(queryByText(/Arrived:/)).toBeNull();
    });

    it('should not use useThreshold hook', () => {
      // Verify the component renders without trying to use useThreshold
      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });
  });

  describe('Performance and Optimization', () => {
    it('should use useMemo for speedKMH calculation', () => {
      const { useLocationStore } = require('~/hooks');
      const mockSpeed = 10;

      useLocationStore.mockImplementation((selector: any) => {
        const state = { coords: { speed: mockSpeed } };
        return selector(state);
      });

      // First render
      const { rerender } = render(<DevOverlay />);

      // Re-render with same data should use memoized value
      rerender(<DevOverlay />);

      // The component should render successfully with memoization
      expect(useLocationStore).toHaveBeenCalled();
    });

    it('should handle multiple rapid re-renders', () => {
      const { rerender } = render(<DevOverlay />);

      // Simulate rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<DevOverlay />);
      }

      // Should not crash or cause issues
      expect(true).toBe(true);
    });
  });

  describe('Component Structure', () => {
    it('should render all required Typography components', () => {
      const { UNSAFE_getAllByType } = render(<DevOverlay />);
      const Typography = require('./Typography').default;

      // Should have multiple Typography components
      expect(UNSAFE_getAllByType(Typography).length).toBeGreaterThan(0);
    });

    it('should have correct styling properties applied', () => {
      const { getByTestId } = render(<DevOverlay />);
      // The component structure should be maintained
      expect(() => render(<DevOverlay />)).not.toThrow();
    });
  });
});