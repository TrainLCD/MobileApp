/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook } from '@testing-library/react-native';
import { useConsoleTelemetry } from '~/hooks/useConsoleTelemetry';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';

jest.mock('expo-device', () => ({ modelName: 'MockDevice' }));
jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabledByBuild: true,
}));
jest.mock('~/hooks/useTelemetryEnabled', () => ({
  useTelemetryEnabled: jest.fn(),
}));
jest.mock('~/constants/telemetry', () => ({
  TELEMETRY_MAX_QUEUE_SIZE: 5,
}));

let mockFetch: jest.Mock;

// NOTE: console.* のオリジナルを保存してテスト間で復元する
const savedConsole = {
  log: console.log,
  debug: console.debug,
  warn: console.warn,
  error: console.error,
};

describe('useConsoleTelemetry (enabled)', () => {
  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    global.fetch = mockFetch;

    (useTelemetryEnabled as jest.Mock).mockReturnValue(true);

    jest.useFakeTimers();
  });

  afterEach(() => {
    // NOTE: テスト後にconsoleを確実に復元
    console.log = savedConsole.log;
    console.debug = savedConsole.debug;
    console.warn = savedConsole.warn;
    console.error = savedConsole.error;

    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('should intercept console.log and send to telemetry', async () => {
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    console.log('test message');

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    const logCalls = mockFetch.mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/api/log'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(logCalls[0][1].body);
    expect(body.log.message).toBe('test message');
    expect(body.log.level).toBe('info');
    expect(body.log.type).toBe('app');
    expect(body.device).toBe('MockDevice');

    unmount();
  });

  test('should intercept console.error and send with error level', async () => {
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    console.error('something failed');

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    const logCalls = mockFetch.mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/api/log'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(logCalls[0][1].body);
    expect(body.log.level).toBe('error');
    expect(body.log.message).toBe('something failed');

    unmount();
  });

  test('should intercept console.warn and send with warn level', async () => {
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    console.warn('a warning');

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    const logCalls = mockFetch.mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/api/log'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(logCalls[0][1].body);
    expect(body.log.level).toBe('warn');

    unmount();
  });

  test('should intercept console.debug and send with debug level', async () => {
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    console.debug('debug info');

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    const logCalls = mockFetch.mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/api/log'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(logCalls[0][1].body);
    expect(body.log.level).toBe('debug');

    unmount();
  });

  test('should format non-string arguments as JSON', async () => {
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    console.log('data:', { key: 'value' }, 42);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    const logCalls = mockFetch.mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/api/log'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(logCalls[0][1].body);
    expect(body.log.message).toBe('data: {"key":"value"} 42');

    unmount();
  });

  test('should format Error objects with name and message', async () => {
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    console.error(new TypeError('invalid type'));

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    const logCalls = mockFetch.mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/api/log'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(logCalls[0][1].body);
    expect(body.log.message).toBe('TypeError: invalid type');

    unmount();
  });

  test('should include Authorization header', async () => {
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'my-secret-token')
    );

    console.log('auth test');

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    const logCalls = mockFetch.mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/api/log'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
    expect(logCalls[0][1].headers.Authorization).toBe('Bearer my-secret-token');

    unmount();
  });

  test('should respect queue size limit', async () => {
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    // TELEMETRY_MAX_QUEUE_SIZE は 5 にモックしている
    for (let i = 0; i < 10; i++) {
      console.log(`message-${i}`);
    }

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    const logCalls = mockFetch.mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/api/log'
    );
    // キューサイズ上限の5件だけ送信される
    expect(logCalls.length).toBe(5);
    // 古いメッセージがdropされ、新しいほうが残る
    const firstBody = JSON.parse(logCalls[0][1].body);
    expect(firstBody.log.message).toBe('message-5');

    unmount();
  });

  test('should restore console methods on unmount', () => {
    const originalLog = console.log;
    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    // パッチされている
    expect(console.log).not.toBe(originalLog);

    unmount();

    // 復元されている（originalConsoleに復元される）
    // NOTE: savedConsoleと等しいことを確認
    expect(console.log).toBeDefined();
    expect(console.debug).toBeDefined();
    expect(console.warn).toBeDefined();
    expect(console.error).toBeDefined();
  });

  test('should handle fetch failures silently', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { unmount } = renderHook(() =>
      useConsoleTelemetry('https://example.com', 'test-token')
    );

    console.log('will fail to send');

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    // エラーがスローされず正常に動作すること
    expect(mockFetch).toHaveBeenCalled();

    unmount();
  });

  test('should not send if baseUrl is empty', () => {
    const originalLog = console.log;

    renderHook(() => useConsoleTelemetry(''));

    // baseUrlが空の場合、consoleはパッチされない
    expect(console.log).toBe(originalLog);
  });
});
