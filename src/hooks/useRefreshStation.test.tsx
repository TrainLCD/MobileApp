import { act, render } from '@testing-library/react-native';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import React from 'react';
import { RecoilRoot } from 'recoil';
import * as CanGoForward from '~/hooks/useCanGoForward';
import * as LocationStore from '~/hooks/useLocationStore';
import * as NearestStation from '~/hooks/useNearestStation';
import * as NextStation from '~/hooks/useNextStation';
import { useRefreshStation } from '~/hooks/useRefreshStation';
import * as Threshold from '~/hooks/useThreshold';
import navigationState from '~/store/atoms/navigation';
import notifyState from '~/store/atoms/notify';
import stationState from '~/store/atoms/station';
import sendNotificationAsync from '~/utils/native/ios/sensitiveNotificationMoudle';

jest.mock('geolib/es/isPointWithinRadius');
jest.mock('~/utils/native/ios/sensitiveNotificationMoudle');

const Dummy = () => {
  useRefreshStation();
  return null;
};

describe('useRefreshStation', () => {
  const dummyStation = {
    id: 100,
    name: 'テスト駅',
    nameRoman: 'Test Station',
    latitude: 35,
    longitude: 135,
    stationNumbers: [{ stationNumber: 'T01' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(LocationStore, 'useLocationStore')
      .mockImplementation((selector) =>
        selector({
          coords: {
            latitude: 35,
            longitude: 135,
            speed: 0,
            accuracy: 10,
          },
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        } as any)
      );

    jest
      .spyOn(NearestStation, 'useNearestStation')
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      .mockReturnValue(dummyStation as any);
    jest
      .spyOn(NextStation, 'useNextStation')
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      .mockReturnValue(dummyStation as any);
    jest.spyOn(Threshold, 'useThreshold').mockReturnValue({
      arrivedThreshold: 100,
      approachingThreshold: 300,
    });
    jest.spyOn(CanGoForward, 'useCanGoForward').mockReturnValue(true);

    (isPointWithinRadius as jest.Mock).mockReturnValue(true);
  });

  it('通知対象の駅に到着・接近時、通知を送る', async () => {
    const { unmount } = render(
      <RecoilRoot
        initializeState={({ set }) => {
          set(notifyState, { targetStationIds: [100] });
          set(stationState, {
            station: null,
            approaching: false,
            arrived: false,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          } as any);
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          set(navigationState, { stationForHeader: null } as any);
        }}
      >
        <Dummy />
      </RecoilRoot>
    );

    await act(() => Promise.resolve());

    expect(sendNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Arriving at Test Station(T01).'),
      })
    );
    expect(sendNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Arriving at Test Station(T01).'),
      })
    );

    unmount();
  });

  it('通知済み駅には再送しない', async () => {
    const { rerender } = render(
      <RecoilRoot
        initializeState={({ set }) => {
          set(notifyState, { targetStationIds: [100] });
          set(stationState, {
            station: null,
            approaching: false,
            arrived: false,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          } as any);
          set(navigationState, {
            stationForHeader: null,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          } as any);
        }}
      >
        <Dummy />
      </RecoilRoot>
    );

    await act(() => Promise.resolve());

    expect(sendNotificationAsync).toHaveBeenCalledTimes(2); // arrived + approaching

    // 再描画（再送されないことを期待）
    rerender(
      <RecoilRoot
        initializeState={({ set }) => {
          set(notifyState, { targetStationIds: [100] });
          set(stationState, {
            station: null,
            approaching: false,
            arrived: false,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          } as any);
          set(navigationState, {
            stationForHeader: null,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          } as any);
        }}
      >
        <Dummy />
      </RecoilRoot>
    );

    await act(() => Promise.resolve());

    expect(sendNotificationAsync).toHaveBeenCalledTimes(2);
  });
});
