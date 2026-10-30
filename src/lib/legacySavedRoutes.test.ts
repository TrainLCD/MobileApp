import { readLegacySavedRoutes } from './legacySavedRoutes';

const mockDb = {
  getAllAsync: jest.fn(),
  closeAsync: jest.fn(),
};
const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpen(...args),
}));

const row = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: '通勤',
  lineId: 100,
  trainTypeId: 50,
  hasTrainType: 1,
  createdAt: '2025-01-01T00:00:00.000Z',
};
const legs = [
  {
    lineGroupId: 50,
    fromStationId: 10,
    toStationId: 20,
    stationGroupIds: [1, 2],
  },
  {
    lineGroupId: 60,
    fromStationId: 21,
    toStationId: 70,
    stationGroupIds: [2, 7],
  },
];

beforeEach(() => {
  mockOpen.mockResolvedValue(mockDb);
  mockDb.closeAsync.mockResolvedValue(undefined);
  mockDb.getAllAsync.mockReset().mockResolvedValueOnce([{ name: 'id' }]);
});
afterEach(() => {
  jest.clearAllMocks();
});

it('旧版の列が欠けていても既定値を補い、IDと作成日を維持する', async () => {
  mockDb.getAllAsync.mockResolvedValueOnce([row]);
  expect(await readLegacySavedRoutes()).toEqual([
    {
      ...row,
      hasTrainType: true,
      wantedDestinationId: null,
      originStationId: null,
      direction: null,
      notifyStationIds: [],
      createdAt: new Date(row.createdAt),
    },
  ]);
  expect(mockDb.closeAsync).toHaveBeenCalledTimes(1);
});

it('種別なしの経路ではtrainTypeIdをnullに正規化する', async () => {
  mockDb.getAllAsync.mockResolvedValueOnce([{ ...row, hasTrainType: 0 }]);
  expect((await readLegacySavedRoutes())[0]).toMatchObject({
    hasTrainType: false,
    trainTypeId: null,
  });
});

it('区間・通知駅を復元し、壊れた乗換経路を通常の経路として移行しない', async () => {
  mockDb.getAllAsync.mockResolvedValueOnce([
    {
      ...row,
      legs: JSON.stringify(legs),
      notifyStationIds: '[2,7]',
      wantedDestinationId: 7,
      originStationId: 1,
      direction: 'INBOUND',
    },
    { ...row, id: 'broken', legs: '{broken' },
    { ...row, id: 'single', legs: JSON.stringify(legs.slice(0, 1)) },
    { ...row, id: 'invalid', trainTypeId: null },
  ]);
  const routes = await readLegacySavedRoutes();
  expect(routes).toHaveLength(1);
  expect(routes[0]).toMatchObject({
    legs,
    notifyStationIds: [2, 7],
    wantedDestinationId: 7,
    originStationId: 1,
    direction: 'INBOUND',
  });
});

it('新規インストールではテーブルを作らず空の一覧を返す', async () => {
  mockDb.getAllAsync.mockReset().mockResolvedValueOnce([]);
  expect(await readLegacySavedRoutes()).toEqual([]);
  expect(mockDb.getAllAsync).toHaveBeenCalledTimes(1);
  expect(mockDb.closeAsync).toHaveBeenCalledTimes(1);
});

it('読み込みに失敗しても接続を閉じ、エラーを呼び出し元へ返す', async () => {
  mockDb.getAllAsync.mockRejectedValueOnce(new Error('read failed'));
  await expect(readLegacySavedRoutes()).rejects.toThrow('read failed');
  expect(mockDb.closeAsync).toHaveBeenCalledTimes(1);
});
