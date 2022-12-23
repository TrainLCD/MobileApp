import { stringToBytes } from 'convert-string';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import useCurrentLine from './useCurrentLine';
import useNextStation from './useNextStation';

const BLE_ENABLED = process.env.BLE_ENABLED === 'true';
const TARGET_LOCAL_NAME = process.env.BLE_TARGET_LOCAL_NAME;
const TARGET_SERVICE_UUID = process.env.BLE_TARGET_SERVICE_UUID;
const TARGET_CHARACTERISTIC_UUID = process.env.BLE_TARGET_CHARACTERISTIC_UUID;

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const useBLE = (): void => {
  const { arrived, approaching, station, scoredStations } =
    useRecoilValue(stationState);
  const currentLine = useCurrentLine();
  const nextStation = useNextStation();
  const peripheralInfoRef = useRef<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  const stateText = useMemo(() => {
    if (arrived && !getIsPass(station)) {
      return 'Now stopping at';
    }
    if (approaching && !getIsPass(scoredStations[0])) {
      return 'Soon';
    }
    return 'The next stop is';
  }, [approaching, arrived, scoredStations, station]);

  const switchedStation = useMemo(
    () => (arrived && !getIsPass(station) ? station : nextStation),
    [arrived, nextStation, station]
  );

  const passingStation = useMemo(
    () => (arrived && getIsPass(station) ? station : null),
    [arrived, station]
  );

  const getStationNameWithNumber = useCallback((s: Station) => {
    const stationNameR = s?.nameR
      ? encodeURIComponent(s?.nameR.normalize('NFD'))
          .replaceAll('%CC%84', '')
          .replaceAll('%E2%80%99', '')
          .replaceAll('%20', ' ')
      : '';
    return s?.stationNumbers[0]?.stationNumber
      ? `${stationNameR}(${s?.stationNumbers[0]?.stationNumber})`
      : stationNameR;
  }, []);

  const payload = useMemo(() => {
    const lines = switchedStation?.lines.filter(
      (l) => l.id !== currentLine?.id
    );
    const linesStr = lines?.length
      ? lines.map((l) => l.nameR.replace(parenthesisRegexp, '')).join('\n')
      : 'N/A';

    const stationNameWithNumber =
      switchedStation && getStationNameWithNumber(switchedStation);
    const passingStationNameWithNumber =
      passingStation && getStationNameWithNumber(passingStation);

    const str = `${stateText}${'\n'}${stationNameWithNumber}${'\n'}${'\n'}Transfer: ${'\n'}${linesStr}${
      passingStation ? `\n\nPassing:\n${passingStationNameWithNumber}` : ''
    }`;

    return [stringToBytes(str), new Blob([str]).size];
  }, [
    currentLine?.id,
    getStationNameWithNumber,
    passingStation,
    stateText,
    switchedStation,
  ]);

  useEffect(() => {
    if (!BLE_ENABLED || !TARGET_SERVICE_UUID || !TARGET_CHARACTERISTIC_UUID) {
      return;
    }

    const [bytes, size] = payload;

    if (peripheralInfoRef.current) {
      BleManager.write(
        peripheralInfoRef.current?.id,
        TARGET_SERVICE_UUID,
        TARGET_CHARACTERISTIC_UUID,
        bytes,
        size
      );
    }
  }, [payload]);

  const scan = useCallback(async () => {
    if (!isScanning) {
      setIsScanning(true);
      if (!peripheralInfoRef.current) {
        await BleManager.scan([], 60, true);
      }
    }
  }, [isScanning]);

  const handleDiscoverPeripheral = useCallback(async (peripheral: any) => {
    if (peripheral.name === TARGET_LOCAL_NAME && !peripheral.connected) {
      await BleManager.connect(peripheral.id);
      const peripheralInfo = await BleManager.retrieveServices(peripheral.id);
      peripheralInfoRef.current = peripheralInfo;
      BleManager.stopScan();
    }
  }, []);
  const handleStopScan = useCallback(() => {
    setIsScanning(false);
    scan();
  }, [scan]);
  const handleDisconnectedPeripheral = useCallback((data: any) => {}, []);
  const handleUpdateValueForCharacteristic = useCallback((data: any) => {}, []);

  useEffect(() => {
    if (BLE_ENABLED) {
      const scanAsync = async () => {
        await BleManager.start({ showAlert: true });
        scan();

        bleManagerEmitter.addListener(
          'BleManagerDiscoverPeripheral',
          handleDiscoverPeripheral
        );
        bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
        bleManagerEmitter.addListener(
          'BleManagerDisconnectPeripheral',
          handleDisconnectedPeripheral
        );
        bleManagerEmitter.addListener(
          'BleManagerDidUpdateValueForCharacteristic',
          handleUpdateValueForCharacteristic
        );
      };
      scanAsync();
    }
    return () => {
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
    };
  }, []);
};

export default useBLE;
