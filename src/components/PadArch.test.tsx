import { render } from '@testing-library/react-native';
import type { Line, LineNested, Station } from '~/@types/graphql';
import PadArch from './PadArch';

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('./NumberingIcon', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./TransferLineDot', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./TransferLineMark', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./ChevronYamanote', () => ({
  ChevronYamanote: jest.fn(() => null),
}));

jest.mock('./Typography', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn((props) => <Text {...props}>{props.children}</Text>),
  };
});

jest.mock('./LineBoard/shared/components', () => {
  const { Text } = require('react-native');
  return {
    EstimatedMinutesBadge: jest.fn(({ estimatedMinutes }) => (
      <Text>{estimatedMinutes}</Text>
    )),
  };
});

describe('PadArch', () => {
  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: '山手線',
    color: '#9acd32',
  } as Line;

  const mockStations: Station[] = [
    { id: 1, groupId: 1, name: '東京', line: mockLine } as unknown as Station,
    { id: 2, groupId: 2, name: '有楽町', line: mockLine } as unknown as Station,
    { id: 3, groupId: 3, name: '新橋', line: mockLine } as unknown as Station,
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderPadArch = (
    stations: Station[],
    estimatedMinutesByStationId?: Map<number, number | null>,
    arrived = false
  ) =>
    render(
      <PadArch
        line={mockLine}
        stations={stations}
        arrived={arrived}
        transferLines={[]}
        station={null}
        numberingInfo={stations.map(() => null)}
        lineMarks={[]}
        trainTypeLines={[] as LineNested[]}
        isEn={false}
        estimatedMinutesByStationId={estimatedMinutesByStationId}
      />
    );

  it('stationIdに対応するestimatedMinutesがEstimatedMinutesBadgeへ渡される', () => {
    const { EstimatedMinutesBadge } = require('./LineBoard/shared/components');
    renderPadArch(mockStations, new Map([[2, 5]]));
    expect(EstimatedMinutesBadge).toHaveBeenCalledWith(
      expect.objectContaining({ estimatedMinutes: 5 }),
      undefined
    );
  });

  it('estimatedMinutesByStationIdが未指定でもエラーなくレンダリングされる', () => {
    const result = renderPadArch(mockStations);
    expect(result.toJSON()).toBeTruthy();
  });

  it('通過駅にはestimatedMinutesを表示しない', () => {
    const getIsPass = require('~/utils/isPass').default;
    getIsPass.mockReturnValue(true);
    const { EstimatedMinutesBadge } = require('./LineBoard/shared/components');
    renderPadArch(mockStations, new Map([[2, 5]]));
    expect(EstimatedMinutesBadge).not.toHaveBeenCalled();
  });
});
