import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants/regexp';

// LineBoard.tsx が描画する駅数と同じ。受信側には LineBoard と同じ並びを送る。
export const BLE_LINE_BOARD_STATION_COUNT = 8;

export type BleTextMessage = { type: 'text'; text: string };

export type BleStationMessage = {
  type: 'station';
  index: number;
  total: number;
  name: string;
  kana: string;
  roman: string;
  number: string;
};

// 駅一覧の送り始め。受信側はここで一覧を空にしてから station を index 順に並べる。
// 駅が無くなったとき(total=0)も、これだけ送れば表示を消せる。
export type BleStationsHeaderMessage = { type: 'stations'; total: number };

export type BleMessage =
  | BleTextMessage
  | BleStationsHeaderMessage
  | BleStationMessage;

export const buildTextMessage = (text: string): BleTextMessage => ({
  type: 'text',
  text,
});

// 1回の書き込み上限(512バイト)を超えないよう、駅は1駅1通で送る。
// 先頭に stations ヘッダーを置き、続けて station を index 順に並べる。
export const buildStationMessages = (
  leftStations: Station[],
  isBus: boolean,
  getStationNumber: (station: Station) => string | undefined
): [BleStationsHeaderMessage, ...BleStationMessage[]] => {
  const stations = leftStations.slice(0, BLE_LINE_BOARD_STATION_COUNT);
  // LineBoard と同じく、バス路線は駅名と英語名から括弧書きを外す
  const strip = (value?: string | null) =>
    (isBus ? value?.replace(parenthesisRegexp, '') : value) ?? '';
  return [
    { type: 'stations', total: stations.length },
    ...stations.map(
      (station, index): BleStationMessage => ({
        type: 'station',
        index,
        total: stations.length,
        name: strip(station.name),
        kana: station.nameKatakana ?? '',
        roman: strip(station.nameRoman),
        number: getStationNumber(station) ?? '',
      })
    ),
  ];
};

// react-native-ble-plx は base64 で値を受け取るため、UTF-8 のバイト列にしてから変換する
export const encodeBleMessage = (message: BleMessage): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(message))));
