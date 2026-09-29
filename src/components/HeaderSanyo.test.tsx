import { render } from '@testing-library/react-native';
import type { Station } from '~/@types/graphql';
import { createMockHeaderProps } from '~/__fixtures__/headerProps';
import HeaderSanyo from './HeaderSanyo';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(() => []),
}));

const himeji = {
  id: 99,
  groupId: 99,
  name: '山陽姫路',
  nameKatakana: 'サンヨウヒメジ',
  nameRoman: 'Sanyo-Himeji',
  nameChinese: '山阳姬路',
  nameKorean: '산요히메지',
} as Station;

const tarumi = {
  id: 11,
  groupId: 11,
  name: '垂水',
  nameKatakana: 'タルミ',
  nameRoman: 'Tarumi',
  nameChinese: '垂水',
  nameKorean: '다루미',
} as Station;

const suma = {
  id: 8,
  groupId: 8,
  name: '須磨',
  nameKatakana: 'スマ',
  nameRoman: 'Suma',
  nameChinese: '须磨',
  nameKorean: '스마',
} as Station;

jest.mock('~/hooks', () => ({
  useBounds: jest.fn(() => ({ directionalStops: [himeji] })),
  useDisplayNextStation: jest.fn(() => tarumi),
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 800, height: 400 })),
  useLoopLine: jest.fn(() => ({ isLoopLine: false })),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('./HeaderStationName', () => {
  const { Text } = require('react-native');
  return ({ text }: { text: string }) => <Text>{text}</Text>;
});

jest.mock('./NumberingIcon', () => {
  const { View } = require('react-native');
  return function MockNumberingIcon() {
    return <View testID="NumberingIcon" />;
  };
});

jest.mock('./TrainTypeBoxSanyo', () => {
  const { Text } = require('react-native');
  return function MockTrainTypeBoxSanyo({
    subLangState,
  }: {
    subLangState: string;
  }) {
    return <Text testID="TrainTypeBoxSanyo">{subLangState}</Text>;
  };
});

const nextProps = (headerLangState: 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO') =>
  createMockHeaderProps({
    selectedBound: himeji,
    currentStation: suma,
    headerState: headerLangState === 'JA' ? 'NEXT' : `NEXT_${headerLangState}`,
    headerLangState,
  });

describe('HeaderSanyo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('日本語の表示中は、駅名と行先の下に読みをひらがなで添える', () => {
    const { getByText } = render(<HeaderSanyo {...nextProps('JA')} />);
    expect(getByText('つぎは')).toBeTruthy();
    expect(getByText('垂水')).toBeTruthy();
    expect(getByText('たるみ')).toBeTruthy();
    expect(getByText('山陽姫路')).toBeTruthy();
    expect(getByText('ゆき')).toBeTruthy();
    expect(getByText('さんようひめじ')).toBeTruthy();
  });

  it('中国語の表示中も主表示は日本語のまま、補足の行だけを簡体字にする', () => {
    const { getByText, getAllByText, queryByText } = render(
      <HeaderSanyo {...nextProps('ZH')} />
    );
    expect(getByText('つぎは')).toBeTruthy();
    // 「垂水」は中国語でも同じ字のため、主表示と補足の行の両方に出る
    expect(getAllByText('垂水')).toHaveLength(2);
    expect(getByText('下一站')).toBeTruthy();
    expect(getByText('开往')).toBeTruthy();
    expect(getByText('山阳姬路')).toBeTruthy();
    expect(queryByText('たるみ')).toBeNull();
  });

  it('英語の表示中は補足の行を英語にする', () => {
    const { getByText } = render(<HeaderSanyo {...nextProps('EN')} />);
    expect(getByText('垂水')).toBeTruthy();
    expect(getByText('Tarumi')).toBeTruthy();
    expect(getByText('Sanyo-Himeji')).toBeTruthy();
    expect(getByText('for')).toBeTruthy();
  });

  it('停車中は「ただいま」と停車中の駅を出す', () => {
    const { getByText } = render(
      <HeaderSanyo
        {...createMockHeaderProps({
          selectedBound: himeji,
          currentStation: suma,
          headerState: 'CURRENT_ZH',
          headerLangState: 'ZH',
        })}
      />
    );
    expect(getByText('ただいま')).toBeTruthy();
    expect(getByText('須磨')).toBeTruthy();
    expect(getByText('这一站')).toBeTruthy();
  });

  it('種別の箱に補足の行の言語を渡す', () => {
    const { getByTestId } = render(<HeaderSanyo {...nextProps('KO')} />);
    expect(getByTestId('TrainTypeBoxSanyo').props.children).toBe('KO');
  });

  it('駅番号があるときはナンバリングを描く', () => {
    const { getByTestId } = render(
      <HeaderSanyo
        {...createMockHeaderProps({
          currentStationNumber: {
            __typename: 'StationNumber',
            lineSymbol: 'SY',
            lineSymbolColor: '#E60012',
            lineSymbolShape: 'SANYO',
            stationNumber: 'SY-11',
          },
        })}
      />
    );
    expect(getByTestId('NumberingIcon')).toBeTruthy();
  });
});
