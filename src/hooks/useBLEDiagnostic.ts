import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BleManager, type Device } from 'react-native-ble-plx';
import {
  BLE_ENABLED,
  BLE_TARGET_CHARACTERISTIC_UUID,
  BLE_TARGET_LOCAL_NAME,
  BLE_TARGET_SERVICE_UUID,
} from 'react-native-dotenv';
import stationState from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useIsPassing } from './useIsPassing';
import { useNextStation } from './useNextStation';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

const manager = new BleManager();

export const useBLEDiagnostic = (): void => {
  const { arrived, approaching, selectedBound } = useAtomValue(stationState);
  const [device, setDevice] = useState<Device | null>(null);

  const station = useCurrentStation();
  const nextStation = useNextStation();
  const currentLine = useCurrentLine();
  const isPassing = useIsPassing();
  const getStationNumberIndex = useStationNumberIndexFunc();

  const prevSentPayloads = useRef<string[]>([]);

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
    manager.startDeviceScan([], null, async (err, dev) => {
      if (err) {
        console.error(err);
        return;
      }
      if (dev && dev.localName === BLE_TARGET_LOCAL_NAME) {
        setDevice(
          await (await dev.connect()).discoverAllServicesAndCharacteristics()
        );
        manager.stopDeviceScan();
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      manager.stopDeviceScan();
    };
  }, []);

  const removeMacron = useCallback((str: string) => {
    return str
      .replace(/[ŌŪ]/g, (match) => {
        return match.replace('Ō', 'O').replace('Ū', 'U');
      })
      .replace(/[ōū]/g, (match) => {
        return match.replace('ō', 'o').replace('ū', 'u');
      });
  }, []);

  const payloads = useMemo(() => {
    const stationNumberIndex = getStationNumberIndex(station);
    const nextStationNumberIndex =
      (nextStation && getStationNumberIndex(nextStation)) ?? -1;
    const stationNumber =
      station?.stationNumbers?.[stationNumberIndex]?.stationNumber;
    const nextStationNumber =
      nextStation?.stationNumbers?.[nextStationNumberIndex]?.stationNumber;

    return [
      `stt:${stateText}`,
      selectedBound
        ? `num:${
            (!isPassing && arrived ? stationNumber : nextStationNumber) ?? ''
          }`
        : 'num:',
      `stn:${(!isPassing && arrived ? station?.nameRoman : nextStation?.nameRoman) ?? ''}`,
      `tfr:${
        (!isPassing && arrived
          ? station?.lines
              ?.filter((l) => l?.id !== currentLine?.id)
              .map((l) => l.nameRoman)
              .join(', ')
          : nextStation?.lines
              ?.filter((l) => l?.id !== currentLine?.id)
              .map((l) => l.nameRoman)
              .join(', ')) ?? ''
      }`,
      isPassing && arrived
        ? `pss:${station?.nameRoman ?? ''}${stationNumber ? `(${stationNumber})` : ''}`
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

    if (JSON.stringify(prevSentPayloads.current) !== JSON.stringify(payloads)) {
      for (const val of payloads) {
        device?.writeCharacteristicWithResponseForService(
          BLE_TARGET_SERVICE_UUID,
          BLE_TARGET_CHARACTERISTIC_UUID,
          btoa(unescape(encodeURIComponent(removeMacron(val))))
        );
        prevSentPayloads.current = payloads;
      }
    }
  }, [device, payloads, removeMacron]);

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect();
    }
  }, [scanAndConnect]);
};
