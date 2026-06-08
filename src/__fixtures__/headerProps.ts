import type {
  CommonHeaderProps,
  HeaderE235Props,
} from '~/components/Header.types';
import { TOEI_SHINJUKU_LINE_LOCAL } from './line';
import { TOEI_SHINJUKU_LINE_STATIONS } from './station';

const mockStation = TOEI_SHINJUKU_LINE_STATIONS[0];
const mockNextStation = TOEI_SHINJUKU_LINE_STATIONS[1];

/**
 * テスト用のCommonHeaderPropsモック
 */
export const createMockHeaderProps = (
  overrides: Partial<CommonHeaderProps> = {}
): CommonHeaderProps => ({
  currentStation: mockStation,
  currentLine: TOEI_SHINJUKU_LINE_LOCAL,
  nextStation: mockNextStation,
  selectedBound: null,
  arrived: false,
  headerState: 'CURRENT',
  headerTransitionDelay: 300,
  headerLangState: 'JA',
  stationText: mockStation.name ?? 'Test Station',
  stateText: '',
  stateTextRight: '',
  boundText: '',
  currentStationNumber: undefined,
  threeLetterCode: undefined,
  numberingColor: '#000000',
  trainType: null,
  isLast: false,
  firstStop: false,
  connectedLines: [],
  connectionText: '',
  isJapaneseState: true,
  ...overrides,
});

/**
 * テスト用のHeaderE235Propsモック
 */
export const createMockHeaderE235Props = (
  overrides: Partial<HeaderE235Props> = {}
): HeaderE235Props => ({
  ...createMockHeaderProps(),
  isJO: false,
  ...overrides,
});
