import type { Line, Station, TrainType } from '~/@types/graphql';
import {
  computeCurrentStationInRoutes,
  getStationWithMatchingLine,
} from './routeSearch';

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
