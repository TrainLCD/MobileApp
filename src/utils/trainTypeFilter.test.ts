import type { Line, TrainType } from '~/@types/graphql';
import {
  buildTrainTypeFilterOptions,
  EMPTY_TRAIN_TYPE_FILTER,
  filterTrainTypeRows,
  isTrainTypeFilterActive,
  toggleTrainTypeFilterValue,
} from './trainTypeFilter';
import { buildTrainTypeRow, type TrainTypeRow } from './trainTypeList';

afterEach(() => jest.clearAllMocks());

const createLine = (id: number, nameShort: string, nameRoman: string): Line =>
  ({
    __typename: 'Line',
    id,
    nameShort,
    nameRoman,
  }) as unknown as Line;

// 渋谷駅・東急東横線。同名種別が直通先違いで並ぶ、実際に探しづらいケース
const toyoko = createLine(1, '東急東横線', 'Tokyu Toyoko Line');
const fukutoshin = createLine(2, '東京メトロ副都心線', 'Fukutoshin Line');
const tojo = createLine(3, '東武東上線', 'Tobu Tojo Line');
const minatomirai = createLine(4, 'みなとみらい線', 'Minatomirai Line');
const seibu = createLine(5, '西武池袋線', 'Seibu Ikebukuro Line');

const createTrainType = (
  id: number,
  name: string,
  nameRoman: string,
  lines: Line[]
): TrainType =>
  ({
    __typename: 'TrainType',
    id,
    typeId: id,
    groupId: id,
    name,
    nameRoman,
    lines,
  }) as unknown as TrainType;

const buildRows = (): TrainTypeRow[] =>
  [
    createTrainType(1, '各駅停車', 'Local', [toyoko, minatomirai]),
    createTrainType(2, '急行', 'Express', [toyoko, fukutoshin, tojo]),
    createTrainType(3, '急行', 'Express', [toyoko, minatomirai]),
    createTrainType(4, '特急', 'Limited Express', [toyoko, fukutoshin, tojo]),
  ].map((tt) => buildTrainTypeRow(tt, toyoko, null, null, true));

describe('buildTrainTypeFilterOptions', () => {
  it('種別名は一覧の初出順で重複なく並ぶ', () => {
    const options = buildTrainTypeFilterOptions(buildRows(), true);

    expect(options.typeNames.map((o) => o.value)).toEqual([
      '各駅停車',
      '急行',
      '特急',
    ]);
  });

  it('路線は経由路線から初出順で重複なく並ぶ', () => {
    const options = buildTrainTypeFilterOptions(buildRows(), true);

    expect(options.lines).toEqual([
      { value: minatomirai.id, label: 'みなとみらい線' },
      { value: fukutoshin.id, label: '東京メトロ副都心線' },
      { value: tojo.id, label: '東武東上線' },
    ]);
  });

  it('乗車路線自身は選択肢に出さない', () => {
    const options = buildTrainTypeFilterOptions(buildRows(), true);

    expect(options.lines.some((o) => o.value === toyoko.id)).toBe(false);
  });

  it('英語表示では路線名のローマ字表記を使う', () => {
    const options = buildTrainTypeFilterOptions(buildRows(), false);

    expect(options.lines.map((o) => o.label)).toEqual([
      'Minatomirai Line',
      'Fukutoshin Line',
      'Tobu Tojo Line',
    ]);
  });
});

describe('filterTrainTypeRows', () => {
  it('条件が空なら全件返す', () => {
    const rows = buildRows();

    expect(filterTrainTypeRows(rows, EMPTY_TRAIN_TYPE_FILTER)).toHaveLength(4);
  });

  it('種別名は同名の別ルートをまとめて拾う', () => {
    const rows = buildRows();

    const result = filterTrainTypeRows(rows, {
      ...EMPTY_TRAIN_TYPE_FILTER,
      typeNames: ['急行'],
    });

    expect(result.map((r) => r.trainType.id)).toEqual([2, 3]);
  });

  it('種別の複数選択は OR で効く', () => {
    const rows = buildRows();

    const result = filterTrainTypeRows(rows, {
      ...EMPTY_TRAIN_TYPE_FILTER,
      typeNames: ['各駅停車', '特急'],
    });

    expect(result.map((r) => r.trainType.id)).toEqual([1, 4]);
  });

  it('路線は経由・直通先で絞り込める', () => {
    const rows = buildRows();

    const result = filterTrainTypeRows(rows, {
      ...EMPTY_TRAIN_TYPE_FILTER,
      lineIds: [tojo.id as number],
    });

    expect(result.map((r) => r.trainType.id)).toEqual([2, 4]);
  });

  it('軸をまたぐ選択は AND で効く', () => {
    const rows = buildRows();

    const result = filterTrainTypeRows(rows, {
      ...EMPTY_TRAIN_TYPE_FILTER,
      typeNames: ['急行'],
      lineIds: [tojo.id as number],
    });

    expect(result.map((r) => r.trainType.id)).toEqual([2]);
  });

  it('フリーワードは種別名にも路線名にも当たる', () => {
    const rows = buildRows();

    expect(
      filterTrainTypeRows(rows, {
        ...EMPTY_TRAIN_TYPE_FILTER,
        query: '東上',
      }).map((r) => r.trainType.id)
    ).toEqual([2, 4]);

    expect(
      filterTrainTypeRows(rows, {
        ...EMPTY_TRAIN_TYPE_FILTER,
        query: '各駅',
      }).map((r) => r.trainType.id)
    ).toEqual([1]);
  });

  it('フリーワードは表示言語と逆の種別名でも引ける', () => {
    const rows = buildRows();

    const result = filterTrainTypeRows(rows, {
      ...EMPTY_TRAIN_TYPE_FILTER,
      query: 'express',
    });

    expect(result.map((r) => r.trainType.id)).toEqual([2, 3, 4]);
  });

  it('フリーワードは全角英数・大文字小文字・前後の空白を吸収する', () => {
    const rows = buildRows();

    const result = filterTrainTypeRows(rows, {
      ...EMPTY_TRAIN_TYPE_FILTER,
      query: '  ＬＯＣＡＬ ',
    });

    expect(result.map((r) => r.trainType.id)).toEqual([1]);
  });

  it('一致しない条件では空になる', () => {
    const rows = buildRows();

    const result = filterTrainTypeRows(rows, {
      ...EMPTY_TRAIN_TYPE_FILTER,
      typeNames: ['各駅停車'],
      lineIds: [tojo.id as number],
    });

    expect(result).toEqual([]);
  });
});

describe('isTrainTypeFilterActive', () => {
  it('空の条件は非適用', () => {
    expect(isTrainTypeFilterActive(EMPTY_TRAIN_TYPE_FILTER)).toBe(false);
  });

  it('空白だけのフリーワードは非適用', () => {
    expect(
      isTrainTypeFilterActive({ ...EMPTY_TRAIN_TYPE_FILTER, query: '   ' })
    ).toBe(false);
  });

  it('いずれかの軸が選択されていれば適用中', () => {
    expect(
      isTrainTypeFilterActive({ ...EMPTY_TRAIN_TYPE_FILTER, lineIds: [3] })
    ).toBe(true);
  });
});

describe('toggleTrainTypeFilterValue', () => {
  it('未選択なら末尾に足す', () => {
    expect(toggleTrainTypeFilterValue(['急行'], '特急')).toEqual([
      '急行',
      '特急',
    ]);
  });

  it('選択済みなら外す', () => {
    expect(toggleTrainTypeFilterValue(['急行', '特急'], '急行')).toEqual([
      '特急',
    ]);
  });
});

describe('filterTrainTypeRows - 路線の複数選択', () => {
  // 1 本の列車が東上線/池袋線から副都心線・東横線を経てみなとみらい線まで走り抜ける。
  // 経由路線が端から端まで数珠つなぎになるのがこのドメインの特徴
  const buildThroughRows = (): TrainTypeRow[] =>
    [
      createTrainType(11, '通勤特急', 'Commuter Ltd.Exp', [
        minatomirai,
        toyoko,
        fukutoshin,
        tojo,
      ]),
      createTrainType(12, '通勤特急', 'Commuter Ltd.Exp', [
        minatomirai,
        toyoko,
        fukutoshin,
        seibu,
      ]),
      createTrainType(13, '各駅停車', 'Local', [toyoko, minatomirai]),
    ].map((tt) => buildTrainTypeRow(tt, toyoko, null, null, true));

  it('単一選択はその路線を通る列車をすべて拾う', () => {
    const result = filterTrainTypeRows(buildThroughRows(), {
      ...EMPTY_TRAIN_TYPE_FILTER,
      lineIds: [minatomirai.id as number],
    });

    expect(result.map((r) => r.trainType.id)).toEqual([11, 12, 13]);
  });

  it('複数選択は選んだすべてを通る列車だけに絞る', () => {
    const result = filterTrainTypeRows(buildThroughRows(), {
      ...EMPTY_TRAIN_TYPE_FILTER,
      lineIds: [minatomirai.id as number, seibu.id as number],
    });

    // みなとみらい線側だけ一致する東武東上線直通(11)を巻き込まない
    expect(result.map((r) => r.trainType.id)).toEqual([12]);
  });

  it('両立しない路線を選ぶと 0 件になる', () => {
    const result = filterTrainTypeRows(buildThroughRows(), {
      ...EMPTY_TRAIN_TYPE_FILTER,
      lineIds: [tojo.id as number, seibu.id as number],
    });

    expect(result).toEqual([]);
  });
});
