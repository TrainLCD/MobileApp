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
import { stationResolveFailedAtom } from '../store/atoms/stationSearchPrompt';
import { useFetchCurrentLocationOnce } from './useFetchCurrentLocationOnce';
import { useFetchNearbyStation } from './useFetchNearbyStation';
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
  const mockSetStationResolveFailed = jest.fn();
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
      if (atom === stationResolveFailedAtom) {
        return mockSetStationResolveFailed;
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
    expect(getDialogPresentationSnapshot()).toMatchObject({
      visible: true,
      request: {
        title: 'notice',
        message: 'firstAlertText',
        buttons: expect.any(Array),
      },
    });
  });
  describe('現在駅の解決失敗フラグ', () => {
    // 初回の位置取得は 800ms のフォールバックタイマーで始まる
    const INITIAL_LOCATION_FALLBACK_DELAY_MS = 800;
    const location = {
      coords: { latitude: 35.7, longitude: 139.6 },
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const runFallbackFetch = async () => {
      render(<HookBridge onReady={() => {}} />);
      await jest.advanceTimersByTimeAsync(INITIAL_LOCATION_FALLBACK_DELAY_MS);
    };

    it('位置情報の取得に失敗したら立てる', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (useFetchCurrentLocationOnce as jest.Mock).mockReturnValue({
        fetchCurrentLocation: jest
          .fn()
          .mockRejectedValue(new Error('unsatisfied device settings')),
      });

      await runFallbackFetch();

      expect(mockSetStationResolveFailed).toHaveBeenCalledWith(true);
      consoleError.mockRestore();
    });

    it('最寄り駅が見つからなければ立てる', async () => {
      (useFetchCurrentLocationOnce as jest.Mock).mockReturnValue({
        fetchCurrentLocation: jest.fn().mockResolvedValue(location),
      });
      (useFetchNearbyStation as jest.Mock).mockReturnValue({
        stations: [],
        fetchByCoords: jest
          .fn()
          .mockResolvedValue({ data: { stationsNearby: [] } }),
        isLoading: false,
        error: null,
      });

      await runFallbackFetch();

      expect(mockSetStationResolveFailed).toHaveBeenCalledWith(true);
    });

    it('最寄り駅が取れたら下ろす', async () => {
      (useFetchCurrentLocationOnce as jest.Mock).mockReturnValue({
        fetchCurrentLocation: jest.fn().mockResolvedValue(location),
      });
      (useFetchNearbyStation as jest.Mock).mockReturnValue({
        stations: [],
        fetchByCoords: jest
          .fn()
          .mockResolvedValue({ data: { stationsNearby: [createStation(1)] } }),
        isLoading: false,
        error: null,
      });

      await runFallbackFetch();

      expect(mockSetStationResolveFailed).toHaveBeenCalledWith(false);
      expect(mockSetStationResolveFailed).not.toHaveBeenCalledWith(true);
    });
  });
});
