import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { type Station, StopCondition } from '~/@types/graphql';
import {
  useCurrentStation,
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
