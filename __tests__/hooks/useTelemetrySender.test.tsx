import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTelemetrySender } from '../../src/hooks/useTelemetrySender';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { useRecoilValue } from 'recoil';
import useIsPassing from '../../src/hooks/useIsPassing';

// 必要なモック
jest.mock('expo-location');
jest.mock('expo-device');
jest.mock('react-native-dotenv', () => ({
  ENABLE_EXPERIMENTAL_TELEMETRY: 'true',
}));
jest.mock('recoil', () => ({
  atom: jest.fn(),
  useRecoilValue: jest.fn(),
}));
jest.mock('../../src/hooks/useIsPassing', () => jest.fn());

describe('useTelemetrySender', () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();

    global.WebSocket = jest.fn().mockImplementation(() => ({
      readyState: 1,
      send: mockSend,
      close: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    })) as any;

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (global.WebSocket as any).OPEN = 1;

    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: 'granted',
      }
    );

    (Device.modelName as string) = 'TestDevice';
    (useRecoilValue as jest.Mock).mockReturnValue({
      arrived: false,
      approaching: true,
    });
    (useIsPassing as jest.Mock).mockReturnValue(false);
  });

  it('sends telemetry data when permission is granted', async () => {
    renderHook(() => useTelemetrySender('ws://localhost:8080'));

    await waitFor(
      () => {
        expect(mockSend).toHaveBeenCalledTimes(1);

        const payload = JSON.parse(mockSend.mock.calls[0][0]);

        expect(payload.type).toBe('location_update');
        expect(payload.device).toBe('TestDevice');
        expect(payload.state).toBe('approaching');
        expect(payload.coords).toHaveProperty('latitude');
        expect(payload.timestamp).toBeDefined();
      },
      { timeout: 100 }
    );
  });

  it('does not send telemetry data when permission is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: 'denied',
      }
    );

    renderHook(() => useTelemetrySender('ws://localhost:8080'));

    await waitFor(
      () => {
        expect(mockSend).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });
});
