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

const findAppLaunchCalls = () =>
  findInteractionEventCalls(mockFetch, 'app_launch');

// NOTE: app_launchの一度きり送信はモジュールレベルのフラグで管理されるため、
// このdescribe内のテストは記述順に依存する(disabled → 失敗時再送 → 初回送信 → 再送なし)
describe('useTelemetrySender (app_launch event)', () => {
  beforeEach(() => {
    mockFetch = setupTelemetrySenderMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should not send app_launch while telemetry is disabled', async () => {
    (useTelemetryEnabled as jest.Mock).mockReturnValue(false);

    renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await new Promise((r) => setTimeout(r, 30));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should reset the sent flag and retry app_launch after a failure', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error('Network error'));

    const first = renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to send interaction event:',
          expect.any(Error)
        );
      },
      { timeout: 2000 }
    );
    // 失敗後のフラグ戻し(.then)まで確実に流してからアンマウントする
    await act(async () => {
      await Promise.resolve();
    });
    first.unmount();

    // フラグが戻っているため、新しいインスタンスが再送を試みる
    consoleSpy.mockClear();
    const second = renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to send interaction event:',
          expect.any(Error)
        );
      },
      { timeout: 2000 }
    );
    // 2回目の失敗のフラグ戻しも流しきってからテストを終える
    // (後続テストへ非同期のフラグ操作が漏れるのを防ぐ)
    await act(async () => {
      await Promise.resolve();
    });
    second.unmount();

    consoleSpy.mockRestore();
  });

  test('should send app_launch once when telemetry becomes enabled', async () => {
    renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await waitFor(
      () => {
        const calls = findAppLaunchCalls();
        expect(calls.length).toBe(1);
        const input = JSON.parse(calls[0][1].body).variables.input;
        expect(input.sessionId).toBe('test-session-id');
        expect(input.device).toBe('MockDevice');
        expect(input.appVersion).toBe('1.0.0(42)');
        expect(input.platform).toBe('ios');
        expect(input.channel).toBe('production');
        expect(input.properties).toBeNull();
      },
      { timeout: 2000 }
    );
    // 送信成功の確定(.then)まで流し、フラグを確実にtrueで固定する
    await act(async () => {
      await Promise.resolve();
    });
  });

  test('should not send app_launch again from other hook instances', async () => {
    renderHook(
      () => useTelemetrySender(false, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );
    renderHook(
      () => useTelemetrySender(true, TELEMETRY_TEST_BASE_URL, 'test-token'),
      { wrapper: TelemetryTestWrapper }
    );

    await new Promise((r) => setTimeout(r, 30));

    expect(findAppLaunchCalls().length).toBe(0);
  });
});
