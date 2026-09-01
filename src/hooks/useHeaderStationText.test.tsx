import { renderHook } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import { createStation } from '~/utils/test/factories';
import { headerStateAtom } from '../store/atoms/navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
} from '../store/atoms/station';
import { useHeaderStationText } from './useHeaderStationText';
import { useLoopLine } from './useLoopLine';

jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('./useLoopLine', () => ({
  __esModule: true,
  useLoopLine: jest.fn(),
}));

const mockUseAtomValue = useAtomValue as jest.MockedFunction<
  typeof useAtomValue
>;
const mockUseLoopLine = useLoopLine as jest.MockedFunction<typeof useLoopLine>;

const shibuya = createStation(1, {
  name: '渋谷',
  nameKatakana: 'シブヤ',
  nameRoman: 'Shibuya',
});
const harajuku = createStation(2, {
  name: '原宿',
  nameKatakana: 'ハラジュク',
  nameRoman: 'Harajuku',
});
const osaki = createStation(3, {
  name: '大崎',
  nameKatakana: 'オオサキ',
  nameRoman: 'Osaki',
});
const shinjuku = createStation(4, {
  name: '新宿',
  nameKatakana: 'シンジュク',
  nameRoman: 'Shinjuku',
  nameChinese: '新宿',
  nameKorean: '신주쿠',
});
const ikebukuro = createStation(5, {
  name: '池袋',
  nameKatakana: 'イケブクロ',
  nameRoman: 'Ikebukuro',
  nameChinese: '池袋',
  nameKorean: '이케부쿠로',
});

const setAtomValues = ({
  headerState,
  selectedBound,
  selectedDirection = 'INBOUND',
}: {
  headerState: string;
  selectedBound: Station | null;
  selectedDirection?: 'INBOUND' | 'OUTBOUND';
}) => {
  mockUseAtomValue.mockImplementation((atom: unknown) => {
    if (atom === headerStateAtom) return headerState;
    if (atom === selectedBoundAtom) return selectedBound;
    if (atom === selectedDirectionAtom) return selectedDirection;
    return undefined;
  });
};

const setLoopLine = (
  isLoopLine: boolean,
  {
    inbound = [] as Station[],
    outbound = [] as Station[],
  }: { inbound?: Station[]; outbound?: Station[] } = {}
) => {
  mockUseLoopLine.mockReturnValue({
    isLoopLine,
    isYamanoteLine: isLoopLine,
    isOsakaLoopLine: false,
    isMeijoLine: false,
    isOedoLine: false,
    isDisneyResortLine: false,
    isPartiallyLoopLine: false,
    inboundStationsForLoopLine: inbound,
    outboundStationsForLoopLine: outbound,
  });
};

const renderStationText = (
  headerLangState: HeaderLangState,
  firstStop: boolean
) =>
  renderHook(() =>
    useHeaderStationText({
      currentStation: shibuya,
      nextStation: harajuku,
      headerLangState,
      firstStop,
    })
  ).result.current;

describe('useHeaderStationText', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('環状線の乗車直後(firstStop)', () => {
    beforeEach(() => {
      setAtomValues({ headerState: 'CURRENT', selectedBound: osaki });
      setLoopLine(true, { inbound: [shinjuku, ikebukuro] });
    });

    it('終着駅ではなく方面の主要駅を並べる', () => {
      expect(renderStationText('JA', true)).toBe('新宿・池袋');
    });

    it('カナ表示ではひらがなにして並べる', () => {
      expect(renderStationText('KANA', true)).toBe('しんじゅく・いけぶくろ');
    });

    it('英語表示では & で並べる', () => {
      expect(renderStationText('EN', true)).toBe('Shinjuku & Ikebukuro');
    });

    it('中国語・韓国語表示でも方面の主要駅を並べる', () => {
      expect(renderStationText('ZH', true)).toBe('新宿・池袋');
      expect(renderStationText('KO', true)).toBe('신주쿠・이케부쿠로');
    });

    it('進行方向が外回りなら外回り側の主要駅を使う', () => {
      setAtomValues({
        headerState: 'CURRENT',
        selectedBound: osaki,
        selectedDirection: 'OUTBOUND',
      });
      setLoopLine(true, {
        inbound: [shinjuku, ikebukuro],
        outbound: [osaki, shinjuku],
      });
      expect(renderStationText('JA', true)).toBe('大崎・新宿');
    });
  });

  it('環状線でも firstStop でなければ従来どおり駅名を出す', () => {
    setAtomValues({ headerState: 'NEXT', selectedBound: osaki });
    setLoopLine(true, { inbound: [shinjuku, ikebukuro] });
    expect(renderStationText('JA', false)).toBe('原宿');
  });

  it('環状線でない路線の firstStop は終着駅を出す', () => {
    setAtomValues({ headerState: 'CURRENT', selectedBound: osaki });
    setLoopLine(false);
    expect(renderStationText('JA', true)).toBe('大崎');
  });

  it('環状線でも方面の主要駅が取れないときは終着駅に落とす', () => {
    setAtomValues({ headerState: 'CURRENT', selectedBound: osaki });
    setLoopLine(true, { inbound: [] });
    expect(renderStationText('JA', true)).toBe('大崎');
  });
});
