import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { StyleSheet } from 'react-native';
import { type Line, type Station, StopCondition } from '~/@types/graphql';
import { useCurrentStation, useHeaderCommonData } from '~/hooks';
import { COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import { colorSchemePreferenceAtom } from '~/store/atoms/colorScheme';
import { bottomStateAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '~/store/atoms/station';
import PortraitMain from './PortraitMain';

jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: jest.fn((key: string) => key),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: true,
}));

// タブレットはノッチがないぶん上端のセーフエリアが 0 になる
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    right: 0,
    bottom: 20,
    left: 0,
  })),
}));

jest.mock('./NumberingIcon', () => () => null);

jest.mock('~/hooks', () => ({
  useBoundText: jest.fn(() => ({
    JA: '品川・大崎方面',
    EN: 'for Shinagawa & Osaki',
  })),
  useCurrentLine: jest.fn(() => ({
    id: 11302,
    color: '#80C241',
    nameShort: '山手線',
    nameRoman: 'Yamanote Line',
  })),
  useCurrentStation: jest.fn(),
  useCurrentTrainType: jest.fn(() => null),
  useEstimateArrivalTimesAllStops: jest.fn(() => ({
    route: null,
    loading: false,
    error: null,
  })),
  useEstimatedMinutesByStationId: jest.fn(() => new Map<number, number>()),
  useGetLineMark: jest.fn(() => () => null),
  useHeaderCommonData: jest.fn(),
  useLoopLine: jest.fn(() => ({ isLoopLine: false })),
  useStationNumberIndexFunc: jest.fn(() => () => 0),
  useTransferLines: jest.fn(() => []),
  useTransferLinesFromStation: jest.fn(() => []),
  useTransferStationNumbers: jest.fn((lines: Line[]) => lines.map(() => null)),
  useTransferTargetStation: jest.fn(() => undefined),
}));

const station = {
  id: 1,
  groupId: 1,
  name: '品川',
  nameRoman: 'Shinagawa',
  stopCondition: StopCondition.All,
  stationNumbers: [{ stationNumber: 'JY-25' }],
  line: {
    id: 11302,
    color: '#80C241',
    nameShort: '山手線',
    nameRoman: 'Yamanote Line',
  },
  lines: [],
} as unknown as Station;

describe('PortraitMain - tablet', () => {
  beforeEach(() => {
    (useHeaderCommonData as jest.Mock).mockReturnValue({
      stateText: 'nextKana',
      stationText: '高輪ゲートウェイ',
      boundText: '品川・大崎方面',
      currentStationNumber: {
        lineSymbol: 'JY',
        lineSymbolColor: '#80C241',
        lineSymbolShape: 'ROUND',
        stationNumber: 'JY-26',
      },
      threeLetterCode: undefined,
      numberingColor: '#80C241',
      headerState: 'NEXT_KANA',
    });
    (useCurrentStation as jest.Mock).mockReturnValue(station);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('セーフエリア上端が 0 でも下端と同じだけの余白を上端に確保する', () => {
    const store = createStore();
    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.LIGHT);
    store.set(stationsAtom, [station]);
    store.set(selectedDirectionAtom, 'INBOUND');
    store.set(arrivedAtom, true);
    store.set(bottomStateAtom, 'LINE');

    const { getByTestId } = render(
      <Provider store={store}>
        <PortraitMain />
      </Provider>
    );

    const paddingTop = StyleSheet.flatten(
      getByTestId('portrait-root').props.style
    ).paddingTop;
    const paddingBottom = StyleSheet.flatten(
      getByTestId('portrait-stop-list').props.contentContainerStyle
    ).paddingBottom;

    // 下端: リストの下パディング 12 + セーフエリア下端 20
    expect(paddingBottom).toBe(12 + 20);
    // 上端も同じ量を敷き、路線情報が画面の縁に貼り付かないようにする
    expect(paddingTop).toBe(paddingBottom);
  });
});
