import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { useAppColors } from '~/providers/AppColorsProvider';
import { groupBusLinesByRoute } from '~/utils/groupBusLinesByRoute';
import {
  createCompany,
  createLine,
  createStation,
} from '~/utils/test/factories';
import { BusRouteList } from './BusRouteList';

jest.mock('~/providers/AppColorsProvider', () => ({
  useAppColors: jest.fn(
    () => require('~/constants/colorScheme').LIGHT_APP_COLORS
  ),
}));

afterEach(() => {
  jest.mocked(useAppColors).mockReturnValue(LIGHT_APP_COLORS);
  jest.clearAllMocks();
});

jest.mock('../hooks', () => ({
  useBounds: () => ({ bounds: [[], []] }),
  useGetLineMark: () => () => null,
}));
jest.mock('./TransferLineMark', () => () => null);

jest.mock('./Typography', () => require('react-native').Text);
jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: (key: string, values?: { number?: string; count?: number }) =>
    key === 'busPlatformHeading'
      ? `${values?.number}番のりば`
      : key === 'busRouteCount'
        ? `${values?.count}系統`
        : 'その他',
}));

const first = createLine(1, {
  company: createCompany(1),
  nameShort: '47A 新前橋駅西口線',
  station: {
    ...createStation(1, { groupId: 1, platformCode: '4' }),
    __typename: 'StationNested',
  },
});
const second = createLine(2, {
  company: createCompany(1),
  nameShort: '47B 新前橋駅西口線',
  station: {
    ...createStation(2, { groupId: 1, platformCode: '4' }),
    __typename: 'StationNested',
  },
});
const other = createLine(3, { nameShort: '不明系統', station: null });
const groups = groupBusLinesByRoute([first, second, other]) ?? [];

it('初期表示は折りたたみ、開閉して各系統を選択できる', () => {
  const selected = jest.fn();
  const ui = render(<BusRouteList groups={groups} onLineSelected={selected} />);
  expect(ui.queryByText('47A')).toBeNull();
  expect(ui.getByText(/2系統/)).toBeTruthy();
  fireEvent.press(ui.getByText('新前橋駅西口線'));
  fireEvent.press(ui.getByText('47B'));
  expect(selected).toHaveBeenCalledWith(second);
  expect(selected).toHaveBeenCalledTimes(1);
  fireEvent.press(ui.getByText('新前橋駅西口線'));
  expect(ui.queryByText('47A')).toBeNull();
  fireEvent.press(ui.getByText('不明系統'));
  expect(selected).toHaveBeenLastCalledWith(other);
});

it('ロード中は系統を選択できず、開閉はできる', () => {
  const selected = jest.fn();
  const ui = render(
    <BusRouteList groups={groups} onLineSelected={selected} disabled />
  );
  fireEvent.press(ui.getByText('新前橋駅西口線'));
  fireEvent.press(ui.getByText('47A'));
  expect(selected).not.toHaveBeenCalled();
});

it.each([
  ['ライト', LIGHT_APP_COLORS],
  ['ダーク', DARK_APP_COLORS],
])('%sで見出しは配色に従う', (_name, colors) => {
  jest.mocked(useAppColors).mockReturnValue(colors);
  const ui = render(
    <BusRouteList groups={groups} onLineSelected={jest.fn()} />
  );
  expect(
    StyleSheet.flatten(ui.getByText('新前橋駅西口線').props.style).color
  ).toBe(colors.text);
});

it('降車などの文字列に番のりばを付けず、単独系統を直接選択する', () => {
  const bus = {
    ...first,
    station: {
      ...createStation(1, { platformCode: '降車' }),
      __typename: 'StationNested' as const,
    },
  };
  const selected = jest.fn();
  const ui = render(
    <BusRouteList
      groups={groupBusLinesByRoute([bus])}
      onLineSelected={selected}
    />
  );
  expect(ui.queryByText(/降車/)).toBeNull();
  fireEvent.press(ui.getByText('新前橋駅西口線'));
  expect(selected).toHaveBeenCalledWith(bus);
});

it('単独系統もロード中には選択できない', () => {
  const selected = jest.fn();
  const ui = render(
    <BusRouteList
      groups={groupBusLinesByRoute([first])}
      onLineSelected={selected}
      disabled
    />
  );
  fireEvent.press(ui.getByText('新前橋駅西口線'));
  expect(selected).not.toHaveBeenCalled();
});

it.each([null, '4'])(
  '同じ系統番号でも詳細名で選択先を区別できる（のりば: %s）',
  (platformCode) => {
    const lines = [
      {
        ...first,
        nameRoman: '中央公園経由',
        station: {
          ...createStation(1, { platformCode }),
          __typename: 'StationNested' as const,
        },
      },
      {
        ...second,
        nameShort: first.nameShort,
        nameRoman: '市役所経由',
        station: {
          ...createStation(2, { platformCode }),
          __typename: 'StationNested' as const,
        },
      },
    ];
    const selected = jest.fn();
    const ui = render(
      <BusRouteList
        groups={groupBusLinesByRoute(lines)}
        onLineSelected={selected}
      />
    );
    fireEvent.press(ui.getByText('新前橋駅西口線'));
    const suffix = platformCode ? ' / 4番のりば' : '';
    fireEvent.press(ui.getByText(`中央公園経由${suffix}`));
    expect(selected).toHaveBeenLastCalledWith(lines[0]);
    fireEvent.press(ui.getByText(`市役所経由${suffix}`));
    expect(selected).toHaveBeenLastCalledWith(lines[1]);
  }
);

it.each([null, '', '  ', '47A', '新前橋駅西口線', '47A 新前橋駅西口線'])(
  '追加の詳細がなければ既存の表示と選択先を維持する（%s）',
  (nameRoman) => {
    const lines = [
      { ...first, nameRoman },
      { ...second, nameShort: first.nameShort, nameRoman },
    ];
    const selected = jest.fn();
    const ui = render(
      <BusRouteList
        groups={groupBusLinesByRoute(lines)}
        onLineSelected={selected}
      />
    );
    fireEvent.press(ui.getByText('新前橋駅西口線'));
    expect(ui.getAllByText('4番のりば')).toHaveLength(2);
    fireEvent.press(ui.getByTestId('line_2'));
    expect(selected).toHaveBeenCalledWith(lines[1]);
  }
);

it('系統番号が異なるときは詳細名を追加しない', () => {
  const lines = [
    { ...first, nameRoman: '中央公園経由' },
    { ...second, nameRoman: '市役所経由' },
  ];
  const ui = render(
    <BusRouteList
      groups={groupBusLinesByRoute(lines)}
      onLineSelected={jest.fn()}
    />
  );
  fireEvent.press(ui.getByText('新前橋駅西口線'));
  expect(ui.queryByText(/中央公園経由|市役所経由/)).toBeNull();
});
