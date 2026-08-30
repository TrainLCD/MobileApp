import { render } from '@testing-library/react-native';
import { createMockHeaderProps } from '~/__fixtures__/headerProps';
import HeaderLowPower from './HeaderLowPower';

jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 720, height: 360 })),
  useTransferLines: jest.fn(() => []),
  useEstimateArrivalTimes: jest.fn(() => ({ route: null })),
  useEstimatedMinutesByStationId: jest.fn(() => new Map()),
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key: string) => {
    const dict: Record<string, string> = {
      local: '各駅停車',
      localEn: 'Local',
      arrivingIn: '到着まで',
      arrivingInEn: 'Arriving in',
      stopped: '停車中',
      stoppedEn: 'Stopped',
      soon: 'まもなく',
      soonEn: 'Soon',
      transferShort: 'のりかえ',
      transferShortEn: 'Transfer',
    };
    return dict[key] ?? key;
  }),
}));

const { useEstimatedMinutesByStationId, useTransferLines } = require('~/hooks');

describe('HeaderLowPower', () => {
  const props = createMockHeaderProps();
  const nextStationId = props.nextStation?.id as number;

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setEstimatedMinutes = (minutes: number | null) => {
    useEstimatedMinutesByStationId.mockReturnValue(
      minutes == null ? new Map() : new Map([[nextStationId, minutes]])
    );
  };

  it('次駅表示では状態・駅名・到着予測を出す', () => {
    setEstimatedMinutes(2);
    const { getByText } = render(
      <HeaderLowPower
        {...createMockHeaderProps({
          headerState: 'NEXT',
          stateText: '次は',
          stationText: '自由が丘',
        })}
      />
    );

    expect(getByText('次は')).toBeTruthy();
    expect(getByText('到着まで')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('分')).toBeTruthy();
  });

  it('到着予測が取れないときは到着まわりを描画しない', () => {
    setEstimatedMinutes(null);
    const { queryByText } = render(
      <HeaderLowPower
        {...createMockHeaderProps({ headerState: 'NEXT', stateText: '次は' })}
      />
    );

    expect(queryByText('到着まで')).toBeNull();
    expect(queryByText('分')).toBeNull();
  });

  it('接近中は分数の代わりに「まもなく」を出す', () => {
    setEstimatedMinutes(1);
    const { getAllByText, queryByText } = render(
      <HeaderLowPower
        {...createMockHeaderProps({
          headerState: 'ARRIVING',
          stateText: 'まもなく',
        })}
      />
    );

    // 状態ラベルと到着欄の両方が「まもなく」になる
    expect(getAllByText('まもなく')).toHaveLength(2);
    expect(queryByText('到着まで')).toBeNull();
  });

  it('停車中は「停車中」を出す', () => {
    setEstimatedMinutes(2);
    const { getByText, queryByText } = render(
      <HeaderLowPower {...createMockHeaderProps({ headerState: 'CURRENT' })} />
    );

    expect(getByText('停車中')).toBeTruthy();
    expect(queryByText('到着まで')).toBeNull();
  });

  it('英語表示では英語のラベルを使う', () => {
    setEstimatedMinutes(3);
    const { getByText } = render(
      <HeaderLowPower
        {...createMockHeaderProps({
          headerState: 'NEXT_EN',
          isJapaneseState: false,
          stateText: 'Next',
        })}
      />
    );

    expect(getByText('Arriving in')).toBeTruthy();
    expect(getByText('min.')).toBeTruthy();
  });

  it('乗換路線があるときだけ乗換ブロックを出す', () => {
    setEstimatedMinutes(2);
    const { queryByText, rerender, getByText } = render(
      <HeaderLowPower {...createMockHeaderProps({ headerState: 'NEXT' })} />
    );
    expect(queryByText('のりかえ')).toBeNull();

    useTransferLines.mockReturnValue([
      { nameShort: '東急大井町線', nameRoman: 'Tokyu Oimachi Line' },
    ]);
    rerender(
      <HeaderLowPower {...createMockHeaderProps({ headerState: 'NEXT' })} />
    );

    expect(getByText('のりかえ')).toBeTruthy();
    expect(getByText('東急大井町線')).toBeTruthy();
  });

  it('乗換路線が上限を超えたら残りを「他N」に畳む', () => {
    setEstimatedMinutes(2);
    useTransferLines.mockReturnValue(
      ['A線', 'B線', 'C線', 'D線', 'E線'].map((nameShort) => ({
        nameShort,
        nameRoman: nameShort,
      }))
    );

    const { getByText } = render(
      <HeaderLowPower {...createMockHeaderProps({ headerState: 'NEXT' })} />
    );

    expect(getByText('A線・B線・C線 他2')).toBeTruthy();
  });
});
