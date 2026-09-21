import { type Station, StopCondition } from '~/@types/graphql';
import {
  BLE_LINE_BOARD_STATION_COUNT,
  buildStationMessages,
  buildTextMessage,
  encodeBleMessage,
} from './blePayload';

const makeStation = (id: number, overrides: Partial<Station> = {}): Station =>
  ({
    id,
    groupId: id,
    name: `駅${id}`,
    nameKatakana: `エキ${id}`,
    nameRoman: `Station ${id}`,
    ...overrides,
  }) as Station;

const decode = (encoded: string): unknown =>
  JSON.parse(decodeURIComponent(escape(atob(encoded))));

const byteLength = (encoded: string): number => atob(encoded).length;

// ATT の1回の書き込み上限。これを超えると long write でも送れない
const BLE_MAX_WRITE_BYTES = 512;

describe('blePayload', () => {
  it('テキストは種別の色と一緒に type 付きの JSON で送る', () => {
    expect(
      decode(encodeBleMessage(buildTextMessage('次は新宿', '#1f63c6')))
    ).toEqual({
      type: 'text',
      text: '次は新宿',
      trainTypeColor: '#1f63c6',
    });
  });

  it('種別が無ければ色は空文字で送る', () => {
    expect(buildTextMessage('次は新宿', null).trainTypeColor).toBe('');
    expect(buildTextMessage('次は新宿').trainTypeColor).toBe('');
  });

  it('駅一覧はヘッダーに続けて1駅1通で並べる', () => {
    const messages = buildStationMessages(
      [makeStation(1), makeStation(2)],
      false,
      (s) => `JY${s.id}`
    );
    expect(messages).toEqual([
      { type: 'stations', total: 2 },
      {
        type: 'station',
        index: 0,
        total: 2,
        name: '駅1',
        kana: 'えき1',
        roman: 'Station 1',
        number: 'JY1',
        pass: false,
      },
      {
        type: 'station',
        index: 1,
        total: 2,
        name: '駅2',
        kana: 'えき2',
        roman: 'Station 2',
        number: 'JY2',
        pass: false,
      },
    ]);
  });

  it('LineBoard と同じく先頭8駅だけを送る', () => {
    const stations = Array.from({ length: 12 }, (_, i) => makeStation(i + 1));
    const messages = buildStationMessages(stations, false, () => undefined);
    expect(messages[0]).toEqual({
      type: 'stations',
      total: BLE_LINE_BOARD_STATION_COUNT,
    });
    expect(messages).toHaveLength(BLE_LINE_BOARD_STATION_COUNT + 1);
  });

  it('駅が無いときもヘッダーだけ送って受信側の表示を消せる', () => {
    expect(buildStationMessages([], false, () => undefined)).toEqual([
      { type: 'stations', total: 0 },
    ]);
  });

  it('バス路線は駅名と英語名の括弧書きを外す', () => {
    const [, message] = buildStationMessages(
      [
        makeStation(1, {
          name: '新宿駅西口(都庁前)',
          nameKatakana: 'シンジュクエキニシグチ',
          nameRoman: 'Shinjuku Sta. West Exit (Tochomae)',
        }),
      ],
      true,
      () => undefined
    );
    expect(message).toMatchObject({
      name: '新宿駅西口',
      kana: 'しんじゅくえきにしぐち',
      // LineBoard と同じ正規表現なので、括弧の前の空白は画面と同じく残る
      roman: 'Shinjuku Sta. West Exit ',
    });
  });

  it('カナはひらがなにして送り、長音符はそのまま残す', () => {
    const [, message] = buildStationMessages(
      [makeStation(1, { nameKatakana: 'ケイバジョウマエ・センター' })],
      false,
      () => undefined
    );
    expect(message).toMatchObject({ kana: 'けいばじょうまえ・せんたー' });
  });

  it('通過駅は LineBoard と同じ判定で pass を立てる', () => {
    const [, stop, pass] = buildStationMessages(
      [
        makeStation(1, { stopCondition: StopCondition.All }),
        makeStation(2, { stopCondition: StopCondition.Not }),
      ],
      false,
      () => undefined
    );
    expect(stop).toMatchObject({ pass: false });
    expect(pass).toMatchObject({ pass: true });
  });

  it('欠けた項目は空文字で送る', () => {
    const [, message] = buildStationMessages(
      [makeStation(1, { name: null, nameKatakana: null, nameRoman: null })],
      false,
      () => undefined
    );
    expect(message).toMatchObject({
      name: '',
      kana: '',
      roman: '',
      number: '',
    });
  });

  it('長い駅名でも1通が書き込み上限に収まる', () => {
    const [, message] = buildStationMessages(
      [
        makeStation(1, {
          name: '南阿蘇水の生まれる里白水高原',
          nameKatakana: 'ミナミアソミズノウマレルサトハクスイコウゲン',
          nameRoman: 'Minami-Aso Mizu-no-Umareru-Sato Hakusui Kogen',
        }),
      ],
      false,
      () => 'MA99'
    );
    expect(byteLength(encodeBleMessage(message))).toBeLessThan(
      BLE_MAX_WRITE_BYTES
    );
  });
});
