import type * as Location from 'expo-location';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import {
  setLocation,
  setLocationAccuracyOutlier,
  setRawLocation,
} from '~/store/atoms/location';
import {
  handleTrackingLocation,
  resetTrackingLocationDedup,
} from './handleTrackingLocation';

jest.mock('~/store/atoms/location', () => ({
  setLocation: jest.fn(),
  setRawLocation: jest.fn(),
  setLocationAccuracyOutlier: jest.fn(),
}));

let mockIsDevApp = false;
jest.mock('./isDevApp', () => ({
  get isDevApp() {
    return mockIsDevApp;
  },
}));

const mockSetLocation = setLocation as jest.Mock;
const mockSetRawLocation = setRawLocation as jest.Mock;
const mockSetLocationAccuracyOutlier = setLocationAccuracyOutlier as jest.Mock;

const makeLocation = (
  accuracy: number | null,
  timestamp = 1000
): Location.LocationObject => ({
  coords: {
    latitude: 35.0,
    longitude: 139.0,
    accuracy,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: 0,
  },
  timestamp,
});

describe('handleTrackingLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDevApp = false;
    resetTrackingLocationDedup();
  });

  it('精度がMAX_PERMIT_ACCURACY以下ならsetLocationに渡す（外れ値フラグの解除はsetLocationに委譲）', () => {
    const loc = makeLocation(MAX_PERMIT_ACCURACY);
    handleTrackingLocation(loc);

    expect(mockSetLocation).toHaveBeenCalledWith(loc);
    // 解除はsetLocation側に集約したため、本関数からは外れ値フラグを操作しない
    expect(mockSetLocationAccuracyOutlier).not.toHaveBeenCalled();
  });

  it('精度がMAX_PERMIT_ACCURACYを超える測位はsetLocationに渡さず外れ値フラグを立てる', () => {
    const loc = makeLocation(MAX_PERMIT_ACCURACY + 1);
    handleTrackingLocation(loc);

    expect(mockSetLocation).not.toHaveBeenCalled();
    expect(mockSetLocationAccuracyOutlier).toHaveBeenCalledWith(true);
  });

  it('精度がnullの測位はフィルタせずsetLocationに渡す', () => {
    const loc = makeLocation(null);
    handleTrackingLocation(loc);

    expect(mockSetLocation).toHaveBeenCalledWith(loc);
  });

  it('isDevApp時はフィルタで棄却される測位も生の値として記録する', () => {
    mockIsDevApp = true;
    const loc = makeLocation(MAX_PERMIT_ACCURACY + 500);
    handleTrackingLocation(loc);

    // 生の値は記録するが、フィルタにより通常の位置情報としては採用しない
    expect(mockSetRawLocation).toHaveBeenCalledWith(loc);
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('本番ビルド（isDevApp=false）では生の値を記録しない', () => {
    mockIsDevApp = false;
    const loc = makeLocation(30);
    handleTrackingLocation(loc);

    expect(mockSetRawLocation).not.toHaveBeenCalled();
    expect(mockSetLocation).toHaveBeenCalledWith(loc);
  });

  describe('重複・順序逆転した測位の破棄（Android 16の2系統配信対策）', () => {
    it('同一タイムスタンプの測位は2回目以降を破棄する', () => {
      const loc = makeLocation(30, 1000);
      handleTrackingLocation(loc);
      handleTrackingLocation({ ...loc });

      expect(mockSetLocation).toHaveBeenCalledTimes(1);
    });

    it('処理済みより古いタイムスタンプの測位（遅延バッチ再配信）は破棄する', () => {
      handleTrackingLocation(makeLocation(30, 5000));
      handleTrackingLocation(makeLocation(30, 3000));

      expect(mockSetLocation).toHaveBeenCalledTimes(1);
      expect(mockSetLocation).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: 5000 })
      );
    });

    it('新しいタイムスタンプの測位は通常どおり処理する', () => {
      handleTrackingLocation(makeLocation(30, 1000));
      handleTrackingLocation(makeLocation(30, 2000));

      expect(mockSetLocation).toHaveBeenCalledTimes(2);
    });

    it('破棄した測位は生の値としても記録しない（DevOverlayにも重複を流さない）', () => {
      mockIsDevApp = true;
      const loc = makeLocation(30, 1000);
      handleTrackingLocation(loc);
      handleTrackingLocation({ ...loc });

      expect(mockSetRawLocation).toHaveBeenCalledTimes(1);
    });

    it('システム時計が巻き戻された場合はガードをリセットして測位を受理する', () => {
      // 処理済みタイムスタンプが現在時刻より大きく未来 = 時計巻き戻り発生とみなす
      const futureTs = Date.now() + 60_000;
      handleTrackingLocation(makeLocation(30, futureTs));
      // 巻き戻り後の測位（現在時刻ベース）は futureTs より古いが、凍結せず受理される
      handleTrackingLocation(makeLocation(30, Date.now()));

      expect(mockSetLocation).toHaveBeenCalledTimes(2);
    });
  });
});
