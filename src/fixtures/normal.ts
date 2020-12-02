import { LineType, Line, Station } from '../models/StationAPI';

export const normalHeavyRailLineFixture: Line = {
  id: 1145141919810,
  companyId: 1919,
  lineColorC: '#810810',
  name: '迫真空手部線',
  nameR: 'Hakushin-karatebu Line',
  lineType: LineType.Normal,
  __typename: 'Line',
};

export const mockNormalStations: Station[] = Array.from({ length: 810 }).map(
  (v, k) => ({
    id: k,
    groupId: k,
    prefId: 1,
    name: `訓練${k}`,
    nameK: `クンレン${k}`,
    nameR: `Train${k}`,
    address: `ジャガー星訓練${k}区`,
    lines: [normalHeavyRailLineFixture],
    latitude: k,
    longitude: k + 1,
    distance: k * 100,
    __typename: 'Station',
  })
);
