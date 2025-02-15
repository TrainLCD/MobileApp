import { useCallback, useEffect, useMemo, useState } from 'react';
import { BleManager, type Device } from 'react-native-ble-plx';
import {
  BLE_ENABLED,
  BLE_TARGET_CHARACTERISTIC_UUID,
  BLE_TARGET_SERVICE_UUID,
} from 'react-native-dotenv';
import { useRecoilValue } from 'recoil';
import stationState from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import useIsPassing from './useIsPassing';
import { useNextStation } from './useNextStation';
import useStationNumberIndexFunc from './useStationNumberIndexFunc';

const manager = new BleManager();

export const useBLEDiagnostic = (): void => {
  const { arrived, approaching, selectedBound } = useRecoilValue(stationState);
  const [device, setDevice] = useState<Device | null>(null);

  const station = useCurrentStation();
  const nextStation = useNextStation();
  const currentLine = useCurrentLine();
  const isPassing = useIsPassing();
  const getStationNumberIndex = useStationNumberIndexFunc();

  const stateText = useMemo(() => {
    if (isPassing) {
      return 'Next';
    }

    if (approaching) {
      return 'Soon';
    }
    if (arrived) {
      return 'Now';
    }

    return 'Next';
  }, [approaching, arrived, isPassing]);

  const scanAndConnect = useCallback(() => {
    manager.startDeviceScan(
      [BLE_TARGET_SERVICE_UUID],
      null,
      async (err, dev) => {
        if (err) {
          console.error(err);
          return;
        }

        if (dev) {
          setDevice(
            await (await dev.connect()).discoverAllServicesAndCharacteristics()
          );
          manager.stopDeviceScan();
          console.log('connected', dev.localName);
        }
      }
    );
  }, []);

  useEffect(() => {
    return () => {
      manager.stopDeviceScan();
    };
  }, []);

  const payloads = useMemo(() => {
    const stationNumberIndex = getStationNumberIndex(station);
    const nextStationNumberIndex =
      (nextStation && getStationNumberIndex(nextStation)) ?? -1;
    const stationNumber =
      station?.stationNumbers[stationNumberIndex]?.stationNumber;
    const nextStationNumber =
      nextStation?.stationNumbers[nextStationNumberIndex]?.stationNumber;

    return [
      `stt:${stateText}`,
      selectedBound
        ? `num:${
            (!isPassing && arrived ? stationNumber : nextStationNumber) ?? 'N/A'
          }`
        : 'num:',
      `stn:${!isPassing && arrived ? station?.nameRoman : nextStation?.nameRoman}`,
      `tfr:${
        !isPassing && arrived
          ? station?.lines
              .filter((l) => l?.id !== currentLine?.id)
              .map((l) => l.nameRoman)
              .join(', ')
          : nextStation?.lines
              .filter((l) => l?.id !== currentLine?.id)
              .map((l) => l.nameRoman)
              .join(', ')
      }`,
      isPassing && arrived
        ? `pss:${station?.nameRoman}${stationNumber ? `(${stationNumber})` : ''}`
        : 'pss:',
    ];
  }, [
    stateText,
    isPassing,
    arrived,
    station,
    nextStation,
    getStationNumberIndex,
    currentLine,
    selectedBound,
  ]);

  useEffect(() => {
    const sub = device?.onDisconnected(() => {
      setDevice(null);
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

    for (const val of payloads) {
      device?.writeCharacteristicWithResponseForService(
        BLE_TARGET_SERVICE_UUID,
        BLE_TARGET_CHARACTERISTIC_UUID,
        btoa(unescape(encodeURIComponent(val)))
      );
    }
  }, [device, payloads]);

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect();
    }
  }, [scanAndConnect]);
};
