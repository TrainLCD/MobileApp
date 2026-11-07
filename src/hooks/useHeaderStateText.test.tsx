import { renderHook } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import { APP_THEME, type AppTheme } from '~/models/Theme';
import { themeAtom } from '~/store/atoms/theme';
import { createStation } from '~/utils/test/factories';
import { headerStateAtom } from '../store/atoms/navigation';
import { selectedBoundAtom } from '../store/atoms/station';
import { useHeaderStateText } from './useHeaderStateText';
import { useLoopLine } from './useLoopLine';

jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('../translation', () => ({
  translate: (key: string) =>
    jest.requireActual('../../assets/translations/ja.json')[key],
}));

jest.mock('./useLoopLine', () => ({
  __esModule: true,
  useLoopLine: jest.fn(),
}));

const mockUseAtomValue = useAtomValue as jest.MockedFunction<
  typeof useAtomValue
>;
const mockUseLoopLine = useLoopLine as jest.MockedFunction<typeof useLoopLine>;

const osaki = createStation(1, { name: '大崎' });

const setAtomValues = (selectedBound: Station | null) => {
  mockUseAtomValue.mockImplementation((atom: unknown) => {
    if (atom === headerStateAtom) return 'CURRENT';
    if (atom === selectedBoundAtom) return selectedBound;
    if (atom === themeAtom) return APP_THEME.TOKYO_METRO;
    return undefined;
  });
};

const setLoopLine = (isLoopLine: boolean) => {
  mockUseLoopLine.mockReturnValue({
    isLoopLine,
    isYamanoteLine: isLoopLine,
    isOsakaLoopLine: false,
    isMeijoLine: false,
    isOedoLine: false,
    isDisneyResortLine: false,
    isPartiallyLoopLine: false,
    inboundStationsForLoopLine: [],
    outboundStationsForLoopLine: [],
  });
};

const renderStateTextRight = (headerLangState: HeaderLangState) =>
  renderHook(() =>
    useHeaderStateText({ isLast: false, headerLangState, firstStop: true })
  ).result.current.stateTextRight;

describe('useHeaderStateText', () => {
  beforeEach(() => {
    setAtomValues(osaki);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['EN', 'This is'],
    ['ZH', '这一站'],
    ['KO', '현재'],
  ] as const)('315系の現在駅を%sでは「%s」で案内する', (lang, expected) => {
    setLoopLine(false);
    let theme: AppTheme = APP_THEME.JR_315;
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === headerStateAtom) return `CURRENT_${lang}`;
      if (atom === selectedBoundAtom) return osaki;
      if (atom === themeAtom) return theme;
      return undefined;
    });
    const { result, rerender } = renderHook(() =>
      useHeaderStateText({
        isLast: false,
        headerLangState: lang,
        firstStop: false,
      })
    );
    expect(result.current.stateText).toBe(expected);
    for (const otherTheme of [APP_THEME.JR_KYUSHU, APP_THEME.TOKYO_METRO]) {
      theme = otherTheme;
      rerender({});
      expect(result.current.stateText).toBe('');
    }
    theme = APP_THEME.JR_315;
    rerender({});
    expect(result.current.stateText).toBe(expected);
  });

  it.each([false, true])(
    '315系だけ英語の接近案内をArriving atにする（終点=%s）',
    (isLast) => {
      setLoopLine(false);
      let theme: AppTheme = APP_THEME.JR_315;
      mockUseAtomValue.mockImplementation((atom: unknown) => {
        if (atom === headerStateAtom) return 'ARRIVING_EN';
        if (atom === selectedBoundAtom) return osaki;
        if (atom === themeAtom) return theme;
        return undefined;
      });
      const { result, rerender } = renderHook(() =>
        useHeaderStateText({ isLast, headerLangState: 'EN', firstStop: false })
      );
      expect(result.current.stateText).toBe(
        isLast ? 'Arriving at\nLast Stop' : 'Arriving at'
      );
      theme = APP_THEME.JR_KYUSHU;
      rerender({});
      expect(result.current.stateText).toBe(
        isLast ? 'Soon\nLast Stop' : 'Soon'
      );
    }
  );

  it('環状線の乗車直後は行先に続く語を「方面」にする', () => {
    setLoopLine(true);
    expect(renderStateTextRight('JA')).toBe('方面');
    expect(renderStateTextRight('KANA')).toBe('方面');
    expect(renderStateTextRight('KO')).toBe('방면');
  });

  it('環状線でない路線の乗車直後は「ゆき」のまま', () => {
    setLoopLine(false);
    expect(renderStateTextRight('JA')).toBe('ゆき');
    expect(renderStateTextRight('KANA')).toBe('ゆき');
    expect(renderStateTextRight('KO')).toBe('행');
  });

  it('乗車直後でなければ行先に続く語は出さない', () => {
    setLoopLine(true);
    const { result } = renderHook(() =>
      useHeaderStateText({
        isLast: false,
        headerLangState: 'JA',
        firstStop: false,
      })
    );
    expect(result.current.stateTextRight).toBe('');
  });
});
