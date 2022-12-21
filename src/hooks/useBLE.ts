import { encode as btoa } from 'base-64';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getNextStation from '../utils/getNextStation';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import useCurrentLine from './useCurrentLine';

const manager = new BleManager();
const BLE_ENABLED = process.env.BLE_ENABLED === 'true';
const TARGET_LOCAL_NAME = process.env.BLE_TARGET_LOCAL_NAME;
const TARGET_SERVICE_UUID = process.env.BLE_TARGET_SERVICE_UUID;
const TARGET_CHARACTERISTIC_UUID = process.env.BLE_TARGET_CHARACTERISTIC_UUID;

const useBLE = (): void => {
  const { station, stations, selectedDirection } = useRecoilValue(stationState);
  const { headerState, leftStations } = useRecoilValue(navigationState);
  const deviceRef = useRef<Device>();
  const currentLine = useCurrentLine();

  const nextStation = useMemo(() => {
    const actualNextStation = getNextStation(leftStations, station);
    if (selectedDirection === 'INBOUND') {
      return getNextInboundStopStation(stations, actualNextStation, station);
    }
    return getNextOutboundStopStation(stations, actualNextStation, station);
  }, [leftStations, selectedDirection, station, stations]);

  const stateText = useMemo(() => {
    switch (headerState) {
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
      case 'CURRENT_ZH':
      case 'CURRENT_KO':
        return 'Now stopping at';
      case 'NEXT':
      case 'NEXT_EN':
      case 'NEXT_KANA':
      case 'NEXT_ZH':
      case 'NEXT_KO':
        return 'The next stop is';
      case 'ARRIVING':
      case 'ARRIVING_EN':
      case 'ARRIVING_KANA':
      case 'ARRIVING_ZH':
      case 'ARRIVING_KO':
        return 'Soon';
      default:
        return '';
    }
  }, [headerState]);

  const switchedStation = useMemo(() => {
    switch (headerState) {
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
      case 'CURRENT_ZH':
      case 'CURRENT_KO':
        return station;
      default:
        return nextStation;
    }
  }, [headerState, nextStation, station]);

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
