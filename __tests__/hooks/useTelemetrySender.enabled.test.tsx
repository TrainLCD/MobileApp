import { renderHook } from '@testing-library/react-native';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';

jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabled: true,
}));

jest.mock('expo-device', () => ({
  modelName: 'TestDevice',
}));

jest.mock('recoil', () => ({
  atom: jest.fn(),
  useRecoilValue: jest.fn(() => ({
    arrived: false,
    approaching: true,
  })),
}));

jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: jest.fn().mockImplementation((selector) =>
    selector({
      coords: {
        latitude: 35,
        longitude: 139,
        accuracy: 5,
        speed: 10,
      },
    })
  ),
}));

jest.mock('~/hooks/useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

describe('useTelemetrySender', () => {
  let mockSend: jest.Mock;
  let mockOnOpen: jest.Mock;
  let mockOnError: jest.Mock;
  let mockOnClose: jest.Mock;
  let mockClose: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    mockOnOpen = jest.fn();
    mockOnError = jest.fn();
    mockOnClose = jest.fn();
    mockClose = jest.fn();

    global.WebSocket = jest.fn().mockImplementation(() => ({
      readyState: 1,
      send: mockSend,
      close: mockClose,
      set onopen(callback: () => void) {
        mockOnOpen();
        if (callback) callback();
      },
      set onerror(callback: (error: Event) => void) {
        mockOnError();
      },
      set onclose(callback: () => void) {
        mockOnClose();
      },
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    })) as any;

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (global.WebSocket as any).OPEN = 1;
  });

  const RENDER_WAIT_TIME = 50;

  it('sends telemetry data when telemetry is enabled', async () => {
    renderHook(() => useTelemetrySender('https://127.0.0.1:8080'));

    await new Promise((r) => setTimeout(r, RENDER_WAIT_TIME));

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0]);
    expect(payload).toMatchObject({
      type: 'location_update',
      device: 'TestDevice',
      state: 'approaching',
    });
  });
  it('properly handles WebSocket lifecycle', async () => {
    const { unmount } = renderHook(() =>
      useTelemetrySender('https://127.0.0.1:8080')
    );

    await new Promise((r) => setTimeout(r, RENDER_WAIT_TIME));

    expect(mockOnOpen).toHaveBeenCalled();

    unmount();

    expect(mockClose).toHaveBeenCalled();
  });

  it.each([
    ['arrived', true, false, false],
    ['approaching', false, true, false],
    ['passing', false, false, true],
    ['moving', false, false, false],
  ])(
    'sends correct state %s',
    async (expectedState, arrived, approaching, isPassing) => {
      // モックを上書き
      jest.spyOn(require('recoil'), 'useRecoilValue').mockReturnValue({
        arrived,
        approaching,
      });
      jest
        .spyOn(require('~/hooks/useIsPassing'), 'default')
        .mockReturnValue(isPassing);

      renderHook(() => useTelemetrySender('https://127.0.0.1:8080'));

      await new Promise((r) => setTimeout(r, RENDER_WAIT_TIME));

      const payload = JSON.parse(mockSend.mock.calls[0][0]);
      expect(payload.state).toBe(expectedState);
    }
  );
});
