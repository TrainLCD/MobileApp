import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import {
  getMaxPermitAccuracy,
  isForceNotArrivedOnLowAccuracyEnabled,
  resetRemoteConfigCache,
  setupRemoteConfig,
} from './remoteConfig';

jest.mock('./workerApi', () => ({
  workerUrl: (path: string) => `https://worker.test${path}`,
}));

const fetchMock = jest.fn();
const origFetch = global.fetch;
global.fetch = fetchMock as unknown as typeof fetch;

const mockRemoteConfig = (body: unknown, ok = true) => {
  fetchMock.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 503,
    json: async () => body,
  });
};

afterEach(() => {
  jest.clearAllMocks();
  resetRemoteConfigCache();
});

afterAll(() => {
  global.fetch = origFetch;
});

describe('getMaxPermitAccuracy', () => {
  it('falls back to MAX_PERMIT_ACCURACY before setup', () => {
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);
  });

  it('returns the remote value after a successful setup', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 2000,
      force_not_arrived_on_low_accuracy: true,
    });
    await setupRemoteConfig();
    expect(getMaxPermitAccuracy()).toBe(2000);
  });

  it('keeps the fallback when the remote value is zero or invalid', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 0,
      force_not_arrived_on_low_accuracy: true,
    });
    await setupRemoteConfig();
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);
  });
});

describe('isForceNotArrivedOnLowAccuracyEnabled', () => {
  it('falls back to true before setup', () => {
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(true);
  });

  it('returns the remote boolean after setup', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      force_not_arrived_on_low_accuracy: false,
    });
    await setupRemoteConfig();
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(false);
  });

  it('falls back to true when the boolean is missing', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500 });
    await setupRemoteConfig();
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(true);
  });
});

describe('setupRemoteConfig', () => {
  it('fetches the remote config endpoint', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1234,
      force_not_arrived_on_low_accuracy: true,
    });
    await setupRemoteConfig();
    expect(fetchMock).toHaveBeenCalledWith('https://worker.test/config/remote');
  });

  it('throws when the endpoint responds with an error', async () => {
    mockRemoteConfig({}, false);
    await expect(setupRemoteConfig()).rejects.toThrow();
  });
});
