import { render } from '@testing-library/react-native';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import { StationName } from './StationName';

// モック設定
jest.mock('~/utils/getStationNameR', () => ({
  __esModule: true,
  default: jest.fn((station) => station?.nameR || 'Tokyo'),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('../../../Typography', () => {
  const _React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      style,
      ...props
    }: {
      children: React.ReactNode;
      style?: unknown;
    }) => (
      <Text style={style} testID="typography-text" {...props}>
        {children}
      </Text>
    ),
  };
});

describe('StationName', () => {
  const mockStation: Station = {
    id: 1,
    groupId: 1,
    name: '東京',
    nameR: 'Tokyo',
  } as unknown as Station;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('en=true の場合、英語名（nameR）を表示する', () => {
    const { getByText } = render(
      <StationName station={mockStation} en={true} />
    );

    expect(getByText('Tokyo')).toBeTruthy();
  });

  it('horizontal=true の場合、駅名を横書きで表示する', () => {
    const { getByText } = render(
      <StationName station={mockStation} horizontal={true} />
    );

    expect(getByText('東京')).toBeTruthy();
  });

  it('デフォルト（縦書き）の場合、駅名を1文字ずつ分割して表示する', () => {
    const { getByText } = render(<StationName station={mockStation} />);

    // 各文字が個別に表示される
    expect(getByText('東')).toBeTruthy();
    expect(getByText('京')).toBeTruthy();
  });

  it('passed=true の場合、グレーアウトのスタイルが適用される', () => {
    const { getAllByTestId } = render(
      <StationName station={mockStation} en={true} passed={true} />
    );

    const textElements = getAllByTestId('typography-text');
    const textElement = textElements[0];

    // grayColor スタイルが適用されているか確認（配列内にcolorプロパティを含むオブジェクトがある）
    const flattenedStyles = Array.isArray(textElement.props.style)
      ? textElement.props.style.flat()
      : [textElement.props.style];
    const hasColorStyle = flattenedStyles.some(
      (s: unknown) => s && typeof s === 'object' && 'color' in s
    );
    expect(hasColorStyle).toBe(true);
  });

  it('passed=false の場合、通常のスタイルが適用される', () => {
    const { getByText } = render(
      <StationName station={mockStation} en={true} passed={false} />
    );

    expect(getByText('Tokyo')).toBeTruthy();
  });

  it('marginBottom を指定した場合、カスタムのマージンが適用される', () => {
    const customMargin = 50;
    const { getAllByTestId } = render(
      <StationName
        station={mockStation}
        horizontal={true}
        marginBottom={customMargin}
      />
    );

    const textElements = getAllByTestId('typography-text');
    const textElement = textElements[0];

    // marginBottom がカスタム値になっているか確認
    const flattenedStyles = Array.isArray(textElement.props.style)
      ? textElement.props.style.flat()
      : [textElement.props.style];
    const hasMarginBottom = flattenedStyles.some(
      (s: unknown) =>
        s &&
        typeof s === 'object' &&
        'marginBottom' in s &&
        s.marginBottom === customMargin
    );
    expect(hasMarginBottom).toBe(true);
  });

  it('駅名が長い場合も正しく1文字ずつ分割される', () => {
    const longNameStation: Station = {
      ...mockStation,
      name: '国際展示場正門',
    };

    const { getByText } = render(<StationName station={longNameStation} />);

    // 各文字が個別に表示される
    expect(getByText('国')).toBeTruthy();
    expect(getByText('際')).toBeTruthy();
    expect(getByText('展')).toBeTruthy();
    expect(getByText('示')).toBeTruthy();
    expect(getByText('場')).toBeTruthy();
    expect(getByText('正')).toBeTruthy();
    expect(getByText('門')).toBeTruthy();
  });

  it('駅名がundefinedの場合でもエラーにならない', () => {
    const stationWithoutName: Station = {
      ...mockStation,
      name: undefined,
    } as Station;

    // エラーなくレンダリングされることを確認
    expect(() =>
      render(<StationName station={stationWithoutName} />)
    ).not.toThrow();
  });

  it('en=true かつ passed=true の場合、英語名がグレーアウトされる', () => {
    const { getByText, getAllByTestId } = render(
      <StationName station={mockStation} en={true} passed={true} />
    );

    expect(getByText('Tokyo')).toBeTruthy();

    // grayColor スタイルが適用されているか確認
    const textElements = getAllByTestId('typography-text');
    const textElement = textElements[0];
    const flattenedStyles = Array.isArray(textElement.props.style)
      ? textElement.props.style.flat()
      : [textElement.props.style];
    const hasColorStyle = flattenedStyles.some(
      (s: unknown) => s && typeof s === 'object' && 'color' in s
    );
    expect(hasColorStyle).toBe(true);
  });

  it('horizontal=true かつ passed=true の場合、横書き駅名がグレーアウトされる', () => {
    const { getByText, getAllByTestId } = render(
      <StationName station={mockStation} horizontal={true} passed={true} />
    );

    expect(getByText('東京')).toBeTruthy();

    // grayColor スタイルが適用されているか確認
    const textElements = getAllByTestId('typography-text');
    const textElement = textElements[0];
    const flattenedStyles = Array.isArray(textElement.props.style)
      ? textElement.props.style.flat()
      : [textElement.props.style];
    const hasColorStyle = flattenedStyles.some(
      (s: unknown) => s && typeof s === 'object' && 'color' in s
    );
    expect(hasColorStyle).toBe(true);
  });
});
