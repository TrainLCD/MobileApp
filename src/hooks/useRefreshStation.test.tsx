import { renderHook } from '@testing-library/react-native';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { RecoilRoot } from 'recoil';
import sendNotificationAsync from '~/utils/native/ios/sensitiveNotificationMoudle';
import { useRefreshStation } from './useRefreshStation';

jest.mock('expo-notifications');
jest.mock('geolib/es/isPointWithinRadius', () => jest.fn());
jest.mock('~/utils/native/ios/sensitiveNotificationMoudle', () => ({
  default: jest.fn(),
}));
jest.mock('~/hooks/useCanGoForward', () => jest.fn());
jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: jest.fn(),
}));
jest.mock('~/hooks/useNearestStation', () => ({
  useNearestStation: jest.fn(),
}));
jest.mock('~/hooks/useNextStation', () => ({
  useNextStation: jest.fn(),
}));
jest.mock('~/hooks/useStationNumberIndexFunc', () => jest.fn());
jest.mock('~/hooks/useThreshold', () => jest.fn());
jest.mock('~/utils/isPass', () => jest.fn());
jest.mock('~/translation', () => jest.fn());

describe.skip('useRefreshStation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RecoilRoot>{children}</RecoilRoot>
  );

  it('通知が送信される（APPROACHING）', async () => {
    // Arrange
    require('~/hooks/useLocationStore').useLocationStore.mockImplementation(
      (selector) =>
        selector({
          coords: { latitude: 35.0, longitude: 135.0, speed: 0, accuracy: 5 },
        })
    );
    require('~/hooks/useNearestStation').useNearestStation.mockReturnValue({
      id: 1,
      name: 'TestStation',
      nameRoman: 'TestStation',
      latitude: 35.0,
      longitude: 135.0,
      stationNumbers: [{ stationNumber: 'A01' }],
    });
    require('~/hooks/useNextStation').useNextStation.mockReturnValue({
      id: 2,
      latitude: 35.0005,
      longitude: 135.0005,
    });
    require('~/hooks/useCanGoForward').mockReturnValue(true);
    require('~/hooks/useStationNumberIndexFunc').default.mockReturnValue(0);
    require('~/hooks/useThreshold').useThreshold.mockReturnValue({
      arrivedThreshold: 100,
      approachingThreshold: 200,
    });
    require('~/utils/isPass').default.mockReturnValue(false);
    (isPointWithinRadius as jest.Mock).mockReturnValue(true);

    const notifyStateValue = {
      targetStationIds: [1],
    };

    // Recoil の状態を初期化した上で Hook を実行
    const { result, rerender } = renderHook(() => useRefreshStation(), {
      wrapper,
    });

    // Act: エフェクトはマウント時に走るので何もしなくてもよい

    // Assert
    expect(sendNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        body: expect.stringContaining('到着します'),
      })
    );
  });
});
