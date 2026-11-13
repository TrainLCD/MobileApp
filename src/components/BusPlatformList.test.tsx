import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { useAppColors } from '~/providers/AppColorsProvider';
import { groupBusLinesByPlatform } from '~/utils/groupBusLinesByPlatform';
import { createLine, createStation } from '~/utils/test/factories';
import { BusPlatformList } from './BusPlatformList';

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
  nameShort: '47A 新前橋駅西口線',
  station: {
    ...createStation(1, { groupId: 1, platformCode: '4' }),
    __typename: 'StationNested',
  },
});
const second = createLine(2, {
  nameShort: '47B 新前橋駅西口線',
  station: {
    ...createStation(2, { groupId: 1, platformCode: '4' }),
    __typename: 'StationNested',
  },
});
const other = createLine(3, { nameShort: '不明系統', station: null });
const groups = groupBusLinesByPlatform([first, second, other]) ?? [];

it('初期表示は折りたたみ、開閉して各系統を選択できる', () => {
  const selected = jest.fn();
  const ui = render(
    <BusPlatformList groups={groups} onLineSelected={selected} />
  );
  expect(ui.queryByText(first.nameShort ?? '')).toBeNull();
  expect(ui.getByText(/2系統/)).toBeTruthy();
  fireEvent.press(ui.getByText('4番のりば'));
  fireEvent.press(ui.getByText(second.nameShort ?? ''));
  expect(selected).toHaveBeenCalledWith(second);
  expect(selected).toHaveBeenCalledTimes(1);
  fireEvent.press(ui.getByText('4番のりば'));
  expect(ui.queryByText(first.nameShort ?? '')).toBeNull();
  fireEvent.press(ui.getByText('その他'));
  fireEvent.press(ui.getByText('不明系統'));
  expect(selected).toHaveBeenLastCalledWith(other);
});

it('ロード中は系統を選択できず、開閉はできる', () => {
  const selected = jest.fn();
  const ui = render(
    <BusPlatformList groups={groups} onLineSelected={selected} disabled />
  );
  fireEvent.press(ui.getByText('4番のりば'));
  fireEvent.press(ui.getByText(first.nameShort ?? ''));
  expect(selected).not.toHaveBeenCalled();
});

it.each([
  ['ライト', LIGHT_APP_COLORS],
  ['ダーク', DARK_APP_COLORS],
])('%sでものりば番号は白背景・黒文字で表示する', (_name, colors) => {
  jest.mocked(useAppColors).mockReturnValue(colors);
  const ui = render(
    <BusPlatformList groups={groups} onLineSelected={jest.fn()} />
  );
  const number = ui.getByText('4');
  expect(StyleSheet.flatten(number.props.style).color).toBe('#000');
  let badge = number.parent;
  while (badge && badge.type !== View) badge = badge.parent;
  expect(badge).not.toBeNull();
  expect(StyleSheet.flatten(badge?.props.style).backgroundColor).toBe('#fff');
});
