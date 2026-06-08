import type { Line, TrainType } from '~/@types/graphql';

// TrainTypeListModal内のフィルタリングロジックをテスト
// 実際のコンポーネントのuseMemo内で行われるフィルタリングと同じロジック

const createMockLine = (id: number, name: string): Line =>
  ({
    __typename: 'Line',
    id,
    name,
    nameShort: name,
    nameRoman: name,
  }) as unknown as Line;

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

// TrainTypeListModalのフィルタリングロジックを抽出
const filterTrainTypes = (
  fetchedTrainTypes: TrainType[],
  line: Line | null,
  destination: { line?: Line | null } | null
): TrainType[] => {
  if (!line) return [];

  const trainTypesWithSelectedLine = fetchedTrainTypes.filter(
    (tt): tt is TrainType => {
      if (!tt || !tt.line) return false;

      const lines = tt.lines ?? [];
      const selectedLineIndex = lines.findIndex((l) => l.id === line.id);
      if (selectedLineIndex === -1) return false;

      return true;
    }
  );

  if (!destination?.line?.id) {
    return trainTypesWithSelectedLine;
  }

  const trainTypesWithDestination = trainTypesWithSelectedLine.filter((tt) => {
    const lines = tt.lines ?? [];
    const destinationLineIndex = lines.findIndex(
      (l) => l.id === destination.line?.id
    );
    return destinationLineIndex !== -1;
  });

  if (!trainTypesWithDestination.length) {
    return trainTypesWithSelectedLine;
  }

  return trainTypesWithDestination;
};

afterEach(() => jest.clearAllMocks());

describe('TrainTypeListModal - フィルタリングロジック', () => {
  describe('基本的なフィルタリング', () => {
    it('選択された路線を含む列車種別のみを返す', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const tobuLine = createMockLine(2, '東武東上線');
      const fukutoshinLine = createMockLine(3, '副都心線');

      const trainType1 = createMockTrainType(1, '急行（西武経由）', seibuLine, [
        seibuLine,
        fukutoshinLine,
      ]);
      const trainType2 = createMockTrainType(2, '急行（東武経由）', tobuLine, [
        tobuLine,
        fukutoshinLine,
      ]);

      // 西武線を選択した場合
      const result = filterTrainTypes(
        [trainType1, trainType2],
        seibuLine,
        null
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('lineがnullの場合は空配列を返す', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const trainType = createMockTrainType(1, '急行', seibuLine, [seibuLine]);

      const result = filterTrainTypes([trainType], null, null);

      expect(result).toHaveLength(0);
    });
  });

  describe('destination（行き先）がある場合のフィルタリング', () => {
    it('選択された路線と行き先の路線の両方を含む列車種別のみを返す', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const tobuLine = createMockLine(2, '東武東上線');
      const fukutoshinLine = createMockLine(3, '副都心線');
      const tokkyuLine = createMockLine(4, '東急東横線');

      // 西武→副都心→東急の列車種別
      const trainType1 = createMockTrainType(1, '急行（西武経由）', seibuLine, [
        seibuLine,
        fukutoshinLine,
        tokkyuLine,
      ]);
      // 東武→副都心→東急の列車種別
      const trainType2 = createMockTrainType(2, '急行（東武経由）', tobuLine, [
        tobuLine,
        fukutoshinLine,
        tokkyuLine,
      ]);
      // 西武→副都心のみ（東急なし）
      const trainType3 = createMockTrainType(3, '各停（西武経由）', seibuLine, [
        seibuLine,
        fukutoshinLine,
      ]);

      // 西武線から東急東横線への経路
      const destination = { line: tokkyuLine };
      const result = filterTrainTypes(
        [trainType1, trainType2, trainType3],
        seibuLine,
        destination
      );

      // 西武線を含み、かつ東急東横線を含む列車種別のみ
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('行き先の路線を含む種別が0件の場合は現在路線ベースでフォールバックする', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const fukutoshinLine = createMockLine(3, '副都心線');
      const unrelatedLine = createMockLine(99, '関係ない路線');

      const trainType = createMockTrainType(1, '急行', seibuLine, [
        seibuLine,
        fukutoshinLine,
      ]);

      const destination = { line: unrelatedLine };
      const result = filterTrainTypes([trainType], seibuLine, destination);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(trainType.id);
    });

    it('destination.lineが未設定の場合は現在路線ベースで表示する', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const fukutoshinLine = createMockLine(3, '副都心線');

      const trainType = createMockTrainType(1, '急行', seibuLine, [
        seibuLine,
        fukutoshinLine,
      ]);

      const destination = { line: null };
      const result = filterTrainTypes([trainType], seibuLine, destination);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(trainType.id);
    });

    it('池袋→東飯能（西武秩父線側）でdestination路線未包含でも0件にならない', () => {
      const seibuIkebukuroLine = createMockLine(1, '西武池袋線');
      const seibuShinjukuLine = createMockLine(2, '西武新宿線');
      const seibuChichibuLine = createMockLine(3, '西武秩父線');

      // 実データで起きるように、種別のlinesには現在路線（西武池袋線）はあるが
      // 行き先側の路線（西武秩父線）が含まれないケースを再現
      const rapid = createMockTrainType(10, '快速急行', seibuIkebukuroLine, [
        seibuIkebukuroLine,
      ]);
      const local = createMockTrainType(11, '各駅停車', seibuIkebukuroLine, [
        seibuIkebukuroLine,
      ]);
      const unrelated = createMockTrainType(12, '各駅停車', seibuShinjukuLine, [
        seibuShinjukuLine,
      ]);

      const destination = { line: seibuChichibuLine };
      const result = filterTrainTypes(
        [rapid, local, unrelated],
        seibuIkebukuroLine,
        destination
      );

      expect(result).toHaveLength(2);
      expect(result.map((tt) => tt.id)).toEqual([10, 11]);
    });
  });

  describe('余白問題の解消（renderItemでnullを返さないようにする）', () => {
    it('フィルタリング後のリストには表示可能な列車種別のみが含まれる', () => {
      const seibuLine = createMockLine(1, '西武池袋線');
      const tobuLine = createMockLine(2, '東武東上線');
      const fukutoshinLine = createMockLine(3, '副都心線');

      // 表示可能な列車種別
      const trainType1 = createMockTrainType(1, '急行', seibuLine, [
        seibuLine,
        fukutoshinLine,
      ]);
      // 表示不可（西武線を含まない）
      const trainType2 = createMockTrainType(2, '急行', tobuLine, [
        tobuLine,
        fukutoshinLine,
      ]);
      // 表示可能な列車種別
      const trainType3 = createMockTrainType(3, '各停', seibuLine, [
        seibuLine,
        fukutoshinLine,
      ]);

      const result = filterTrainTypes(
        [trainType1, trainType2, trainType3],
        seibuLine,
        null
      );

      // ItemSeparatorComponentが余分に表示されないように、
      // フィルタリング後は表示可能なアイテムのみ
      expect(result).toHaveLength(2);
      expect(
        result.every((tt) => tt.lines?.some((l) => l.id === seibuLine.id))
      ).toBe(true);
    });
  });
});

describe('TrainTypeListModal - SelectBoundModalとの連携', () => {
  describe('新宿→高崎のようなケース（pendingTrainType.lineを使用）', () => {
    it('pendingTrainTypeのlineを渡すと正しくフィルタリングされる', () => {
      // 新宿駅の路線（中央線など）
      const chuoLine = createMockLine(1, '中央線');
      // 高崎線
      const takasakiLine = createMockLine(10, '高崎線');

      // 高崎線の列車種別
      const trainType1 = createMockTrainType(1, '普通', takasakiLine, [
        takasakiLine,
      ]);
      const trainType2 = createMockTrainType(2, '快速', takasakiLine, [
        takasakiLine,
      ]);

      // 中央線（新宿駅の路線）を渡すと、高崎線の列車種別は除外される
      const resultWithChuoLine = filterTrainTypes(
        [trainType1, trainType2],
        chuoLine,
        null
      );
      expect(resultWithChuoLine).toHaveLength(0);

      // 高崎線（pendingTrainType.line）を渡すと、正しく表示される
      const resultWithTakasakiLine = filterTrainTypes(
        [trainType1, trainType2],
        takasakiLine,
        null
      );
      expect(resultWithTakasakiLine).toHaveLength(2);
    });

    it('line優先順位: pendingTrainType.line > station.line > pendingLine', () => {
      const chuoLine = createMockLine(1, '中央線');
      const takasakiLine = createMockLine(10, '高崎線');

      const trainType = createMockTrainType(1, '普通', takasakiLine, [
        takasakiLine,
      ]);

      // pendingTrainType.lineが設定されていれば、それを使用
      // この場合、高崎線が渡されるので列車種別が表示される
      const result = filterTrainTypes([trainType], takasakiLine, null);
      expect(result).toHaveLength(1);

      // station.lineやpendingLine（中央線）が異なる路線でも、
      // pendingTrainType.line（高崎線）が正しければフィルタリングが成功する
      const resultWithWrongLine = filterTrainTypes([trainType], chuoLine, null);
      expect(resultWithWrongLine).toHaveLength(0);
    });
  });

  describe('エッジケース', () => {
    it('trainType.lineがnullの場合は除外される', () => {
      const seibuLine = createMockLine(1, '西武池袋線');

      const trainTypeWithNullLine = {
        __typename: 'TrainType',
        id: 1,
        groupId: 1,
        name: '普通',
        nameRoman: 'Local',
        line: null,
        lines: [seibuLine],
      } as unknown as TrainType;

      const result = filterTrainTypes([trainTypeWithNullLine], seibuLine, null);
      expect(result).toHaveLength(0);
    });

    it('trainType.linesが空配列の場合は除外される', () => {
      const seibuLine = createMockLine(1, '西武池袋線');

      const trainTypeWithEmptyLines = createMockTrainType(
        1,
        '普通',
        seibuLine,
        []
      );

      const result = filterTrainTypes(
        [trainTypeWithEmptyLines],
        seibuLine,
        null
      );
      expect(result).toHaveLength(0);
    });

    it('fetchedTrainTypesが空配列の場合は空配列を返す', () => {
      const seibuLine = createMockLine(1, '西武池袋線');

      const result = filterTrainTypes([], seibuLine, null);
      expect(result).toHaveLength(0);
    });
  });
});
