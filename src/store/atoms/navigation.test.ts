import { createStore } from 'jotai';
import navigationState, {
  enabledLanguagesAtom,
  initialNavigationState,
  leftStationsAtom,
} from './navigation';

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

describe('navigationState (互換ファサード)', () => {
  it('フィールドatomの値を集約して返す', () => {
    const store = createStore();
    const { leftStations, enabledLanguages } = store.get(navigationState);
    expect(store.get(leftStationsAtom)).toBe(leftStations);
    expect(store.get(enabledLanguagesAtom)).toBe(enabledLanguages);
  });

  it('headerStateのローテーションでは無関係なフィールドの購読者に通知しない', () => {
    const store = createStore();
    const listener = jest.fn();
    const unsub = store.sub(leftStationsAtom, listener);

    store.set(navigationState, {
      ...store.get(navigationState),
      headerState: 'NEXT',
    });
    expect(listener).not.toHaveBeenCalled();

    store.set(navigationState, {
      ...store.get(navigationState),
      leftStations: [],
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
  });
});
