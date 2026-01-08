import type { TrainType } from '~/@types/graphql';
import { TrainTypeKind } from '~/@types/graphql';
import {
  findBranchLine,
  findLocalType,
  findLtdExpType,
  findRapidType,
  getIsLocal,
  getIsLtdExp,
  getIsRapid,
} from './trainTypeString';

const createTrainType = (kind: TrainTypeKind | null): TrainType => ({
  __typename: 'TrainType',
  color: '#123456',
  direction: null,
  groupId: 1,
  id: 1,
  kind,
  line: null,
  lines: null,
  name: 'テスト種別',
  nameChinese: null,
  nameKatakana: 'テストシュベツ',
  nameKorean: null,
  nameRoman: 'Test Type',
  typeId: 1,
});

describe('getIsLocal', () => {
  it('kindがDefaultの場合、trueを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Default);
    expect(getIsLocal(trainType)).toBe(true);
  });

  it('kindがRapidの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Rapid);
    expect(getIsLocal(trainType)).toBe(false);
  });

  it('kindがLimitedExpressの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.LimitedExpress);
    expect(getIsLocal(trainType)).toBe(false);
  });

  it('kindがBranchの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Branch);
    expect(getIsLocal(trainType)).toBe(false);
  });

  it('kindがExpressの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Express);
    expect(getIsLocal(trainType)).toBe(false);
  });

  it('kindがHighSpeedRapidの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.HighSpeedRapid);
    expect(getIsLocal(trainType)).toBe(false);
  });

  it('trainTypeがnullの場合、trueを返す（デフォルト動作）', () => {
    expect(getIsLocal(null)).toBe(true);
  });

  it('kindがnullの場合、trueを返す（デフォルト動作）', () => {
    const trainType = createTrainType(null);
    expect(getIsLocal(trainType)).toBe(true);
  });
});

describe('getIsRapid', () => {
  it('kindがRapidの場合、trueを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Rapid);
    expect(getIsRapid(trainType)).toBe(true);
  });

  it('kindがHighSpeedRapidの場合、trueを返す', () => {
    const trainType = createTrainType(TrainTypeKind.HighSpeedRapid);
    expect(getIsRapid(trainType)).toBe(true);
  });

  it('kindがDefaultの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Default);
    expect(getIsRapid(trainType)).toBe(false);
  });

  it('kindがLimitedExpressの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.LimitedExpress);
    expect(getIsRapid(trainType)).toBe(false);
  });

  it('kindがExpressの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Express);
    expect(getIsRapid(trainType)).toBe(false);
  });

  it('kindがBranchの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Branch);
    expect(getIsRapid(trainType)).toBe(false);
  });

  it('trainTypeがnullの場合、falseを返す', () => {
    expect(getIsRapid(null)).toBe(false);
  });

  it('kindがnullの場合、falseを返す', () => {
    const trainType = createTrainType(null);
    expect(getIsRapid(trainType)).toBe(false);
  });
});

describe('getIsLtdExp', () => {
  it('kindがLimitedExpressの場合、trueを返す', () => {
    const trainType = createTrainType(TrainTypeKind.LimitedExpress);
    expect(getIsLtdExp(trainType)).toBe(true);
  });

  it('kindがDefaultの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Default);
    expect(getIsLtdExp(trainType)).toBe(false);
  });

  it('kindがRapidの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Rapid);
    expect(getIsLtdExp(trainType)).toBe(false);
  });

  it('kindがHighSpeedRapidの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.HighSpeedRapid);
    expect(getIsLtdExp(trainType)).toBe(false);
  });

  it('kindがExpressの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Express);
    expect(getIsLtdExp(trainType)).toBe(false);
  });

  it('kindがBranchの場合、falseを返す', () => {
    const trainType = createTrainType(TrainTypeKind.Branch);
    expect(getIsLtdExp(trainType)).toBe(false);
  });

  it('trainTypeがnullの場合、falseを返す', () => {
    expect(getIsLtdExp(null)).toBe(false);
  });

  it('kindがnullの場合、falseを返す', () => {
    const trainType = createTrainType(null);
    expect(getIsLtdExp(trainType)).toBe(false);
  });
});

describe('findLocalType', () => {
  it('Default種別が見つかった場合、その種別を返す', () => {
    const localType = createTrainType(TrainTypeKind.Default);
    const rapidType = createTrainType(TrainTypeKind.Rapid);
    const trainTypes = [rapidType, localType];
    expect(findLocalType(trainTypes)).toBe(localType);
  });

  it('Default種別がない場合、nullを返す', () => {
    const rapidType = createTrainType(TrainTypeKind.Rapid);
    const ltdExpType = createTrainType(TrainTypeKind.LimitedExpress);
    const trainTypes = [rapidType, ltdExpType];
    expect(findLocalType(trainTypes)).toBeNull();
  });

  it('trainTypesがnullの場合、nullを返す', () => {
    expect(findLocalType(null)).toBeNull();
  });

  it('trainTypesが空配列の場合、nullを返す', () => {
    expect(findLocalType([])).toBeNull();
  });

  it('複数のDefault種別がある場合、最初のものを返す', () => {
    const localType1 = { ...createTrainType(TrainTypeKind.Default), id: 1 };
    const localType2 = { ...createTrainType(TrainTypeKind.Default), id: 2 };
    const trainTypes = [localType1, localType2];
    expect(findLocalType(trainTypes)).toBe(localType1);
  });
});

describe('findBranchLine', () => {
  it('Branch種別が見つかった場合、その種別を返す', () => {
    const branchType = createTrainType(TrainTypeKind.Branch);
    const localType = createTrainType(TrainTypeKind.Default);
    const trainTypes = [localType, branchType];
    expect(findBranchLine(trainTypes)).toBe(branchType);
  });

  it('Branch種別がない場合、nullを返す', () => {
    const localType = createTrainType(TrainTypeKind.Default);
    const rapidType = createTrainType(TrainTypeKind.Rapid);
    const trainTypes = [localType, rapidType];
    expect(findBranchLine(trainTypes)).toBeNull();
  });

  it('trainTypesが空配列の場合、nullを返す', () => {
    expect(findBranchLine([])).toBeNull();
  });

  it('複数のBranch種別がある場合、最初のものを返す', () => {
    const branchType1 = { ...createTrainType(TrainTypeKind.Branch), id: 1 };
    const branchType2 = { ...createTrainType(TrainTypeKind.Branch), id: 2 };
    const trainTypes = [branchType1, branchType2];
    expect(findBranchLine(trainTypes)).toBe(branchType1);
  });
});

describe('findRapidType', () => {
  it('Rapid種別が見つかった場合、その種別を返す', () => {
    const rapidType = createTrainType(TrainTypeKind.Rapid);
    const localType = createTrainType(TrainTypeKind.Default);
    const trainTypes = [localType, rapidType];
    expect(findRapidType(trainTypes)).toBe(rapidType);
  });

  it('HighSpeedRapid種別が見つかった場合、その種別を返す', () => {
    const highSpeedRapidType = createTrainType(TrainTypeKind.HighSpeedRapid);
    const localType = createTrainType(TrainTypeKind.Default);
    const trainTypes = [localType, highSpeedRapidType];
    expect(findRapidType(trainTypes)).toBe(highSpeedRapidType);
  });

  it('RapidとHighSpeedRapidの両方がある場合、最初に見つかったものを返す', () => {
    const rapidType = createTrainType(TrainTypeKind.Rapid);
    const highSpeedRapidType = createTrainType(TrainTypeKind.HighSpeedRapid);
    const trainTypes = [highSpeedRapidType, rapidType];
    expect(findRapidType(trainTypes)).toBe(highSpeedRapidType);
  });

  it('Rapid種別がない場合、nullを返す', () => {
    const localType = createTrainType(TrainTypeKind.Default);
    const ltdExpType = createTrainType(TrainTypeKind.LimitedExpress);
    const trainTypes = [localType, ltdExpType];
    expect(findRapidType(trainTypes)).toBeNull();
  });

  it('trainTypesがnullの場合、nullを返す', () => {
    expect(findRapidType(null)).toBeNull();
  });

  it('trainTypesが空配列の場合、nullを返す', () => {
    expect(findRapidType([])).toBeNull();
  });
});

describe('findLtdExpType', () => {
  it('LimitedExpress種別が見つかった場合、その種別を返す', () => {
    const ltdExpType = createTrainType(TrainTypeKind.LimitedExpress);
    const localType = createTrainType(TrainTypeKind.Default);
    const trainTypes = [localType, ltdExpType];
    expect(findLtdExpType(trainTypes)).toBe(ltdExpType);
  });

  it('LimitedExpress種別がない場合、nullを返す', () => {
    const localType = createTrainType(TrainTypeKind.Default);
    const rapidType = createTrainType(TrainTypeKind.Rapid);
    const trainTypes = [localType, rapidType];
    expect(findLtdExpType(trainTypes)).toBeNull();
  });

  it('trainTypesがnullの場合、nullを返す', () => {
    expect(findLtdExpType(null)).toBeNull();
  });

  it('trainTypesが空配列の場合、nullを返す', () => {
    expect(findLtdExpType([])).toBeNull();
  });

  it('複数のLimitedExpress種別がある場合、最初のものを返す', () => {
    const ltdExpType1 = {
      ...createTrainType(TrainTypeKind.LimitedExpress),
      id: 1,
    };
    const ltdExpType2 = {
      ...createTrainType(TrainTypeKind.LimitedExpress),
      id: 2,
    };
    const trainTypes = [ltdExpType1, ltdExpType2];
    expect(findLtdExpType(trainTypes)).toBe(ltdExpType1);
  });
});
