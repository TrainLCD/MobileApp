import { render } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import {
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from '~/utils/dialogPresentation';
import { createStation } from '~/utils/test/factories';
import navigationState from '../store/atoms/navigation';
import stationState, { stationAtom } from '../store/atoms/station';
import {
  type UseInitialNearbyStationResult,
  useInitialNearbyStation,
} from './useInitialNearbyStation';

jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
  useSetAtom: jest.fn(),
}));

jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: jest.fn().mockResolvedValue(false),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: { Highest: 6, Balanced: 3 },
}));

jest.mock('./useFetchNearbyStation', () => ({
  useFetchNearbyStation: jest.fn().mockReturnValue({
    stations: [],
    fetchByCoords: jest
      .fn()
      .mockResolvedValue({ data: { stationsNearby: [] } }),
    isLoading: false,
    error: null,
  }),
}));

jest.mock('./useFetchCurrentLocationOnce', () => ({
  useFetchCurrentLocationOnce: jest.fn().mockReturnValue({
    fetchCurrentLocation: jest.fn(),
  }),
}));

jest.mock('../translation', () => ({
  translate: jest.fn((key: string) => key),
  isJapanese: true,
}));

type HookResult = UseInitialNearbyStationResult | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useInitialNearbyStation());
  return null;
};

describe('useInitialNearbyStation', () => {
  const mockSetStationState = jest.fn();
  const mockSetNavigationState = jest.fn();
  const mockUseAtomValue = useAtomValue as unknown as jest.Mock;
  const mockUseSetAtom = useSetAtom as unknown as jest.Mock;

  beforeEach(() => {
    // 初回起動ダイアログが他のテストへ漏れないよう、既定では初回起動済みにする
    storage.set(STORAGE_KEYS.FIRST_LAUNCH_PASSED, 'true');

    mockUseSetAtom.mockImplementation((atom) => {
      if (atom === stationState) {
        return mockSetStationState;
      }
      if (atom === navigationState) {
        return mockSetNavigationState;
      }
      return jest.fn();
    });

    // stationAtom / locationAtom
    mockUseAtomValue.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetDialogPresentationForTests();
  });

  it('station が null のときは nearbyStationLoading を返す', () => {
    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.station).toBeNull();
    expect(hookRef.current?.nearbyStationLoading).toBe(false);
  });

  it('stationFromAtom があればそれを返す', () => {
    const existingStation = createStation(1);
    mockUseAtomValue.mockImplementation((atom) =>
      atom === stationAtom ? existingStation : null
    );

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.station).toBe(existingStation);
  });

  it('バックグラウンド位置更新を停止する', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(
      true
    );

    render(<HookBridge onReady={() => {}} />);

    await new Promise((r) => setTimeout(r, 0));
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
  });

  it('初回起動時にダイアログを表示する', async () => {
    storage.remove(STORAGE_KEYS.FIRST_LAUNCH_PASSED);

    render(<HookBridge onReady={() => {}} />);

    await new Promise((r) => setTimeout(r, 0));
    expect(getDialogPresentationSnapshot().request).toMatchObject({
      title: 'notice',
      message: 'firstAlertText',
      buttons: expect.any(Array),
    });
  });
});
