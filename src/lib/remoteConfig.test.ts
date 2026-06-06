import {
  fetchAndActivate,
  getValue,
  setConfigSettings,
  setDefaults,
} from '@react-native-firebase/remote-config';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import {
  getMaxPermitAccuracy,
  isForceNotArrivedOnLowAccuracyEnabled,
  REMOTE_CONFIG_KEYS,
  setupRemoteConfig,
} from './remoteConfig';

const mockedGetValue = getValue as jest.Mock;

describe('getMaxPermitAccuracy', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the remote value when it is a valid positive number', () => {
    mockedGetValue.mockReturnValueOnce({ asNumber: () => 2000 });
    expect(getMaxPermitAccuracy()).toBe(2000);
  });

  it('falls back to MAX_PERMIT_ACCURACY when the remote value is zero', () => {
    mockedGetValue.mockReturnValueOnce({ asNumber: () => 0 });
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);
  });

  it('falls back to MAX_PERMIT_ACCURACY for negative or non-finite values', () => {
    mockedGetValue.mockReturnValueOnce({ asNumber: () => -100 });
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);

    mockedGetValue.mockReturnValueOnce({ asNumber: () => Number.NaN });
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);
  });

  it('falls back to MAX_PERMIT_ACCURACY when remote config throws', () => {
    mockedGetValue.mockImplementationOnce(() => {
      throw new Error('not initialized');
    });
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);
  });

  it('reads the max_permit_accuracy key', () => {
    mockedGetValue.mockReturnValueOnce({ asNumber: () => 1234 });
    getMaxPermitAccuracy();
    expect(mockedGetValue).toHaveBeenCalledWith(
      expect.anything(),
      REMOTE_CONFIG_KEYS.MAX_PERMIT_ACCURACY
    );
  });
});

describe('isForceNotArrivedOnLowAccuracyEnabled', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the remote boolean when the value is set', () => {
    mockedGetValue.mockReturnValueOnce({
      getSource: () => 'remote',
      asBoolean: () => false,
    });
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(false);
  });

  it('falls back to true when the value is unset (static source)', () => {
    mockedGetValue.mockReturnValueOnce({
      getSource: () => 'static',
      asBoolean: () => false,
    });
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(true);
  });

  it('falls back to true when remote config throws', () => {
    mockedGetValue.mockImplementationOnce(() => {
      throw new Error('not initialized');
    });
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(true);
  });

  it('reads the force_not_arrived_on_low_accuracy key', () => {
    mockedGetValue.mockReturnValueOnce({
      getSource: () => 'remote',
      asBoolean: () => true,
    });
    isForceNotArrivedOnLowAccuracyEnabled();
    expect(mockedGetValue).toHaveBeenCalledWith(
      expect.anything(),
      REMOTE_CONFIG_KEYS.FORCE_NOT_ARRIVED_ON_LOW_ACCURACY
    );
  });
});

describe('setupRemoteConfig', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers defaults and fetches/activates remote config', async () => {
    await setupRemoteConfig();
    expect(setConfigSettings).toHaveBeenCalledTimes(1);
    expect(setDefaults).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        [REMOTE_CONFIG_KEYS.MAX_PERMIT_ACCURACY]: MAX_PERMIT_ACCURACY,
        [REMOTE_CONFIG_KEYS.FORCE_NOT_ARRIVED_ON_LOW_ACCURACY]: true,
      })
    );
    expect(fetchAndActivate).toHaveBeenCalledTimes(1);
  });
});
