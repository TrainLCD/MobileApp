import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import type { RouteCandidate } from '~/utils/routeEstimation/types';
import { useTrainTypeMismatchDetector } from './useTrainTypeMismatchDetector';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  useAtom: jest.fn(),
  useSetAtom: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  default: { __atom: 'navigation' },
}));
jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: { __atom: 'station' },
}));

const mockStartEstimation = jest.fn();
const mockStopEstimation = jest.fn();
const mockSelectCandidate = jest.fn();
const mockReset = jest.fn();

let mockCandidates: RouteCandidate[] = [];
let mockStatus = 'idle' as string;
let mockIsEstimating = false;

jest.mock('./useRouteEstimation', () => ({
  useRouteEstimation: () => ({
    candidates: mockCandidates,
    status: mockStatus,
    selectCandidate: mockSelectCandidate,
    reset: mockReset,
    bufferInfo: {
      pointCount: 0,
      totalDistance: 0,
      avgSpeed: 0,
      isMoving: false,
    },
  }),
  useRouteEstimationControl: () => ({
    isEstimating: mockIsEstimating,
    startEstimation: mockStartEstimation,
    stopEstimation: mockStopEstimation,
  }),
}));

const TestComponent: React.FC = () => {
  const isMismatch = useTrainTypeMismatchDetector();
  return <Text testID="result">{isMismatch ? 'mismatch' : 'ok'}</Text>;
};

const createTrainType = (
  groupId: number | null,
  overrides: Partial<TrainType> = {}
): TrainType => ({
  __typename: 'TrainType',
  color: '#ffffff',
  direction: null,
  groupId,
  id: null,
  kind: null,
  line: null,
  lines: [],
  name: 'Test',
  nameChinese: null,
  nameKatakana: null,
  nameKorean: null,
  nameIpa: null,
  nameRomanIpa: null,
  nameRoman: null,
  nameTtsSegments: null,
  typeId: 1,
  ...overrides,
});

const createCandidate = (
  trainTypeGroupId: number | null,
  confidence = 0.8
): RouteCandidate => ({
  line: {
    __typename: 'Line',
    averageDistance: null,
    color: null,
    company: null,
    id: 1,
    lineSymbols: null,
    lineType: null,
    nameChinese: null,
    nameFull: null,
    nameIpa: null,
    nameKatakana: null,
    nameKorean: null,
    nameRoman: null,
    nameRomanIpa: null,
    nameShort: null,
    nameTtsSegments: null,
    station: null,
    status: null,
    trainType: {
      __typename: 'TrainTypeNested',
      color: null,
      direction: null,
      groupId: trainTypeGroupId,
      id: null,
      kind: null,
      line: null,
      lines: null,
      name: null,
      nameChinese: null,
      nameIpa: null,
      nameKatakana: null,
      nameKorean: null,
      nameRoman: null,
      nameRomanIpa: null,
      nameTtsSegments: null,
      typeId: 1,
    },
    transportType: null,
  },
  direction: 'INBOUND',
  currentStation: {
    __typename: 'Station',
    address: null,
    closedAt: null,
    distance: null,
    groupId: 1,
    hasTrainTypes: null,
    id: 1,
    latitude: null,
    longitude: null,
    line: null,
    lines: null,
    name: 'TestStation',
    nameChinese: null,
    nameIpa: null,
    nameKatakana: null,
    nameKorean: null,
    nameRoman: null,
    nameRomanIpa: null,
    nameTtsSegments: null,
    openedAt: null,
    postalCode: null,
    prefectureId: null,
    stationNumbers: null,
    status: null,
    stopCondition: null,
    threeLetterCode: null,
    trainType: null,
    transportType: null,
  },
  nextStation: null,
  boundStation: {
    __typename: 'Station',
    address: null,
    closedAt: null,
    distance: null,
    groupId: 2,
    hasTrainTypes: null,
    id: 2,
    latitude: null,
    longitude: null,
    line: null,
    lines: null,
    name: 'BoundStation',
    nameChinese: null,
    nameIpa: null,
    nameKatakana: null,
    nameKorean: null,
    nameRoman: null,
    nameRomanIpa: null,
    nameTtsSegments: null,
    openedAt: null,
    postalCode: null,
    prefectureId: null,
    stationNumbers: null,
    status: null,
    stopCondition: null,
    threeLetterCode: null,
    trainType: null,
    transportType: null,
  },
  stations: [],
  score: 0.9,
  confidence,
  scoreBreakdown: { routeFitScore: 0.9, orderScore: 0.9, speedScore: 0.9 },
});

describe('useTrainTypeMismatchDetector', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCandidates = [];
    mockStatus = 'idle';
    mockIsEstimating = false;
  });

  it('returns false when no train type is selected', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: null };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: null };
      }
      return {};
    });

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => {
      expect(getByTestId('result').props.children).toBe('ok');
    });
  });

  it('returns false when no candidates are available', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: createTrainType(100) };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: { id: 1 } };
      }
      return {};
    });

    mockCandidates = [];
    mockStatus = 'collecting';

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => {
      expect(getByTestId('result').props.children).toBe('ok');
    });
  });

  it('detects mismatch when groupIds differ', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: createTrainType(100) };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: { id: 1 } };
      }
      return {};
    });

    mockCandidates = [createCandidate(200, 0.8)];
    mockStatus = 'ready';

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => {
      expect(getByTestId('result').props.children).toBe('mismatch');
    });
  });

  it('returns false when groupIds match', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: createTrainType(100) };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: { id: 1 } };
      }
      return {};
    });

    mockCandidates = [createCandidate(100, 0.8)];
    mockStatus = 'ready';

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => {
      expect(getByTestId('result').props.children).toBe('ok');
    });
  });

  it('returns false when confidence is too low', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: createTrainType(100) };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: { id: 1 } };
      }
      return {};
    });

    mockCandidates = [createCandidate(200, 0.5)];
    mockStatus = 'ready';

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => {
      expect(getByTestId('result').props.children).toBe('ok');
    });
  });

  it('returns false when estimated groupId is null', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: createTrainType(100) };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: { id: 1 } };
      }
      return {};
    });

    mockCandidates = [createCandidate(null, 0.8)];
    mockStatus = 'ready';

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => {
      expect(getByTestId('result').props.children).toBe('ok');
    });
  });

  it('returns false when selected groupId is null', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: createTrainType(null) };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: { id: 1 } };
      }
      return {};
    });

    mockCandidates = [createCandidate(200, 0.8)];
    mockStatus = 'ready';

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => {
      expect(getByTestId('result').props.children).toBe('ok');
    });
  });

  it('returns false when status is not ready', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: createTrainType(100) };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: { id: 1 } };
      }
      return {};
    });

    mockCandidates = [createCandidate(200, 0.8)];
    mockStatus = 'estimating';

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => {
      expect(getByTestId('result').props.children).toBe('ok');
    });
  });

  it('starts estimation when bound is selected', async () => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/navigation').default) {
        return { trainType: createTrainType(100) };
      }
      if (atom === require('../store/atoms/station').default) {
        return { selectedBound: { id: 1 } };
      }
      return {};
    });

    mockIsEstimating = false;

    render(<TestComponent />);
    await waitFor(() => {
      expect(mockStartEstimation).toHaveBeenCalled();
    });
  });
});
