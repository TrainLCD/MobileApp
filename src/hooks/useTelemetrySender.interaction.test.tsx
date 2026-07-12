import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  findInteractionEventCalls,
  setupTelemetrySenderMocks,
  TELEMETRY_TEST_BASE_URL,
  TelemetryTestWrapper,
  useTelemetryEnabled,
  useTelemetrySender,
} from '~/utils/test/telemetrySenderTestSetup';

let mockFetch: jest.Mock;

const findInteractionCall = (eventName: string) =>
  findInteractionEventCalls(mockFetch, eventName)[0];

describe('useTelemetrySender (interaction events)', () => {
  beforeEach(() => {
    mockFetch = setupTelemetrySenderMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should send interaction event via GraphQL sendInteractionEvent mutation', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change', {
        tabName: 'settings',
        index: 2,
        fromUser: true,
      });
      await Promise.resolve();
    });

    await waitFor(
      () => {
        const call = findInteractionCall('tab_change');
        expect(call).toBeDefined();
        const input = JSON.parse(call[1].body).variables.input;
        expect(input.sessionId).toBe('test-session-id');
        expect(input.device).toBe('MockDevice');
        expect(input.appVersion).toBe('1.0.0(42)');
        expect(input.platform).toBe('ios');
        expect(input.channel).toBe('production');
        expect(typeof input.timestamp).toBe('number');
        expect(input.properties).toEqual({
          tabName: 'settings',
          index: 2,
          fromUser: true,
        });
      },
      { timeout: 2000 }
    );
  });

  test('should send null properties when omitted', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('screen_view');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        const call = findInteractionCall('screen_view');
        expect(call).toBeDefined();
        expect(JSON.parse(call[1].body).variables.input.properties).toBeNull();
      },
      { timeout: 2000 }
    );
  });

  test('should include Authorization header with token', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        const call = findInteractionCall('tab_change');
        expect(call).toBeDefined();
        expect(call[1].headers.Authorization).toBe('Bearer test-token');
        expect(call[1].headers['Content-Type']).toBe('application/json');
      },
      { timeout: 2000 }
    );
  });

  test('should not send interaction event if telemetry is disabled', async () => {
    (useTelemetryEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should not send interaction event if baseUrl is not provided', async () => {
    const { result } = renderHook(() => useTelemetrySender(false, ''), {
      wrapper: TelemetryTestWrapper,
    });

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should warn when API returns error', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        Promise.resolve({ data: null, errors: [{ message: 'Server error' }] }),
    });

    const { result } = renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Interaction event API error:',
          'Server error'
        );
      },
      { timeout: 2000 }
    );

    consoleSpy.mockRestore();
  });

  test('should handle fetch error gracefully', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to send interaction event:',
          expect.any(Error)
        );
      },
      { timeout: 2000 }
    );

    consoleSpy.mockRestore();
  });
});
