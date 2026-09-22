import type { Line, Station, TrainType } from '~/@types/graphql';
import { TrainTypeKind, TransportType } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import {
  buildRouteTrainTypes,
  buildTransferTrainType,
  type ConnectedRoute,
  computeCurrentStationInRoutes,
  concatLegStations,
  filterRideableRoutes,
  getSearchResultHeadingText,
  getStationWithMatchingLine,
  isTransferRouteTrainType,
  pickInitialRouteTrainType,
  sliceLegStations,
} from './routeSearch';

// 文言そのものは翻訳ファイルの責務なので、
// ここでは「どのキーをどの駅名で引くか」だけを検証できるようにモックする
jest.mock('~/translation', () => ({
  translate: (key: string, params?: Record<string, string>) =>
    params ? `${key}(${params.stationName})` : key,
}));

// テスト用のモックデータ
const createMockLine = (id: number, name: string): Line =>
  ({
    __typename: 'Line',
    id,
    name,
    nameShort: name,
    nameRoman: name,
  }) as unknown as Line;

const createMockStation = (
  id: number,
  name: string,
  line: Line | null,
  lines: Line[] = []
): Station =>
  ({
    __typename: 'Station',
    id,
    groupId: id,
    name,
    nameRoman: name,
    line,
    lines,
  }) as unknown as Station;

const createMockTrainType = (
  id: number,
  name: string,
  line: Line,
  lines: Line[] = []
): TrainType =>
  ({
    __typename: 'TrainType',
    id,
    groupId: id,
    name,
    nameRoman: name,
    line,
    lines,
  }) as unknown as TrainType;

afterEach(() => jest.clearAllMocks());

describe('乗換経路', () => {
  const oedoLine = createMockLine(99301, '都営大江戸線');
  const saikyoLine = createMockLine(11321, '埼京線');
  const yamanoteLine = createMockLine(11302, '山手線');
  const oedoLocal = createMockTrainType(1000099301, '各駅停車', oedoLine);
  const saikyoLocal = createMockTrainType(170, '各駅停車', saikyoLine);
  const saikyoRapid = {
    ...createMockTrainType(171, '快速', saikyoLine),
    kind: TrainTypeKind.Rapid,
  } as TrainType;
  const station = (id: number, groupId: number, name: string, line: Line) =>
    ({ ...createMockStation(id, name, line), groupId }) as Station;

  const hikarigaoka = station(9930138, 9930138, '光が丘', oedoLine);
  const nerima = station(9930135, 2200106, '練馬', oedoLine);
  const tochomae = station(9930100, 1130225, '都庁前', oedoLine);
  const shinjukuOedo = station(9930128, 1130208, '新宿', oedoLine);
  const shinjukuSaikyo = station(1132104, 1130208, '新宿', saikyoLine);
  const shibuya = station(1132103, 1130205, '渋谷', saikyoLine);
  const _osaki = station(1132101, 1130201, '大崎', saikyoLine);

  const transferRoute: ConnectedRoute = {
    legs: [
      {
        trainTypes: [oedoLocal],
        fromStation: hikarigaoka,
        toStation: shinjukuOedo,
      },
      {
        // 快速が先に並んでいても各停を既定にする
        trainTypes: [saikyoRapid, saikyoLocal],
        fromStation: shinjukuSaikyo,
        toStation: shibuya,
      },
    ],
  };
  const directRoute: ConnectedRoute = {
    legs: [
      {
        trainTypes: [saikyoRapid, saikyoLocal],
        fromStation: shinjukuSaikyo,
        toStation: shibuya,
      },
    ],
  };

  describe('filterRideableRoutes', () => {
    it('乗り継げない経路と種別の無い直通経路を除き、順位を保つ', () => {
      const brokenRoute: ConnectedRoute = {
        legs: [
          transferRoute.legs?.[0] ?? { trainTypes: [] },
          { trainTypes: [saikyoLocal], fromStation: shinjukuSaikyo },
        ],
      };
      const emptyDirectRoute: ConnectedRoute = { legs: [{ trainTypes: [] }] };

      expect(
        filterRideableRoutes([
          transferRoute,
          brokenRoute,
          emptyDirectRoute,
          directRoute,
        ])
      ).toEqual([transferRoute, directRoute]);
    });
  });

  describe('sliceLegStations', () => {
    // 大江戸線の系統は光が丘が末尾に来る並び
    const oedoStations = [tochomae, shinjukuOedo, nerima, hikarigaoka];

    it('系統の並びと逆向きの区間は進行順に並べ替えて切り出す', () => {
      expect(
        sliceLegStations(oedoStations, hikarigaoka, shinjukuOedo).map(
          (s) => s.name
        )
      ).toEqual(['光が丘', '練馬', '新宿']);
    });

    it('系統の並びと同じ向きの区間はそのまま切り出す', () => {
      expect(
        sliceLegStations(oedoStations, shinjukuOedo, hikarigaoka).map(
          (s) => s.name
        )
      ).toEqual(['新宿', '練馬', '光が丘']);
    });

    it('環状線は継ぎ目をまたいだほうが短ければ回り込む', () => {
      const yamanote = [
        '大崎',
        '五反田',
        '目黒',
        '恵比寿',
        '渋谷',
        '田町',
        '品川',
      ].map((name, i) => station(i + 1, i + 1, name, yamanoteLine));
      const [osakiY, gotanda, , , , tamachi, shinagawa] = yamanote;

      expect(
        sliceLegStations(yamanote, tamachi, gotanda).map((s) => s.name)
      ).toEqual(['田町', '品川', '大崎', '五反田']);
      expect(
        sliceLegStations(yamanote, gotanda, shinagawa).map((s) => s.name)
      ).toEqual(['五反田', '大崎', '品川']);
      expect(
        sliceLegStations(yamanote, osakiY, gotanda).map((s) => s.name)
      ).toEqual(['大崎', '五反田']);
    });

    describe('同じ駅グループが系統に 2 回出るとき(大江戸線の都庁前)', () => {
      // 都庁前(内回り側) → 新宿 → 都庁前(外回り側) → 練馬 → 光が丘
      const tochomaeInner = station(9930101, 1130225, '都庁前', oedoLine);
      const oedoLoop = [
        tochomaeInner,
        shinjukuOedo,
        tochomae,
        nerima,
        hikarigaoka,
      ];

      it('駅 id が一致すればその位置を使う', () => {
        expect(
          sliceLegStations(oedoLoop, hikarigaoka, tochomaeInner).map(
            (s) => s.id
          )
        ).toEqual([
          hikarigaoka.id,
          nerima.id,
          tochomae.id,
          shinjukuOedo.id,
          tochomaeInner.id,
        ]);
      });

      // 別の路線の都庁前を渡されたとき、先に見つかる内回り側を使うと
      // 環状部を回り込む長い区間になる
      it('駅 id が一致しなければ、もう一方の端に近いほうを使う', () => {
        const tochomaeOnOtherLine = station(1, 1130225, '都庁前', saikyoLine);
        expect(
          sliceLegStations(oedoLoop, hikarigaoka, tochomaeOnOtherLine).map(
            (s) => s.id
          )
        ).toEqual([hikarigaoka.id, nerima.id, tochomae.id]);
      });
    });

    it('乗車駅か降車駅が系統に無ければ空配列を返す', () => {
      expect(sliceLegStations(oedoStations, hikarigaoka, shibuya)).toEqual([]);
    });
  });

  describe('concatLegStations', () => {
    // 乗換駅を前の区間の駅として残すと最後の区間の路線が行き先の 1 駅だけになり、
    // useConnectedLines が直通先から外してヘッダーに「〜線直通」が出なくなる
    it('乗換駅は次の区間の乗車駅だけを残して 1 本につなぐ', () => {
      expect(
        concatLegStations([
          [hikarigaoka, nerima, shinjukuOedo],
          [shinjukuSaikyo, shibuya],
        ]).map((s) => s.id)
      ).toEqual([hikarigaoka.id, nerima.id, shinjukuSaikyo.id, shibuya.id]);
    });
  });

  describe('buildTransferTrainType', () => {
    it('最初の区間の種別を元に、区間ごとの路線を区間の種別つきで並べる', () => {
      const trainType = buildTransferTrainType(transferRoute, -1);

      expect(trainType?.id).toBe(-1);
      expect(trainType?.name).toBe('各駅停車');
      expect(trainType?.groupId).toBe(oedoLocal.groupId);
      expect(trainType?.line?.id).toBe(saikyoLine.id);
      expect(trainType?.lines?.map((l) => [l.id, l.trainType?.name])).toEqual([
        [oedoLine.id, '各駅停車'],
        [saikyoLine.id, '各駅停車'],
      ]);
      expect(isTransferRouteTrainType(trainType)).toBe(true);
      expect(isTransferRouteTrainType(oedoLocal)).toBe(false);
    });
  });

  describe('pickInitialRouteTrainType', () => {
    const pick = (routes: ConnectedRoute[]) => {
      const { trainTypes, transferRouteById } = buildRouteTrainTypes(routes);
      return pickInitialRouteTrainType(routes, trainTypes, transferRouteById);
    };

    it('先頭の経路が乗換のある経路なら、その経路を表す種別を選ぶ', () => {
      expect(pick([transferRoute, directRoute])?.id).toBe(-1);
    });

    it('先頭の経路が直通なら、直通の種別から各停を選ぶ', () => {
      expect(pick([directRoute, transferRoute])?.id).toBe(saikyoLocal.id);
    });

    // 乗換経路を表す種別は最初の区間の種別名(各駅停車)を持つので、除かずに探すと
    // 直通で行けるのに乗換経路が既定になる
    it('直通に各停が無ければ、後ろの乗換経路ではなく直通の先頭の種別を選ぶ', () => {
      const rapidOnlyRoute: ConnectedRoute = {
        legs: [
          {
            trainTypes: [saikyoRapid],
            fromStation: shinjukuSaikyo,
            toStation: shibuya,
          },
        ],
      };
      expect(pick([rapidOnlyRoute, transferRoute])?.id).toBe(saikyoRapid.id);
    });
  });

  describe('buildRouteTrainTypes', () => {
    it('直通経路の種別と乗換経路を順位順に並べ、乗換経路を id から引ける', () => {
      const otherTransferRoute: ConnectedRoute = {
        legs: [
          {
            trainTypes: [oedoLocal],
            fromStation: hikarigaoka,
            toStation: tochomae,
          },
          transferRoute.legs?.[1] ?? { trainTypes: [] },
        ],
      };
      const { trainTypes, transferRouteById } = buildRouteTrainTypes([
        transferRoute,
        directRoute,
        otherTransferRoute,
        directRoute,
      ]);

      expect(trainTypes.map((tt) => tt.id)).toEqual([
        -1,
        saikyoRapid.id,
        saikyoLocal.id,
        -3,
      ]);
      expect(transferRouteById.get(-1)).toBe(transferRoute);
      expect(transferRouteById.get(-3)).toBe(otherTransferRoute);
    });
  });
});

describe('computeCurrentStationInRoutes', () => {
  describe('列車種別がある場合', () => {
    it('列車種別の路線とstationの路線の共通路線を返す', () => {
      // 池袋駅: 西武池袋線、東武東上線、副都心線
      const seibuLine = createMockLine(1, '西武池袋線');
      const tobuLine = createMockLine(2, '東武東上線');
      const fukutoshinLine = createMockLine(3, '副都心線');

      const ikebukuroStation = createMockStation(100, '池袋', seibuLine, [
        seibuLine,
        tobuLine,
        fukutoshinLine,
      ]);

      // 元町・中華街方面への列車種別（西武線経由）
      const trainType = createMockTrainType(1, '急行', seibuLine, [
        seibuLine,
        fukutoshinLine,
      ]);

      const result = computeCurrentStationInRoutes(
        ikebukuroStation,
        fukutoshinLine, // 選択した行き先の路線
        [trainType]
      );

      // 西武池袋線が選択されるべき（列車種別に含まれている）
      expect(result?.line?.id).toBe(seibuLine.id);
    });

    it('東武線経由の列車種別の場合は東武線が選択される', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const tobuLine = createMockLine(2, '東武東上線');
      const fukutoshinLine = createMockLine(3, '副都心線');

      const ikebukuroStation = createMockStation(100, '池袋', seibuLine, [
        seibuLine,
        tobuLine,
        fukutoshinLine,
      ]);

      // 東武線経由の列車種別
      const trainType = createMockTrainType(2, '急行', tobuLine, [
        tobuLine,
        fukutoshinLine,
      ]);

      const result = computeCurrentStationInRoutes(
        ikebukuroStation,
        fukutoshinLine,
        [trainType]
      );

      // 東武東上線が選択されるべき
      expect(result?.line?.id).toBe(tobuLine.id);
    });

    it('共通路線がない場合、pendingLineと同じ路線があればそれを使用', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const unrelatedLine = createMockLine(99, '関係ない路線');

      const station = createMockStation(100, 'テスト駅', seibuLine, [
        seibuLine,
      ]);

      // stationの路線と無関係な列車種別
      const trainType = createMockTrainType(1, '普通', unrelatedLine, [
        unrelatedLine,
      ]);

      const result = computeCurrentStationInRoutes(station, seibuLine, [
        trainType,
      ]);

      // pendingLineと同じ西武池袋線がフォールバックとして使用される
      expect(result?.line?.id).toBe(seibuLine.id);
    });

    it('共通路線もフォールバック路線もない場合、pendingLineをそのまま使用', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const tobuLine = createMockLine(2, '東武東上線');
      const unrelatedLine = createMockLine(99, '関係ない路線');

      const station = createMockStation(100, 'テスト駅', seibuLine, [
        seibuLine,
      ]);

      const trainType = createMockTrainType(1, '普通', unrelatedLine, [
        unrelatedLine,
      ]);

      const result = computeCurrentStationInRoutes(station, tobuLine, [
        trainType,
      ]);

      // tobuLine（pendingLine）がそのまま使用される
      expect(result?.line?.id).toBe(tobuLine.id);
    });
  });

  describe('エッジケース', () => {
    it('stationがnullの場合はnullを返す', () => {
      const line = createMockLine(1, 'テスト路線');
      const trainType = createMockTrainType(1, '普通', line, [line]);

      const result = computeCurrentStationInRoutes(null, line, [trainType]);

      expect(result).toBeNull();
    });

    it('pendingLineがnullの場合はnullを返す', () => {
      const line = createMockLine(1, 'テスト路線');
      const station = createMockStation(100, 'テスト駅', line, [line]);
      const trainType = createMockTrainType(1, '普通', line, [line]);

      const result = computeCurrentStationInRoutes(station, null, [trainType]);

      expect(result).toBeNull();
    });

    it('trainTypesが空の場合、フォールバックロジックが動作する', () => {
      const line = createMockLine(1, 'テスト路線');
      const station = createMockStation(100, 'テスト駅', line, [line]);

      const result = computeCurrentStationInRoutes(station, line, []);

      // stationにpendingLineと同じ路線があるのでそれを使用
      expect(result?.line?.id).toBe(line.id);
    });
  });
});

describe('computeCurrentStationInRoutes - 実際のユースケース', () => {
  describe('新宿→高崎のような異なる路線間の検索', () => {
    it('出発駅と行き先駅の路線が完全に異なる場合、pendingLineをそのまま使用', () => {
      // 新宿駅: 中央線、山手線、小田急線など
      const chuoLine = createMockLine(1, '中央線');
      const yamanoteLine = createMockLine(2, '山手線');
      const odakyuLine = createMockLine(3, '小田急線');

      // 高崎線（新宿駅には存在しない）
      const takasakiLine = createMockLine(10, '高崎線');

      const shinjukuStation = createMockStation(100, '新宿', chuoLine, [
        chuoLine,
        yamanoteLine,
        odakyuLine,
      ]);

      // 高崎線の普通列車種別（新宿駅の路線とは共通なし）
      const trainType = createMockTrainType(1, '普通', takasakiLine, [
        takasakiLine,
      ]);

      const result = computeCurrentStationInRoutes(
        shinjukuStation,
        takasakiLine,
        [trainType]
      );

      // 共通路線がないので、pendingLine（高崎線）がそのまま使用される
      expect(result?.line?.id).toBe(takasakiLine.id);
    });

    it('湘南新宿ラインのように複数路線を経由する場合、共通路線が選択される', () => {
      // 新宿駅に湘南新宿ラインがある場合
      const chuoLine = createMockLine(1, '中央線');
      const shonanShinjukuLine = createMockLine(5, '湘南新宿ライン');
      const takasakiLine = createMockLine(10, '高崎線');

      const shinjukuStation = createMockStation(100, '新宿', chuoLine, [
        chuoLine,
        shonanShinjukuLine,
      ]);

      // 湘南新宿ライン経由の列車種別
      const trainType = createMockTrainType(1, '快速', shonanShinjukuLine, [
        shonanShinjukuLine,
        takasakiLine,
      ]);

      const result = computeCurrentStationInRoutes(
        shinjukuStation,
        takasakiLine,
        [trainType]
      );

      // 湘南新宿ラインが共通路線として選択される
      expect(result?.line?.id).toBe(shonanShinjukuLine.id);
    });
  });

  describe('station.linesが空またはundefinedの場合', () => {
    it('station.linesが空配列の場合、pendingLineを使用', () => {
      const line = createMockLine(1, 'テスト路線');
      const station = createMockStation(100, 'テスト駅', line, []);
      const trainType = createMockTrainType(1, '普通', line, [line]);

      const result = computeCurrentStationInRoutes(station, line, [trainType]);

      expect(result?.line?.id).toBe(line.id);
    });

    it('station.linesがundefinedの場合、pendingLineを使用', () => {
      const line = createMockLine(1, 'テスト路線');
      const station = {
        __typename: 'Station',
        id: 100,
        groupId: 100,
        name: 'テスト駅',
        nameRoman: 'Test',
        line,
        lines: undefined,
      } as unknown as Station;
      const trainType = createMockTrainType(1, '普通', line, [line]);

      const result = computeCurrentStationInRoutes(station, line, [trainType]);

      expect(result?.line?.id).toBe(line.id);
    });
  });

  describe('複数の列車種別がある場合', () => {
    it('最初に見つかった共通路線を選択する', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const tobuLine = createMockLine(2, '東武東上線');
      const fukutoshinLine = createMockLine(3, '副都心線');

      const ikebukuroStation = createMockStation(100, '池袋', seibuLine, [
        seibuLine,
        tobuLine,
        fukutoshinLine,
      ]);

      // 複数の列車種別（西武経由と東武経由）
      const trainType1 = createMockTrainType(1, '急行（西武経由）', seibuLine, [
        seibuLine,
        fukutoshinLine,
      ]);
      const trainType2 = createMockTrainType(2, '急行（東武経由）', tobuLine, [
        tobuLine,
        fukutoshinLine,
      ]);

      // 西武線経由の列車種別のみを渡した場合
      const result = computeCurrentStationInRoutes(
        ikebukuroStation,
        fukutoshinLine,
        [trainType1]
      );

      expect(result?.line?.id).toBe(seibuLine.id);

      // 東武線経由の列車種別のみを渡した場合
      const result2 = computeCurrentStationInRoutes(
        ikebukuroStation,
        fukutoshinLine,
        [trainType2]
      );

      expect(result2?.line?.id).toBe(tobuLine.id);
    });
  });
});

describe('getStationWithMatchingLine', () => {
  describe('列車種別が存在しない場合の処理', () => {
    it('選択した路線と一致する路線を持つ駅を返す', () => {
      // 佐世保駅: 佐世保線、松浦鉄道
      const saseboLine = createMockLine(1, '佐世保線');
      const matsuuraLine = createMockLine(2, '松浦鉄道');

      const saseboStation = createMockStation(100, '佐世保', saseboLine, [
        saseboLine,
        matsuuraLine,
      ]);

      // たびら平戸口駅の路線（松浦鉄道）を選択
      const result = getStationWithMatchingLine(saseboStation, matsuuraLine);

      // 佐世保駅の路線が松浦鉄道に更新される
      expect(result?.line?.id).toBe(matsuuraLine.id);
    });

    it('一致する路線がない場合は元の駅をそのまま返す', () => {
      const saseboLine = createMockLine(1, '佐世保線');
      const unrelatedLine = createMockLine(99, '関係ない路線');

      const saseboStation = createMockStation(100, '佐世保', saseboLine, [
        saseboLine,
      ]);

      const result = getStationWithMatchingLine(saseboStation, unrelatedLine);

      // 元の佐世保線のまま
      expect(result?.line?.id).toBe(saseboLine.id);
    });
  });

  describe('エッジケース', () => {
    it('stationがnullの場合はnullを返す', () => {
      const line = createMockLine(1, 'テスト路線');

      const result = getStationWithMatchingLine(null, line);

      expect(result).toBeNull();
    });

    it('selectedLineがnullの場合はnullを返す', () => {
      const line = createMockLine(1, 'テスト路線');
      const station = createMockStation(100, 'テスト駅', line, [line]);

      const result = getStationWithMatchingLine(station, null);

      expect(result).toBeNull();
    });
  });
});

describe('getSearchResultHeadingText', () => {
  it('鉄道駅では駅名入りの見出しを返す', () => {
    const station = createStation(1, {
      name: '東京',
      nameRoman: 'Tokyo',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, true)).toBe(
      'searchResultFromStation(東京)'
    );
  });

  it('バス停では駅ではなくバス停用の見出しを返す', () => {
    const station = createStation(1, {
      name: '東京駅丸の内南口',
      nameRoman: 'Tokyo Sta. Marunouchi South Exit',
      line: { transportType: TransportType.Bus },
    });

    expect(getSearchResultHeadingText(station, true)).toBe(
      'searchResultFromBusStop(東京駅丸の内南口)'
    );
  });

  it('英語ロケールではnameRomanを使う', () => {
    const station = createStation(1, {
      name: '東京',
      nameRoman: 'Tokyo',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, false)).toBe(
      'searchResultFromStation(Tokyo)'
    );
  });

  it('全角括弧の駅名も見出しから補足を省く', () => {
    // 駅 API は `電鉄富山（トヨタモビリティ富山）` のような全角括弧を返す (#1175)
    const station = createStation(1, {
      name: '電鉄富山（トヨタモビリティ富山）',
      nameRoman: 'Dentetsu-Toyama（Toyota Mobility）',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, true)).toBe(
      'searchResultFromStation(電鉄富山)'
    );
    expect(getSearchResultHeadingText(station, false)).toBe(
      'searchResultFromStation(Dentetsu-Toyama)'
    );
  });

  it('半角括弧と全角括弧が混在する駅名でも両方を省く', () => {
    const station = createStation(1, {
      name: '東京(メトロ)（副都心）',
      nameRoman: 'Tokyo (Metro)（Fukutoshin）',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, true)).toBe(
      'searchResultFromStation(東京)'
    );
    expect(getSearchResultHeadingText(station, false)).toBe(
      'searchResultFromStation(Tokyo)'
    );
  });

  it('括弧書きの前に空白がある駅名でも余分な空白を残さない', () => {
    const station = createStation(1, {
      name: '東京 (メトロ)',
      nameRoman: 'Tokyo (Metro)',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, true)).toBe(
      'searchResultFromStation(東京)'
    );
    expect(getSearchResultHeadingText(station, false)).toBe(
      'searchResultFromStation(Tokyo)'
    );
  });

  it('括弧書きが語間にある駅名でも空白が二重にならない', () => {
    const station = createStation(1, {
      name: '東京 (メトロ) 前',
      nameRoman: 'Tokyo (Metro) Station',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, true)).toBe(
      'searchResultFromStation(東京 前)'
    );
    expect(getSearchResultHeadingText(station, false)).toBe(
      'searchResultFromStation(Tokyo Station)'
    );
  });

  it('語間の単一空白を持つ駅名は空白を保持する', () => {
    const station = createStation(1, {
      name: '東京駅丸の内南口',
      nameRoman: 'Tokyo Sta. Marunouchi South Exit',
      line: { transportType: TransportType.Bus },
    });

    expect(getSearchResultHeadingText(station, false)).toBe(
      'searchResultFromBusStop(Tokyo Sta. Marunouchi South Exit)'
    );
  });

  it('括弧書きを除くと空白だけになる駅名は駅名なしの見出しを返す', () => {
    const station = createStation(1, {
      name: ' (メトロ)',
      nameRoman: ' (Metro)',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, true)).toBe('searchResult');
    expect(getSearchResultHeadingText(station, false)).toBe('searchResult');
  });

  it('駅名の括弧書きは見出しから省く', () => {
    const station = createStation(1, {
      name: '東京(メトロ)',
      nameRoman: 'Tokyo(Metro)',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, true)).toBe(
      'searchResultFromStation(東京)'
    );
    expect(getSearchResultHeadingText(station, false)).toBe(
      'searchResultFromStation(Tokyo)'
    );
  });

  it('最寄り駅が未確定の場合は駅名なしの見出しを返す', () => {
    expect(getSearchResultHeadingText(null, true)).toBe('searchResult');
  });

  it('駅名が空の場合は駅名なしの見出しを返す', () => {
    const station = createStation(1, {
      name: '',
      nameRoman: '',
      line: { transportType: TransportType.Rail },
    });

    expect(getSearchResultHeadingText(station, true)).toBe('searchResult');
  });
});

describe('経路検索見出しの翻訳キー', () => {
  it('見出しで参照するキーが日英どちらの翻訳にも存在する', () => {
    const ja = require('../../assets/translations/ja.json');
    const en = require('../../assets/translations/en.json');

    for (const key of [
      'searchResult',
      'searchResultFromStation',
      'searchResultFromBusStop',
    ]) {
      expect(typeof ja[key]).toBe('string');
      expect(typeof en[key]).toBe('string');
    }
  });
});
