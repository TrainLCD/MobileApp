import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BleManager, type Device } from 'react-native-ble-plx';
import {
  BLE_ENABLED,
  BLE_TARGET_CHARACTERISTIC_UUID,
  BLE_TARGET_LOCAL_NAME,
  BLE_TARGET_SERVICE_UUID,
} from 'react-native-dotenv';
import { parenthesisRegexp } from '../constants/regexp';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
} from '../store/selectors/station';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useIsPassing } from './useIsPassing';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

const manager = new BleManager();

export const useBLEDiagnostic = (): void => {
  // stationState全体を購読すると無関係なフィールド(station等)の更新でも
  // 再レンダーされるため、必要なフィールドの派生atomに購読を絞る
  const arrived = useAtomValue(arrivedAtom);
  const approaching = useAtomValue(approachingAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const [device, setDevice] = useState<Device | null>(null);

  const station = useCurrentStation();
  // まもなく表示時は現在地基準で実際に接近している駅をBLEへ送る(ヘッダー/TTS/ウォッチと同基準)
  const nextStation = useDisplayNextStation();
  const isPassing = useIsPassing();
  const trainType = useCurrentTrainType();
  const getStationNumberIndex = useStationNumberIndexFunc();

  const prevSentText = useRef<string>('');

  const stationText = useMemo(() => {
    if (!selectedBound) {
      return '';
    }

    const arrivedAtCurrentStation = !isPassing && arrived;
    const targetStation = arrivedAtCurrentStation ? station : nextStation;
    if (!targetStation) {
      return '';
    }

    const stationNumberIndex = getStationNumberIndex(targetStation);
    const stationNumber =
      targetStation.stationNumbers?.[stationNumberIndex]?.stationNumber;

    const prefix = arrivedAtCurrentStation
      ? 'ただいま'
      : approaching
        ? 'まもなく'
        : '次は';

    const boundStationNumberIndex = getStationNumberIndex(selectedBound);
    const boundStationNumber =
      selectedBound.stationNumbers?.[boundStationNumberIndex]?.stationNumber;
    const trainTypeName = trainType?.name?.replace(parenthesisRegexp, '') ?? '';
    const boundText = `この電車は${trainTypeName ? `${trainTypeName} ` : ''}${
      selectedBound.name ?? ''
    }${boundStationNumber ? `(${boundStationNumber})` : ''}ゆき`;

    return `${prefix}${targetStation.name ?? ''}${
      stationNumber ? `(${stationNumber})` : ''
    } ${boundText}`;
  }, [
    selectedBound,
    isPassing,
    arrived,
    approaching,
    station,
    nextStation,
    trainType,
    getStationNumberIndex,
  ]);

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

    if (prevSentText.current !== stationText) {
      device?.writeCharacteristicWithResponseForService(
        BLE_TARGET_SERVICE_UUID,
        BLE_TARGET_CHARACTERISTIC_UUID,
        btoa(unescape(encodeURIComponent(stationText)))
      );
      prevSentText.current = stationText;
    }
  }, [device, stationText]);

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect();
    }
  }, [scanAndConnect]);
};
