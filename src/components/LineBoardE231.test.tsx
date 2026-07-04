import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardE231 from './LineBoardE231';

// モック設定
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
  useAtom: jest.fn((val) => [val, jest.fn()]),
  useSetAtom: jest.fn(() => jest.fn()),
}));

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(),
  useDisplayCurrentStation: jest.fn(),
  useEstimateArrivalTimes: jest.fn(() => ({ route: null })),
  useEstimatedMinutesByStationId: jest.fn(() => new Map()),
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
  useTransferLinesFromStation: jest.fn(() => []),
}));

jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({ widthScale: jest.fn((val) => val) })),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('./ChevronE231', () => ({
  ChevronE231: jest.fn(() => null),
}));

jest.mock('./PadLineMarks', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./PassChevronEast', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./LineBoard/shared/components', () => {
  const { Text } = require('react-native');
  return {
    EstimatedMinutesBadge: jest.fn(({ estimatedMinutes }) => (
      <Text>{estimatedMinutes}</Text>
    )),
    StationName: jest.fn(() => null),
  };
});

jest.mock('./LineBoard/shared/hooks/useBarStyles', () => ({
  useBarStyles: jest.fn(() => ({ left: 0, width: 100 })),
  useChevronPosition: jest.fn(() => ({})),
  useIncludesLongStationName: jest.fn(() => false),
}));

describe('LineBoardE231', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useDisplayCurrentStation } = require('~/hooks');
  const { selectedLineAtom } = require('~/store/atoms/line');
  const { arrivedAtom } = require('~/store/atoms/station');
  const { isEnAtom } = require('~/store/selectors/isEn');

  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: '山手線',
    color: '#9acd32',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '東京',
      line: mockLine,
    } as unknown as Station,
    {
      id: 2,
      groupId: 2,
      name: '品川',
      line: mockLine,
    } as unknown as Station,
  ];

  beforeEach(() => {
    useAtomValue.mockImplementation((a: unknown) => {
      if (a === arrivedAtom) return true;
      if (a === selectedLineAtom) return null;
      if (a === isEnAtom) return false;
      return undefined;
    });
    useCurrentLine.mockReturnValue(mockLine);
    useDisplayCurrentStation.mockReturnValue(mockStations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされる', () => {
    const result = render(
      <LineBoardE231
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('stationIdに対応するestimatedMinutesがEstimatedMinutesBadgeへ渡される', () => {
    const { useEstimatedMinutesByStationId } = require('~/hooks');
    useEstimatedMinutesByStationId.mockReturnValueOnce(new Map([[2, 5]]));
    const { EstimatedMinutesBadge } = require('./LineBoard/shared/components');
    render(
      <LineBoardE231
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(EstimatedMinutesBadge).toHaveBeenCalledWith(
      expect.objectContaining({ estimatedMinutes: 5 }),
      undefined
    );
  });

  it('estimatedMinutesが無い場合、EstimatedMinutesBadgeは表示されない', () => {
    const { EstimatedMinutesBadge } = require('./LineBoard/shared/components');
    render(
      <LineBoardE231
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(EstimatedMinutesBadge).not.toHaveBeenCalled();
  });
});
