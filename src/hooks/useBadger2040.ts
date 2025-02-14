import { useCallback, useEffect, useMemo, useState } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import {
  BLE_ENABLED,
  BLE_TARGET_CHARACTERISTIC_UUID,
  BLE_TARGET_LOCAL_NAME,
  BLE_TARGET_SERVICE_UUID,
} from 'react-native-dotenv';
import { useRecoilValue } from 'recoil';
import stationState from '../store/atoms/station';
import useIsPassing from './useIsPassing';
import { useLocationStore } from './useLocationStore';

const manager = new BleManager();

export const useBadger2040 = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState);
  const [device, setDevice] = useState<Device | null>(null);
  const state = useLocationStore();

  const isPassing = useIsPassing();

  const { latitude, longitude, speed, accuracy } = useMemo(() => {
    const latitude = state?.coords.latitude;
    const longitude = state?.coords.longitude;
    const speed = state?.coords.speed;
    const accuracy = state?.coords.accuracy;
    return { latitude, longitude, speed, accuracy };
  }, [
    state?.coords.accuracy,
    state?.coords.latitude,
    state?.coords.longitude,
    state?.coords.speed,
  ]);

  const stateText = useMemo(() => {
    const states = [];

    if (isPassing) {
      states.push('PASSING');
    }
    if (approaching) {
      states.push('APPROACHING');
    }
    if (arrived) {
      states.push('ARRIVED');
    }

    if (!states.length) {
      return 'NONE';
    }

    return states.join(', ');
  }, [approaching, arrived, isPassing]);

  const scanAndConnect = useCallback(() => {
    manager.startDeviceScan(null, null, async (err, dev) => {
      if (err) {
        console.error(err);
        return;
      }

      try {
        if (dev && dev.localName === BLE_TARGET_LOCAL_NAME) {
          setDevice(
            await (await dev.connect()).discoverAllServicesAndCharacteristics()
          );
          manager.stopDeviceScan();
        }
      } catch (err) {
        console.error(err);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      manager.stopDeviceScan();
    };
  }, []);

  const payloads = useMemo(
    () => [
      `lat:${latitude}`,
      `lon:${longitude}`,
      `acc:${accuracy}`,
      `spd:${speed}`,
      `stt:${stateText}`,
    ],
    [accuracy, latitude, longitude, speed, stateText]
  );

  console.log(payloads);

  useEffect(() => {
    const sub = device?.onDisconnected(() => {
      scanAndConnect();
    });
    return sub?.remove;
  }, [device, scanAndConnect]);

  useEffect(() => {
    if (
      !BLE_ENABLED ||
      !BLE_TARGET_SERVICE_UUID ||
      !BLE_TARGET_CHARACTERISTIC_UUID
    ) {
      return;
    }
    if (device) {
      for (const val of payloads) {
        device.writeCharacteristicWithResponseForService(
          BLE_TARGET_SERVICE_UUID,
          BLE_TARGET_CHARACTERISTIC_UUID,
          btoa(val)
        );
      }

      device.writeCharacteristicWithResponseForService(
        BLE_TARGET_SERVICE_UUID,
        BLE_TARGET_CHARACTERISTIC_UUID,
        btoa('eof')
      );
    }
  }, [device, payloads]);

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect();
    }
  }, [scanAndConnect]);
};
