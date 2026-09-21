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
import { leftStationsAtom } from '../store/atoms/navigation';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
} from '../store/atoms/station';
import {
  type BleMessage,
  buildStationMessages,
  buildTextMessage,
  encodeBleMessage,
} from '../utils/blePayload';
import { isBusLine } from '../utils/line';
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
  // LineBoard に表示中の駅と同じ並び
  const leftStations = useAtomValue(leftStationsAtom);
  const [device, setDevice] = useState<Device | null>(null);

  const station = useCurrentStation();
  // まもなく表示時は現在地基準で実際に接近している駅をBLEへ送る(ヘッダー/TTS/ウォッチと同基準)
  const nextStation = useDisplayNextStation();
  const isPassing = useIsPassing();
  const trainType = useCurrentTrainType();
  const getStationNumberIndex = useStationNumberIndexFunc();

  // 送信済みの内容は接続先ごとに持つ。接続前や再接続後に同じ内容を「送信済み」と
  // 見なして送り損ねないよう、device が変わったら捨てる。
  const sentRef = useRef<{
    device: Device | null;
    text: string;
    stations: string | null;
  }>({ device: null, text: '', stations: null });
  // 書き込みは1本の列に並べ、テキストと駅一覧の各通が混ざらないようにする
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

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

  const stationMessages = useMemo(
    () =>
      buildStationMessages(
        leftStations,
        isBusLine(station?.line),
        (sta) =>
          sta.stationNumbers?.[getStationNumberIndex(sta)]?.stationNumber ??
          undefined
      ),
    [leftStations, station?.line, getStationNumberIndex]
  );
  const stationMessagesKey = useMemo(
    () => JSON.stringify(stationMessages),
    [stationMessages]
  );

  const enqueueWrite = useCallback(
    (target: Device, messages: BleMessage[]): Promise<void> => {
      const run = writeQueueRef.current.then(async () => {
        for (const message of messages) {
          await target.writeCharacteristicWithResponseForService(
            BLE_TARGET_SERVICE_UUID,
            BLE_TARGET_CHARACTERISTIC_UUID,
            encodeBleMessage(message)
          );
        }
      });
      // 1件の失敗で後続の書き込みが止まらないよう、列には失敗を流さない
      writeQueueRef.current = run.catch(() => undefined);
      return run;
    },
    []
  );

  const isSendable =
    BLE_ENABLED &&
    !!BLE_TARGET_SERVICE_UUID &&
    !!BLE_TARGET_CHARACTERISTIC_UUID;

  const resolveSent = useCallback((target: Device) => {
    if (sentRef.current.device !== target) {
      sentRef.current = { device: target, text: '', stations: null };
    }
    return sentRef.current;
  }, []);

  useEffect(() => {
    if (!isSendable || !device) {
      return;
    }
    const sent = resolveSent(device);
    if (sent.text === stationText) {
      return;
    }
    sent.text = stationText;
    enqueueWrite(device, [buildTextMessage(stationText)]).catch((err) => {
      console.warn(err);
      // 失敗した内容は次の変化で送り直す
      if (sentRef.current === sent && sent.text === stationText) {
        sent.text = '';
      }
    });
  }, [device, stationText, isSendable, resolveSent, enqueueWrite]);

  useEffect(() => {
    if (!isSendable || !device) {
      return;
    }
    const sent = resolveSent(device);
    if (sent.stations === stationMessagesKey) {
      return;
    }
    sent.stations = stationMessagesKey;
    enqueueWrite(device, stationMessages).catch((err) => {
      console.warn(err);
      if (sentRef.current === sent && sent.stations === stationMessagesKey) {
        sent.stations = null;
      }
    });
  }, [
    device,
    stationMessages,
    stationMessagesKey,
    isSendable,
    resolveSent,
    enqueueWrite,
  ]);

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect();
    }
  }, [scanAndConnect]);
};
