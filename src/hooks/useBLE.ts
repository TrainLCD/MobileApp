import { encode as btoa } from 'base-64';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import useNextStation from './useNextStation';
import useTransferLines from './useTransferLines';

const manager = new BleManager();
const BLE_ENABLED = process.env.BLE_ENABLED === 'true';
const TARGET_LOCAL_NAME = process.env.BLE_TARGET_LOCAL_NAME;
const TARGET_SERVICE_UUID = process.env.BLE_TARGET_SERVICE_UUID;
const TARGET_CHARACTERISTIC_UUID = process.env.BLE_TARGET_CHARACTERISTIC_UUID;

const useBLE = (): void => {
  const { arrived, approaching, station, scoredStations } =
    useRecoilValue(stationState);
  const deviceRef = useRef<Device>();
  const nextStation = useNextStation();
  const transferLines = useTransferLines();

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

  const payloadStr = useMemo(() => {
    const linesStr = transferLines?.length
      ? transferLines
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

    const stationNameWithNumber =
      switchedStation && getStationNameWithNumber(switchedStation);
    const passingStationNameWithNumber =
      passingStation && getStationNameWithNumber(passingStation);

    return btoa(
      `${stateText}${'\n'}${stationNameWithNumber}${'\n'}${'\n'}Transfer: ${'\n'}${linesStr}${
        passingStation ? `\n\nPassing:\n${passingStationNameWithNumber}` : ''
      }`
    );
  }, [
    getStationNameWithNumber,
    passingStation,
    stateText,
    switchedStation,
    transferLines,
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
