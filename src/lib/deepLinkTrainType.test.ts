import { TrainDirection, TrainTypeKind } from '~/@types/graphql';
import { parseTrainTypeOverride } from './deepLinkTrainType';

describe('parseTrainTypeOverride', () => {
  it('全フィールドが未指定なら absent', () => {
    expect(parseTrainTypeOverride({})).toEqual({ status: 'absent' });
    expect(
      parseTrainTypeOverride({
        name: undefined,
        color: undefined,
        kind: undefined,
      })
    ).toEqual({ status: 'absent' });
  });

  it('name + color が揃っていれば valid', () => {
    const result = parseTrainTypeOverride({
      name: '快速',
      color: '#ff0000',
    });
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.trainType).toMatchObject({
      __typename: 'TrainTypeNested',
      name: '快速',
      color: '#ff0000',
      kind: null,
      direction: null,
      id: null,
      typeId: null,
      groupId: null,
      line: null,
      lines: null,
      nameTtsSegments: null,
    });
  });

  it('color は大文字でも受理し小文字に正規化する', () => {
    const result = parseTrainTypeOverride({
      name: '快速',
      color: '#FF0000',
    });
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.trainType.color).toBe('#ff0000');
    }
  });

  it('受理されない id / typeId / groupId / line / lines / nameTtsSegments は無視される', () => {
    // TrainTypeOverrideInput only declares whitelisted keys; foreign keys are
    // passed through an `unknown` cast so the validator can prove it ignores
    // them without TS rejecting the test input.
    const foreignFields: Record<string, unknown> = {
      id: 999,
      typeId: 'should-be-ignored',
      groupId: 1,
      line: { id: 1 },
      lines: [],
      nameTtsSegments: [],
    };
    const result = parseTrainTypeOverride({
      name: '快速',
      color: '#ff0000',
      ...foreignFields,
    });
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.trainType.id).toBeNull();
      expect(result.trainType.typeId).toBeNull();
      expect(result.trainType.groupId).toBeNull();
      expect(result.trainType.line).toBeNull();
      expect(result.trainType.lines).toBeNull();
      expect(result.trainType.nameTtsSegments).toBeNull();
    }
  });

  describe('必須フィールド欠落', () => {
    it.each([
      ['name のみ', { name: '快速' }],
      ['color のみ', { color: '#ff0000' }],
      ['kind のみ', { kind: TrainTypeKind.Rapid }],
      ['nameRoman のみ', { nameRoman: 'Rapid' }],
      [
        'name なしで他フィールド指定',
        { color: '#ff0000', kind: TrainTypeKind.Rapid },
      ],
      [
        'color なしで他フィールド指定',
        { name: '快速', kind: TrainTypeKind.Rapid },
      ],
    ])('%s は invalid', (_label, input) => {
      expect(parseTrainTypeOverride(input).status).toBe('invalid');
    });

    it('name が空文字は invalid', () => {
      expect(
        parseTrainTypeOverride({ name: '', color: '#ff0000' }).status
      ).toBe('invalid');
    });
  });

  describe('color バリデーション', () => {
    it.each([
      ['#fff (3桁)', '#fff'],
      ['rgb形式', 'rgb(255,0,0)'],
      ['# なし', 'ff0000'],
      ['7桁', '#ff00000'],
      ['HEX 外文字', '#gg0000'],
      ['空文字', ''],
      ['前後空白', ' #ff0000'],
    ])('%s は invalid', (_label, color) => {
      expect(parseTrainTypeOverride({ name: '快速', color }).status).toBe(
        'invalid'
      );
    });

    it('非文字列の color は invalid', () => {
      expect(
        parseTrainTypeOverride({
          name: '快速',
          color: 0xff0000,
        }).status
      ).toBe('invalid');
    });
  });

  describe('kind バリデーション', () => {
    it.each(Object.values(TrainTypeKind))('%s は受理', (kind) => {
      const result = parseTrainTypeOverride({
        name: '快速',
        color: '#ff0000',
        kind,
      });
      expect(result.status).toBe('valid');
      if (result.status === 'valid') {
        expect(result.trainType.kind).toBe(kind);
      }
    });

    it.each([
      ['enum 外文字列', 'Unknown'],
      ['小文字', 'rapid'],
      ['空文字', ''],
      ['数値', 1],
    ])('%s は invalid', (_label, kind) => {
      expect(
        parseTrainTypeOverride({
          name: '快速',
          color: '#ff0000',
          kind,
        }).status
      ).toBe('invalid');
    });
  });

  describe('direction バリデーション', () => {
    it.each(Object.values(TrainDirection))('%s は受理', (direction) => {
      const result = parseTrainTypeOverride({
        name: '快速',
        color: '#ff0000',
        direction,
      });
      expect(result.status).toBe('valid');
      if (result.status === 'valid') {
        expect(result.trainType.direction).toBe(direction);
      }
    });

    it.each([
      ['enum 外文字列', 'Reverse'],
      ['小文字', 'inbound'],
      ['空文字', ''],
      ['数値', 0],
    ])('%s は invalid', (_label, direction) => {
      expect(
        parseTrainTypeOverride({
          name: '快速',
          color: '#ff0000',
          direction,
        }).status
      ).toBe('invalid');
    });
  });

  describe('任意 name* フィールド', () => {
    it('指定された文字列が反映される', () => {
      const result = parseTrainTypeOverride({
        name: '快速',
        color: '#ff0000',
        nameRoman: 'Rapid',
        nameKatakana: 'カイソク',
        nameChinese: '快速',
        nameKorean: '쾌속',
        nameRomanIpa: 'ɾæpɪd',
      });
      expect(result.status).toBe('valid');
      if (result.status === 'valid') {
        expect(result.trainType).toMatchObject({
          nameRoman: 'Rapid',
          nameKatakana: 'カイソク',
          nameChinese: '快速',
          nameKorean: '쾌속',
          // nameIpa は deep link で運ばないため、常に null になる。
          nameIpa: null,
          nameRomanIpa: 'ɾæpɪd',
        });
      }
    });

    it('空文字は null として保持される', () => {
      const result = parseTrainTypeOverride({
        name: '快速',
        color: '#ff0000',
        nameRoman: '',
      });
      expect(result.status).toBe('valid');
      if (result.status === 'valid') {
        expect(result.trainType.nameRoman).toBeNull();
      }
    });

    it('非文字列の任意フィールドは invalid', () => {
      expect(
        parseTrainTypeOverride({
          name: '快速',
          color: '#ff0000',
          nameRoman: 123,
        }).status
      ).toBe('invalid');
    });
  });
});
