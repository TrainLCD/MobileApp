import { act, fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { type Station, StopCondition } from '~/@types/graphql';
import {
  useCurrentStation,
  useDisplayCurrentStation,
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
  useBoundText: jest.fn(() => ({
    JA: '品川・東京方面',
    EN: 'For Shinagawa & Tokyo',
  })),
  useEstimateArrivalTimesAllStops: jest.fn(() => ({ route: null })),
  useEstimatedMinutesByStationId: jest.requireActual(
    '~/hooks/useEstimatedMinutesByStationId'
  ).useEstimatedMinutesByStationId,
  useCurrentStation: jest.fn(),
  useDisplayCurrentStation: jest.fn(),
  useLoopLine: jest.fn(() => ({ isLoopLine: false })),
  useTransferLines: jest.fn(() => []),
  useTransferTargetStation: jest.fn(),
  useGetLineMark: jest.fn(() => () => null),
  useStationNumberIndexFunc: jest.fn(() => () => 0),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: (key: string) => key,
}));
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
  require('~/translation').isJapanese = true;
  (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
    route: null,
  });
  (useHeaderCommonData as jest.Mock).mockReturnValue(data);
  (useCurrentStation as jest.Mock).mockReturnValue(stations[0]);
  (useDisplayCurrentStation as jest.Mock).mockReturnValue(stations[0]);
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
it('cycles C station text while keeping the header and transfers in the app language', () => {
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
    lineName: '山手線',
    stateText: 'Next',
    stationText: 'Ebisu',
    transferHeading: '恵比寿での乗換',
    transferLabel: 'のりかえ',
  });
  expect(latest().transfers[0].name).toBe('埼京線');
  expect(latest().stops[0].name).toBe('渋谷');
});
it('orders loop lines in the existing travel direction', () => {
  (useLoopLine as jest.Mock).mockReturnValue({ isLoopLine: true });
  (useCurrentStation as jest.Mock).mockReturnValue(stations[0]);
  (useTransferTargetStation as jest.Mock).mockReturnValue(stations[3]);
  setup();
  expect(latest().stops.map((s) => s.number)).toEqual(['', '', '', '']);
  expect(latest().stops.map((s) => s.key.split('-')[0])).toEqual([
    '4',
    '3',
    '2',
    '1',
  ]);
  expect(latest().stops[0].focused).toBe(true);
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

it('excludes the healed current station while retaining downstream ETA and missing values', () => {
  (useDisplayCurrentStation as jest.Mock).mockReturnValue(stations[1]);
  (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
    route: { stops: [{ stationId: 4, cumulativeMinutes: 5 }] },
  });
  setup();
  expect(latest().stops.map((s) => s.showEta)).toEqual([
    false,
    false,
    true,
    true,
  ]);
  expect(latest().stops[2].estimatedMinutes).toBeUndefined();
  expect(latest().stops[3].estimatedMinutes).toBe(5);
});
it('does not enable ETA from a value belonging only to the healed current station', () => {
  (useDisplayCurrentStation as jest.Mock).mockReturnValue(stations[1]);
  (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
    route: { stops: [{ stationId: 2, cumulativeMinutes: 0 }] },
  });
  setup();
  expect(latest().stops.every((s) => !s.showEta)).toBe(true);
});

it.each([false, true])(
  'excludes intervening stations after a multi-station correction (downstream ETA: %s)',
  (hasDownstreamEta) => {
    (useDisplayCurrentStation as jest.Mock).mockReturnValue(stations[2]);
    (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
      route: {
        stops: [
          { stationId: 2, cumulativeMinutes: 0 },
          ...(hasDownstreamEta ? [{ stationId: 4, cumulativeMinutes: 5 }] : []),
        ],
      },
    });
    setup();
    expect(latest().stops.map((s) => s.showEta)).toEqual([
      false,
      false,
      false,
      hasDownstreamEta,
    ]);
  }
);
it.each([undefined, { id: 99 }])(
  'falls back to the recorded current station when the display station is unavailable: %p',
  (displayStation) => {
    (useDisplayCurrentStation as jest.Mock).mockReturnValue(displayStation);
    (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
      route: { stops: [{ stationId: 4, cumulativeMinutes: 5 }] },
    });
    setup();
    expect(latest().stops.map((s) => s.showEta)).toEqual([
      false,
      true,
      true,
      true,
    ]);
  }
);

it.each([true, false])(
  'fixes all B text to the app language (Japanese: %s)',
  (japanese) => {
    require('~/translation').isJapanese = japanese;
    (useHeaderCommonData as jest.Mock).mockReturnValue({
      ...data,
      headerLangState: 'KO',
      stationText: '에비스',
      boundText: '한국어',
    });
    const r = setup();
    act(() => latest().onShowStopsChange?.(true));
    expect(latest()).toMatchObject({
      showStops: true,
      lineName: japanese ? '山手線' : 'Yamanote Line',
      boundText: japanese ? '品川・東京方面' : 'For Shinagawa & Tokyo',
      transferLabel: japanese ? 'のりかえ' : 'Transfers',
    });
    expect(latest().stops.map((s) => s.name)).toEqual(
      japanese
        ? ['渋谷', '恵比寿', '目黒', '五反田']
        : ['Shibuya', 'Ebisu', 'Meguro', 'Gotanda']
    );
    for (const headerLangState of ['JA', 'KANA', 'EN', 'ZH', 'KO']) {
      (useHeaderCommonData as jest.Mock).mockReturnValue({
        ...data,
        headerLangState,
        stationText: '에비스',
      });
      act(() => r.store.set(stationsAtom, [...stations]));
      expect(latest().showStops).toBe(true);
      expect(latest().lineName).toBe(japanese ? '山手線' : 'Yamanote Line');
      expect(latest().stops[1].name).toBe(japanese ? '恵比寿' : 'Ebisu');
      expect(latest().transferLabel).toBe(japanese ? 'のりかえ' : 'Transfers');
    }
    act(() => latest().onShowStopsChange?.(false));
    expect(latest()).toMatchObject({
      showStops: false,
      stationText: '에비스',
      transferLabel: japanese ? 'のりかえ' : 'Transfers',
    });
  }
);

it.each([true, false])(
  'fixes C transfer headings, route and station names (Japanese: %s)',
  (japanese) => {
    require('~/translation').isJapanese = japanese;
    (useHeaderCommonData as jest.Mock).mockReturnValue({
      ...data,
      headerLangState: 'ZH',
      stationText: '惠比寿',
    });
    (useTransferLines as jest.Mock).mockReturnValue([
      {
        id: 2,
        nameShort: '埼京線',
        nameRoman: 'Saikyo Line',
        color: '#00AC9A',
        station: { ...stations[0], stationNumbers: [] },
      },
    ]);
    setup();
    expect(latest()).toMatchObject({
      showStops: false,
      stationText: '惠比寿',
      lineName: japanese ? '山手線' : 'Yamanote Line',
      boundText: japanese ? '品川・東京方面' : 'For Shinagawa & Tokyo',
      transferHeading: japanese ? '恵比寿での乗換' : 'Transfers at Ebisu',
      noTransfersText: japanese ? '乗換路線はありません' : 'No transfers',
    });
    expect(latest().transfers[0]).toMatchObject({
      name: japanese ? '埼京線' : 'Saikyo Line',
      stationName: japanese ? '渋谷' : 'Shibuya',
    });
  }
);

it.each([
  ['CURRENT_EN', 'nowStoppingAtEn'],
  ['CURRENT_ZH', 'nowStoppingAtZh'],
  ['CURRENT_KO', 'nowStoppingAtKo'],
])(
  'fills the stopping state for %s just like portrait',
  (headerState, expected) => {
    (useHeaderCommonData as jest.Mock).mockReturnValue({
      ...data,
      headerState,
      stateText: '',
    });
    setup();
    expect(latest().stateText).toBe(expected);
  }
);
it('preserves supplied state text when supplementing stopping labels', () => {
  (useHeaderCommonData as jest.Mock).mockReturnValue({
    ...data,
    headerState: 'CURRENT_EN',
    stateText: 'already supplied',
  });
  setup();
  expect(latest().stateText).toBe('already supplied');
});

it.each([
  [true, 'NEXT_EN', false, 'next'],
  [true, 'ARRIVING_KO', false, 'soon'],
  [true, 'CURRENT_ZH', false, 'nowStoppingAt'],
  [false, 'NEXT_KANA', false, 'nextEn'],
  [false, 'ARRIVING', true, 'soonEnLast'],
  [false, 'CURRENT', false, 'nowStoppingAtEn'],
  [true, 'NEXT', true, 'nextLast'],
])(
  'provides focused state in the environment language: %s %s',
  (japanese, headerState, isLast, expected) => {
    require('~/translation').isJapanese = japanese;
    (useHeaderCommonData as jest.Mock).mockReturnValue({
      ...data,
      headerState,
      isLast,
    });
    setup();
    const focused = latest().stops.find((s) => s.focused);
    expect(focused?.stateText).toBe(expected);
    expect(
      latest()
        .stops.filter((s) => !s.focused)
        .every((s) => s.stateText === undefined)
    ).toBe(true);
  }
);

it.each([false, true])(
  'keeps every station before the current station (arrived: %s)',
  (arrived) => {
    (useCurrentStation as jest.Mock).mockReturnValue(stations[2]);
    (useDisplayCurrentStation as jest.Mock).mockReturnValue(stations[2]);
    (useTransferTargetStation as jest.Mock).mockReturnValue(stations[3]);
    (useHeaderCommonData as jest.Mock).mockReturnValue({
      ...data,
      currentStation: stations[2],
      arrived,
      headerState: arrived ? 'CURRENT' : 'NEXT',
    });
    (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
      route: { stops: [{ stationId: 4, cumulativeMinutes: 5 }] },
    });
    const r = setup();
    expect(latest().stops.map((s) => s.key.split('-')[0])).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(
      latest()
        .stops.slice(0, 2)
        .every((s) => s.passed && !s.showEta)
    ).toBe(true);
    expect(latest().stops[2]).toMatchObject({
      focused: arrived,
      passed: !arrived,
      showEta: false,
    });
    expect(latest().stops[3].showEta).toBe(true);
    const keys = latest().stops.map((s) => s.key);
    (useCurrentStation as jest.Mock).mockReturnValue(stations[3]);
    (useDisplayCurrentStation as jest.Mock).mockReturnValue(stations[3]);
    act(() => r.store.set(stationsAtom, [...stations]));
    expect(latest().stops.map((s) => s.key)).toEqual(keys);
  }
);
it('keeps the full outbound order and all stations behind the current station', () => {
  (useCurrentStation as jest.Mock).mockReturnValue(stations[1]);
  const r = setup();
  act(() => r.store.set(selectedDirectionAtom, 'OUTBOUND'));
  expect(latest().stops.map((s) => s.key.split('-')[0])).toEqual([
    '4',
    '3',
    '2',
    '1',
  ]);
  expect(
    latest()
      .stops.slice(0, 2)
      .every((s) => s.passed)
  ).toBe(true);
});
it('does not rotate loop stations around the current station', () => {
  (useLoopLine as jest.Mock).mockReturnValue({ isLoopLine: true });
  (useCurrentStation as jest.Mock).mockReturnValue(stations[2]);
  setup();
  expect(latest().stops.map((s) => s.key.split('-')[0])).toEqual([
    '4',
    '3',
    '2',
    '1',
  ]);
});

it.each([stations[2], undefined, { id: 99 }])(
  'uses the ETA progress anchor for passed styling with a fallback: %p',
  (displayStation) => {
    (useCurrentStation as jest.Mock).mockReturnValue(stations[0]);
    (useDisplayCurrentStation as jest.Mock).mockReturnValue(displayStation);
    (useTransferTargetStation as jest.Mock).mockReturnValue(stations[3]);
    (useHeaderCommonData as jest.Mock).mockReturnValue({
      ...data,
      headerState: 'ARRIVING',
    });
    (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
      route: { stops: [{ stationId: 4, cumulativeMinutes: 5 }] },
    });
    setup();
    const healed = displayStation?.id === stations[2].id;
    expect(latest().stops.map((s) => s.passed)).toEqual([
      true,
      healed,
      healed,
      false,
    ]);
    expect(latest().stops.map((s) => s.showEta)).toEqual([
      false,
      !healed,
      !healed,
      true,
    ]);
    expect(latest().stops[3].focused).toBe(true);
  }
);

// 接続駅では一覧に残る路線と各フックが返す路線の駅IDが異なる。
it.each(['INBOUND', 'OUTBOUND'] as const)(
  'tracks through-service groups across NEXT, ARRIVING and CURRENT in %s order',
  (direction) => {
    const r = setup();
    const travel = direction === 'INBOUND' ? stations : [...stations].reverse();
    const current = { ...travel[1], id: 101 };
    const next = { ...travel[2], id: 102 };
    const junctions = stations.flatMap((station, index) => [
      station,
      { ...station, id: index + 1000 },
    ]);
    (useCurrentStation as jest.Mock).mockReturnValue(current);
    (useDisplayCurrentStation as jest.Mock).mockReturnValue(current);
    for (const headerState of ['NEXT', 'ARRIVING', 'CURRENT']) {
      const arrived = headerState === 'CURRENT';
      (useHeaderCommonData as jest.Mock).mockReturnValue({
        ...data,
        currentStation: arrived ? next : current,
        headerState,
        arrived,
      });
      (useTransferTargetStation as jest.Mock).mockReturnValue(next);
      if (arrived) {
        (useCurrentStation as jest.Mock).mockReturnValue(next);
        (useDisplayCurrentStation as jest.Mock).mockReturnValue(next);
      }
      act(() => {
        r.store.set(selectedDirectionAtom, direction);
        r.store.set(stationsAtom, [...junctions]);
      });
      expect(latest().stops).toHaveLength(4);
      expect(latest().stops.map((s) => s.focused)).toEqual([
        false,
        false,
        true,
        false,
      ]);
      expect(latest().stops.map((s) => s.passed)).toEqual([
        true,
        true,
        false,
        false,
      ]);
      expect(latest().stops[2].stateText).toBe(
        arrived ? 'nowStoppingAt' : headerState === 'NEXT' ? 'next' : 'soon'
      );
    }
  }
);

it.each([true, false])(
  'uses the through-service group for ETA progress (display station available: %s)',
  (hasDisplayStation) => {
    const current = { ...stations[1], id: 101 };
    (useCurrentStation as jest.Mock).mockReturnValue(current);
    (useDisplayCurrentStation as jest.Mock).mockReturnValue(
      hasDisplayStation ? { ...stations[2], id: 102 } : undefined
    );
    (useTransferTargetStation as jest.Mock).mockReturnValue(stations[3]);
    (useEstimateArrivalTimesAllStops as jest.Mock).mockReturnValue({
      route: { stops: [{ stationId: 4, cumulativeMinutes: 5 }] },
    });
    setup();
    expect(latest().stops.map((s) => s.showEta)).toEqual([
      false,
      false,
      !hasDisplayStation,
      true,
    ]);
    expect(latest().stops.map((s) => s.passed)).toEqual([
      true,
      true,
      hasDisplayStation,
      false,
    ]);
  }
);

it('falls back to station IDs when group IDs are missing without matching missing IDs', () => {
  (useTransferTargetStation as jest.Mock).mockReturnValue({
    ...stations[1],
    groupId: null,
  });
  const r = setup();
  expect(latest().stops.map((s) => s.focused)).toEqual([
    false,
    true,
    false,
    false,
  ]);
  (useTransferTargetStation as jest.Mock).mockReturnValue(undefined);
  act(() => r.store.set(stationsAtom, [...stations]));
  expect(latest().stops.every((s) => !s.focused)).toBe(true);
});

it.each([
  ['INBOUND', false, true],
  ['OUTBOUND', false, false],
  ['INBOUND', true, false],
  ['OUTBOUND', true, true],
] as const)(
  'tracks consecutive pass stations without jumping to the transfer target (%s, loop: %s, Japanese: %s)',
  (direction, loop, japanese) => {
    require('~/translation').isJapanese = japanese;
    (useLoopLine as jest.Mock).mockReturnValue({ isLoopLine: loop });
    const route = stations.map((s, i) =>
      i === 1 || i === 2 ? { ...s, stopCondition: StopCondition.Not } : s
    );
    const travel = (loop ? direction === 'INBOUND' : direction === 'OUTBOUND')
      ? [...route].reverse()
      : route;
    (useTransferTargetStation as jest.Mock).mockReturnValue(travel[3]);
    const r = setup();
    const update = (index: number, headerState: string) => {
      // 接続駅と同じく、現在駅のIDと一覧のIDが異なっても一致させる。
      const current = { ...travel[index], id: index + 100 };
      (useCurrentStation as jest.Mock).mockReturnValue(current);
      (useDisplayCurrentStation as jest.Mock).mockReturnValue(current);
      (useHeaderCommonData as jest.Mock).mockReturnValue({
        ...data,
        currentStation: current,
        headerState,
        isLast: true,
      });
      act(() => {
        r.store.set(selectedDirectionAtom, direction);
        r.store.set(stationsAtom, [...route]);
      });
    };
    update(0, 'CURRENT');
    expect(latest().stops[0]).toMatchObject({
      focused: true,
      stateText: japanese ? 'nowStoppingAt' : 'nowStoppingAtEn',
    });
    for (const headerState of ['NEXT', 'NEXT_EN', 'ARRIVING_KO']) {
      update(0, headerState);
      expect(latest().stops.filter((s) => s.focused)).toEqual([
        expect.objectContaining({
          key: `${travel[1].id}-1`,
          stateText: japanese ? '通過中' : 'Passing',
        }),
      ]);
    }
    for (const index of [1, 2]) {
      for (const headerState of ['NEXT_EN', 'ARRIVING_KO', 'CURRENT']) {
        update(index, headerState);
        expect(latest().stops.filter((s) => s.focused)).toEqual([
          expect.objectContaining({
            key: `${travel[index].id}-${index}`,
            stateText: japanese ? '通過中' : 'Passing',
            passed: false,
            pass: true,
            numberColor: '#C2C2C2',
            showEta: false,
          }),
        ]);
        expect(latest().transferHeading).toContain(
          japanese ? travel[3].name : travel[3].nameRoman
        );
      }
    }
    update(3, 'CURRENT');
    expect(latest().stops[3]).toMatchObject({
      focused: true,
      stateText: japanese ? 'nowStoppingAt' : 'nowStoppingAtEn',
    });
  }
);
