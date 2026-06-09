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
  resetRemoteConfigCache,
  setupRemoteConfig,
} from './remoteConfig';

const mockedGetValue = getValue as jest.Mock;

describe('getMaxPermitAccuracy', () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetRemoteConfigCache();
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

  it('caches a valid value and skips further SDK reads', () => {
    mockedGetValue.mockReturnValueOnce({ asNumber: () => 2000 });
    expect(getMaxPermitAccuracy()).toBe(2000);
    expect(getMaxPermitAccuracy()).toBe(2000);
    expect(mockedGetValue).toHaveBeenCalledTimes(1);
  });

  it('does not cache fallback results', () => {
    mockedGetValue.mockReturnValueOnce({ asNumber: () => 0 });
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);
    mockedGetValue.mockReturnValueOnce({ asNumber: () => 2000 });
    expect(getMaxPermitAccuracy()).toBe(2000);
  });
});

describe('isForceNotArrivedOnLowAccuracyEnabled', () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetRemoteConfigCache();
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

  it('caches a remote value and skips further SDK reads', () => {
    mockedGetValue.mockReturnValueOnce({
      getSource: () => 'remote',
      asBoolean: () => false,
    });
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(false);
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(false);
    expect(mockedGetValue).toHaveBeenCalledTimes(1);
  });

  it('does not cache static (unset) fallback results', () => {
    mockedGetValue.mockReturnValueOnce({
      getSource: () => 'static',
      asBoolean: () => false,
    });
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(true);
    mockedGetValue.mockReturnValueOnce({
      getSource: () => 'remote',
      asBoolean: () => false,
    });
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(false);
  });
});

describe('setupRemoteConfig', () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetRemoteConfigCache();
  });

  it('invalidates cached values after fetch/activate', async () => {
    mockedGetValue.mockReturnValueOnce({ asNumber: () => 2000 });
    expect(getMaxPermitAccuracy()).toBe(2000);

    await setupRemoteConfig();

    mockedGetValue.mockReturnValueOnce({ asNumber: () => 800 });
    expect(getMaxPermitAccuracy()).toBe(800);
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
