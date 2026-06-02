import type * as Location from 'expo-location';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import { setLocation, setRawLocation } from '~/store/atoms/location';
import { handleTrackingLocation } from './handleTrackingLocation';

jest.mock('~/store/atoms/location', () => ({
  setLocation: jest.fn(),
  setRawLocation: jest.fn(),
}));

let mockIsDevApp = false;
jest.mock('./isDevApp', () => ({
  get isDevApp() {
    return mockIsDevApp;
  },
}));

const mockSetLocation = setLocation as jest.Mock;
const mockSetRawLocation = setRawLocation as jest.Mock;

const makeLocation = (accuracy: number | null): Location.LocationObject => ({
  coords: {
    latitude: 35.0,
    longitude: 139.0,
    accuracy,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: 0,
  },
  timestamp: 1000,
});

describe('handleTrackingLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDevApp = false;
  });

  it('精度がMAX_PERMIT_ACCURACY以下ならsetLocationに渡す', () => {
    const loc = makeLocation(MAX_PERMIT_ACCURACY);
    handleTrackingLocation(loc);

    expect(mockSetLocation).toHaveBeenCalledWith(loc);
  });

  it('精度がMAX_PERMIT_ACCURACYを超える測位はsetLocationに渡さない', () => {
    const loc = makeLocation(MAX_PERMIT_ACCURACY + 1);
    handleTrackingLocation(loc);

    expect(mockSetLocation).not.toHaveBeenCalled();
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
});
