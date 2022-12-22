import { encode as btoa } from 'base-64';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import stationState from '../store/atoms/station';
import useCurrentLine from './useCurrentLine';
import useNextStation from './useNextStation';

const manager = new BleManager();
const BLE_ENABLED = process.env.BLE_ENABLED === 'true';
const TARGET_LOCAL_NAME = process.env.BLE_TARGET_LOCAL_NAME;
const TARGET_SERVICE_UUID = process.env.BLE_TARGET_SERVICE_UUID;
const TARGET_CHARACTERISTIC_UUID = process.env.BLE_TARGET_CHARACTERISTIC_UUID;

const useBLE = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState);
  const deviceRef = useRef<Device>();
  const currentLine = useCurrentLine();
  const nextStation = useNextStation();

  const stateText = useMemo(() => {
    if (arrived) {
      return 'Now stopping at';
    }
    if (approaching) {
      return 'Soon';
    }
    return 'The next stop is';
  }, [approaching, arrived]);

  const switchedStation = useMemo(
    () => (arrived ? station : nextStation),
    [arrived, nextStation, station]
  );

  const payloadStr = useMemo(() => {
    // マクロンと%20絶対殺すマン
    const stationNameR = switchedStation?.nameR
      ? encodeURIComponent(switchedStation?.nameR.normalize('NFD'))
          .replaceAll('%CC%84', '')
          .replaceAll('%E2%80%99', '')
          .replaceAll('%20', ' ')
      : '';
    const stationNameWithNumber = switchedStation?.stationNumbers[0]
      ?.stationNumber
      ? `${stationNameR}(${switchedStation?.stationNumbers[0]?.stationNumber})`
      : stationNameR;
    const lines = switchedStation?.lines.filter(
      (l) => l.id !== currentLine?.id
    );
    const linesStr = lines?.length
      ? lines
          .map((l) =>
            encodeURIComponent(l.nameR.normalize('NFD'))
              .replaceAll('%CC%84', '')
              .replaceAll('%E2%80%99', '')
              .replaceAll('%20', ' ')
              .replace(parenthesisRegexp, '')
          )
          .filter((l, i, self) => self.indexOf(l) === i)
          .join('\n')
      : 'N/A';

    return btoa(
      `${stateText}${'\n'}${stationNameWithNumber}${'\n'}${'\n'}Transfer: ${'\n'}${linesStr}`
    );
  }, [
    currentLine?.id,
    stateText,
    switchedStation?.lines,
    switchedStation?.nameR,
    switchedStation?.stationNumbers,
  ]);

  const scanAndConnect = useCallback(() => {
    manager.startDeviceScan(null, null, async (err, dev) => {
      if (err) {
        console.error(err);
        return;
      }
      if (dev && dev.localName === TARGET_LOCAL_NAME) {
        deviceRef.current = await (
          await dev.connect()
        ).discoverAllServicesAndCharacteristics();
        manager.stopDeviceScan();
      }
    });
  }, []);

  useEffect(() => {
    if (!BLE_ENABLED || !TARGET_SERVICE_UUID || !TARGET_CHARACTERISTIC_UUID) {
      return;
    }

    if (deviceRef.current) {
      deviceRef.current.writeCharacteristicWithResponseForService(
        TARGET_SERVICE_UUID,
        TARGET_CHARACTERISTIC_UUID,
        payloadStr
      );
    }
  }, [deviceRef, payloadStr]);

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect();
    }
  }, [scanAndConnect]);
};

export default useBLE;
