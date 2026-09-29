import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import { TrainTypeKind } from '~/@types/graphql';
import { useCurrentLine } from '~/hooks';
import TrainTypeBoxSanyo from './TrainTypeBoxSanyo';

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(),
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key: string) => {
    const map: Record<string, string> = {
      local: '普通',
      localEn: 'Local',
      localZh: '普通',
      localKo: '보통',
    };
    return map[key] ?? key;
  }),
}));

const ltdExp = {
  __typename: 'TrainType',
  id: 1,
  typeId: 1,
  groupId: 1,
  name: '直通特急',
  nameKatakana: 'チョクツウトッキュウ',
  nameRoman: 'Limited Express',
  nameChinese: '特快',
  nameKorean: '직통특급',
  color: '#EC573D',
  kind: TrainTypeKind.LimitedExpress,
} as TrainType;

const renderBox = (
  trainType: TrainType | null,
  subLangState: 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO' = 'JA'
) =>
  render(
    <TrainTypeBoxSanyo
      trainType={trainType}
      subLangState={subLangState}
      width={150}
      height={60}
    />
  );

describe('TrainTypeBoxSanyo', () => {
  beforeEach(() => {
    (useCurrentLine as jest.Mock).mockReturnValue({
      id: 99637,
      nameShort: '山陽電鉄本線',
      transportType: 'RAIL',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('種別名を種別色の箱に出し、日本語の表示中は読みをひらがなで添える', () => {
    const { getByText, getByTestId } = renderBox(ltdExp);
    expect(getByText('直通特急')).toBeTruthy();
    expect(getByText('ちょくつうとっきゅう')).toBeTruthy();
    expect(
      StyleSheet.flatten(getByTestId('trainTypeBoxSanyo').props.style)
        .backgroundColor
    ).toBe('#EC573D');
  });

  it('中国語の表示中も1段目は日本語のまま、2段目だけを中国語にする', () => {
    const { getByText, queryByText } = renderBox(ltdExp, 'ZH');
    expect(getByText('直通特急')).toBeTruthy();
    expect(getByText('特快')).toBeTruthy();
    expect(queryByText('ちょくつうとっきゅう')).toBeNull();
  });

  it('英語の表示中は2段目にローマ字の種別名を略して出す', () => {
    const { getByText } = renderBox(ltdExp, 'EN');
    expect(getByText('直通特急')).toBeTruthy();
    expect(getByText('Ltd. Exp.')).toBeTruthy();
  });

  it('種別が無いときは普通として出す', () => {
    const { getByText } = renderBox(null);
    expect(getByText('普通')).toBeTruthy();
  });
});
