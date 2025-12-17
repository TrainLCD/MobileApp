import { initialNavigationState } from './navigation';

describe('navigationState', () => {
  it('initialNavigationStateにpendingWantedDestinationが含まれていない', () => {
    expect(initialNavigationState).not.toHaveProperty(
      'pendingWantedDestination'
    );
  });

  it('initialNavigationStateが期待される型に一致する', () => {
    expect(initialNavigationState).toHaveProperty('headerState');
    expect(initialNavigationState).toHaveProperty('leftStations');
    expect(initialNavigationState).toHaveProperty('trainType');
    expect(initialNavigationState).toHaveProperty('autoModeEnabled');
    expect(initialNavigationState).toHaveProperty('stationForHeader');
    expect(initialNavigationState).toHaveProperty('fetchedTrainTypes');
    expect(initialNavigationState).toHaveProperty('firstStop');
    expect(initialNavigationState).toHaveProperty('presetsFetched');
    expect(initialNavigationState).toHaveProperty('presetRoutes');
  });

  it('initialNavigationStateの各プロパティが正しい初期値を持つ', () => {
    expect(Array.isArray(initialNavigationState.leftStations)).toBe(true);
    expect(initialNavigationState.trainType).toBeNull();
    expect(initialNavigationState.stationForHeader).toBeNull();
    expect(Array.isArray(initialNavigationState.fetchedTrainTypes)).toBe(true);
    expect(typeof initialNavigationState.autoModeEnabled).toBe('boolean');
    expect(typeof initialNavigationState.firstStop).toBe('boolean');
    expect(typeof initialNavigationState.presetsFetched).toBe('boolean');
    expect(Array.isArray(initialNavigationState.presetRoutes)).toBe(true);
  });

  it('leftStationsが空配列で初期化される', () => {
    expect(initialNavigationState.leftStations).toEqual([]);
  });

  it('fetchedTrainTypesが空配列で初期化される', () => {
    expect(initialNavigationState.fetchedTrainTypes).toEqual([]);
  });

  it('presetRoutesが空配列で初期化される', () => {
    expect(initialNavigationState.presetRoutes).toEqual([]);
  });

  it('firstStopがtrueで初期化される', () => {
    expect(initialNavigationState.firstStop).toBe(true);
  });

  it('presetsFetchedがfalseで初期化される', () => {
    expect(initialNavigationState.presetsFetched).toBe(false);
  });
});
