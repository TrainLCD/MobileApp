import { act, fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { type Station, StopCondition } from '~/@types/graphql';
import {
  useCurrentStation,
  useEstimateArrivalTimesAllStops,
  useHeaderCommonData,
  useLoopLine,
  useTransferLines,
  useTransferTargetStation,
} from '~/hooks';
import { RunningSettingsContext } from '~/providers/RunningSettingsContext';
import { selectedDirectionAtom, stationsAtom } from '~/store/atoms/station';
import SquareMain from './SquareMain';
import type { SquareMainViewProps } from './SquareMainView';

jest.mock('~/hooks', () => ({
  useHeaderCommonData: jest.fn(),
  useEstimateArrivalTimesAllStops: jest.fn(() => ({ route: null })),
  useEstimatedMinutesByStationId: jest.requireActual(
    '~/hooks/useEstimatedMinutesByStationId'
  ).useEstimatedMinutesByStationId,
  useCurrentStation: jest.fn(),
  useLoopLine: jest.fn(() => ({ isLoopLine: false })),
  useTransferLines: jest.fn(() => []),
  useTransferTargetStation: jest.fn(),
  useGetLineMark: jest.fn(() => () => null),
  useStationNumberIndexFunc: jest.fn(() => () => 0),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('~/translation', () => ({ translate: (key: string) => key }));
const mockNumbering = jest.fn();
jest.mock('./NumberingIcon', () => (props: unknown) => {
  mockNumbering(props);
  return null;
});
const mockView = jest.fn();
jest.mock('./SquareMainView', () => ({
  SquareMainView: (props: SquareMainViewProps) => {
    mockView(props);
    const { Pressable } = require('react-native');
    return (
      <Pressable testID="open-settings" onPress={props.onSettings}>
        {props.numbering}
      </Pressable>
    );
  },
}));
const line = {
  id: 1,
  color: '#80C241',
  nameShort: '山手線',
  nameRoman: 'Yamanote Line',
};
const stations = ['渋谷', '恵比寿', '目黒', '五反田'].map(
  (name, i) =>
    ({
      id: i + 1,
      groupId: i + 1,
      name,
      nameRoman: ['Shibuya', 'Ebisu', 'Meguro', 'Gotanda'][i],
      line,
      stopCondition: StopCondition.All,
      stationNumbers: [],
    }) as unknown as Station
);
const data = {
  currentStation: stations[0],
  currentLine: line,
  stateText: 'つぎは',
  stationText: '恵比寿',
  boundText: '品川・東京方面',
  headerLangState: 'JA',
  headerState: 'NEXT',
  trainType: null,
  arrived: false,
  numberingColor: '#80C241',
  currentStationNumber: { lineSymbolShape: 'SQUARE', stationNumber: 'JY-21' },
  threeLetterCode: 'EBS',
};
beforeEach(() => {
  jest.clearAllMocks();
  (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
    route: null,
  });
  (useHeaderCommonData as jest.Mock).mockReturnValue(data);
  (useCurrentStation as jest.Mock).mockReturnValue(stations[0]);
  (useTransferTargetStation as jest.Mock).mockReturnValue(stations[1]);
  (useTransferLines as jest.Mock).mockReturnValue([]);
  (useLoopLine as jest.Mock).mockReturnValue({ isLoopLine: false });
});
function setup() {
  const store = createStore();
  store.set(stationsAtom, stations);
  store.set(selectedDirectionAtom, 'INBOUND');
  const open = jest.fn();
  const r = render(
    <Provider store={store}>
      <RunningSettingsContext.Provider value={open}>
        <SquareMain />
      </RunningSettingsContext.Provider>
    </Provider>
  );
  return { ...r, store, open };
}
function latest(): SquareMainViewProps {
  return mockView.mock.calls.at(-1)?.[0];
}
it('uses API numbering shape, color and three-letter code, and existing settings owner', () => {
  const r = setup();
  expect(mockNumbering).toHaveBeenCalledWith(
    expect.objectContaining({
      shape: 'SQUARE',
      lineColor: '#80C241',
      stationNumber: 'JY-21',
      threeLetterCode: 'EBS',
    })
  );
  fireEvent.press(r.getByTestId('open-settings'));
  expect(r.open).toHaveBeenCalledTimes(1);
  expect(latest().lineColor).toBe('#80C241');
});
it('uses the header language for line and transfer text, independently of app locale', () => {
  (useHeaderCommonData as jest.Mock).mockReturnValue({
    ...data,
    headerLangState: 'EN',
    stationText: 'Ebisu',
    stateText: 'Next',
  });
  (useTransferLines as jest.Mock).mockReturnValue([
    { id: 2, nameShort: '埼京線', nameRoman: 'Saikyo Line', color: '#00AC9A' },
  ]);
  setup();
  expect(latest()).toMatchObject({
    lineName: 'Yamanote Line',
    stateText: 'Next',
    stationText: 'Ebisu',
    transferHeading: 'Transfers at Ebisu',
    transferLabel: 'Transfers',
  });
  expect(latest().transfers[0].name).toBe('Saikyo Line');
  expect(latest().stops[0].name).toBe('Shibuya');
});
it('orders ordinary and loop lines in the existing travel direction and wraps a loop', () => {
  (useLoopLine as jest.Mock).mockReturnValue({ isLoopLine: true });
  (useCurrentStation as jest.Mock).mockReturnValue(stations[0]);
  (useTransferTargetStation as jest.Mock).mockReturnValue(stations[3]);
  setup();
  expect(latest().stops.map((s) => s.number)).toEqual(['', '', '', '']);
  expect(latest().stops.map((s) => s.key.split('-')[0])).toEqual([
    '1',
    '4',
    '3',
    '2',
  ]);
  expect(latest().stops[1].focused).toBe(true);
});
it('does not mark a stopping station as departed', () => {
  (useHeaderCommonData as jest.Mock).mockReturnValue({
    ...data,
    arrived: true,
    headerState: 'CURRENT',
    stationText: '渋谷',
  });
  setup();
  expect(latest().stops[0]).toMatchObject({ focused: true, passed: false });
});
it('renders safely before station data is available', () => {
  (useHeaderCommonData as jest.Mock).mockReturnValue(null);
  setup();
  expect(mockView).not.toHaveBeenCalled();
});

it('replaces next labels with ETA through the final station and hides the current station ETA', () => {
  (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
    route: {
      stops: [
        { stationId: 2, cumulativeMinutes: 2.6 },
        { stationId: 4, cumulativeMinutes: 8 },
      ],
    },
  });
  setup();
  expect(latest().stops.map((s) => s.showEta)).toEqual([
    false,
    true,
    true,
    true,
  ]);
  expect(latest().stops.map((s) => s.label)).toEqual(['', '', '', '']);
  expect(latest().stops[1].estimatedMinutes).toBe(2.6);
  expect(latest().stops[2].estimatedMinutes).toBeUndefined();
  expect(latest().stops[3].estimatedMinutes).toBe(8);
});
it('hides the ETA column when every estimate is null', () => {
  (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
    route: { stops: [{ stationId: 2, cumulativeMinutes: null }] },
  });
  setup();
  expect(latest().stops.every((s) => !s.showEta)).toBe(true);
});

it('keeps pass labels without ETA and preserves API numbering', () => {
  (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
    route: { stops: [{ stationId: 3, cumulativeMinutes: 5 }] },
  });
  const r = setup();
  act(() =>
    r.store.set(
      stationsAtom,
      stations.map((s, i) =>
        i === 2
          ? ({
              ...s,
              stopCondition: StopCondition.Not,
              stationNumbers: [{ stationNumber: 'JY-22' }],
            } as Station)
          : s
      )
    )
  );
  expect(latest().stops[2]).toMatchObject({
    showEta: false,
    label: '通過',
    number: 'JY-22',
  });
  expect(latest().stops.every((s) => !s.showEta)).toBe(true);
});

it.each([1, 99])(
  'hides ETA when only current or undisplayed station %i has a value',
  (stationId) => {
    (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
      route: { stops: [{ stationId, cumulativeMinutes: 5 }] },
    });
    setup();
    expect(latest().stops.every((s) => !s.showEta)).toBe(true);
  }
);
