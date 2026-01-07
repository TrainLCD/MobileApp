import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { createStation } from '~/utils/test/factories';
import { TOEI_OEDO_LINE_ID } from '../constants/line';
import {
  TOEI_OEDO_LINE_RYOGOKU_STATION_ID,
  TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER,
  TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID,
} from '../constants/station';
import { useBounds } from './useBounds';
import { useBoundText } from './useBoundText';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useBounds', () => ({
  __esModule: true,
  useBounds: jest.fn(),
}));

jest.mock('./useCurrentLine', () => ({
  __esModule: true,
  useCurrentLine: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

jest.mock('./useLoopLine', () => ({
  __esModule: true,
  useLoopLine: jest.fn(),
}));

const TestComponent: React.FC<{ excludePrefixAndSuffix?: boolean }> = ({
  excludePrefixAndSuffix,
}) => {
  const boundText = useBoundText(excludePrefixAndSuffix);
  return <Text testID="boundText">{JSON.stringify(boundText)}</Text>;
};

describe('useBoundText', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseBounds = useBounds as jest.MockedFunction<typeof useBounds>;
  const mockUseCurrentLine = useCurrentLine as jest.MockedFunction<
    typeof useCurrentLine
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseLoopLine = useLoopLine as jest.MockedFunction<
    typeof useLoopLine
  >;

  const shibuya = createStation(1, {
    groupId: 1,
    name: '渋谷',
    nameRoman: 'Shibuya',
    nameChinese: '涩谷',
    nameKorean: '시부야',
    nameKatakana: '渋谷',
  });
  const shinjuku = createStation(2, {
    groupId: 2,
    name: '新宿',
    nameRoman: 'Shinjuku',
    nameChinese: '新宿',
    nameKorean: '신주쿠',
    nameKatakana: '新宿',
  });

  beforeEach(() => {
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    mockUseCurrentLine.mockReturnValue(null);
    mockUseCurrentStation.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selectedBoundがnullの場合、TrainLCDを返す', () => {
    mockUseAtomValue.mockReturnValue({
      selectedBound: null,
      selectedDirection: 'INBOUND',
      stations: [],
    });
    mockUseBounds.mockReturnValue({
      directionalStops: [],
      bounds: [[], []],
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('boundText').props.children);

    expect(result.JA).toBe('TrainLCD');
    expect(result.EN).toBe('TrainLCD');
    expect(result.ZH).toBe('TrainLCD');
    expect(result.KO).toBe('TrainLCD');
    expect(result.KANA).toBe('TrainLCD');
  });

  it('通常路線で行先テキストを返す（接尾辞あり）', () => {
    mockUseAtomValue.mockReturnValue({
      selectedBound: shibuya,
      selectedDirection: 'INBOUND',
      stations: [shinjuku, shibuya],
    });
    mockUseBounds.mockReturnValue({
      directionalStops: [shibuya],
      bounds: [[shibuya], []],
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('boundText').props.children);

    expect(result.JA).toBe('渋谷 ゆき');
    expect(result.EN).toBe('for Shibuya');
    expect(result.ZH).toBe('开往 涩谷');
    expect(result.KO).toBe('시부야 행');
  });

  it('excludePrefixAndSuffix=trueの場合、接尾辞なしで返す', () => {
    mockUseAtomValue.mockReturnValue({
      selectedBound: shibuya,
      selectedDirection: 'INBOUND',
      stations: [shinjuku, shibuya],
    });
    mockUseBounds.mockReturnValue({
      directionalStops: [shibuya],
      bounds: [[shibuya], []],
    });

    const { getByTestId } = render(
      <TestComponent excludePrefixAndSuffix={true} />
    );
    const result = JSON.parse(getByTestId('boundText').props.children);

    expect(result.JA).toBe('渋谷');
    expect(result.EN).toBe('Shibuya');
    expect(result.ZH).toBe('涩谷');
    expect(result.KO).toBe('시부야');
  });

  it('環状線の場合、「方面」を使用する', () => {
    mockUseLoopLine.mockReturnValue({
      isLoopLine: true,
      isYamanoteLine: true,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    mockUseAtomValue.mockReturnValue({
      selectedBound: shibuya,
      selectedDirection: 'INBOUND',
      stations: [shinjuku, shibuya],
    });
    mockUseBounds.mockReturnValue({
      directionalStops: [shibuya],
      bounds: [[shibuya], []],
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('boundText').props.children);

    expect(result.JA).toBe('渋谷 方面');
  });

  it('複数の行先駅がある場合、・で連結する', () => {
    mockUseAtomValue.mockReturnValue({
      selectedBound: shibuya,
      selectedDirection: 'INBOUND',
      stations: [shinjuku, shibuya],
    });
    mockUseBounds.mockReturnValue({
      directionalStops: [shinjuku, shibuya],
      bounds: [[shinjuku, shibuya], []],
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('boundText').props.children);

    expect(result.JA).toBe('新宿・渋谷 ゆき');
    expect(result.EN).toBe('for Shinjuku & Shibuya');
    expect(result.ZH).toBe('开往 新宿・涩谷');
    expect(result.KO).toBe('신주쿠・시부야 행');
  });

  describe('大江戸線特殊処理', () => {
    const tochomae = createStation(TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER, {
      groupId: 100,
      name: '都庁前',
      nameRoman: 'Tochomae',
      nameChinese: '都厅前',
      nameKorean: '도청앞',
      nameKatakana: '都庁前',
    });
    const ryogoku = createStation(TOEI_OEDO_LINE_RYOGOKU_STATION_ID, {
      groupId: 101,
      name: '両国',
      nameRoman: 'Ryogoku',
      nameChinese: '两国',
      nameKorean: '료고쿠',
      nameKatakana: '両国',
    });
    const hikarigaoka = createStation(103, {
      groupId: 103,
      name: '光が丘',
      nameRoman: 'Hikarigaoka',
      nameChinese: '光丘',
      nameKorean: '히카리가오카',
      nameKatakana: '光が丘',
    });

    beforeEach(() => {
      mockUseCurrentLine.mockReturnValue({
        id: TOEI_OEDO_LINE_ID,
        nameFull: '都営大江戸線',
      } as ReturnType<typeof useCurrentLine>);
    });

    it('大江戸線INBOUND、両国以降の駅で経由表示', () => {
      mockUseAtomValue.mockReturnValue({
        selectedBound: hikarigaoka,
        selectedDirection: 'INBOUND',
        stations: [],
      });
      mockUseBounds.mockReturnValue({
        directionalStops: [tochomae, hikarigaoka],
        bounds: [[tochomae, hikarigaoka], []],
      });
      mockUseCurrentStation.mockReturnValue(ryogoku);

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('boundText').props.children);

      expect(result.JA).toBe('都庁前経由 光が丘ゆき');
      expect(result.EN).toBe('for Hikarigaoka via Tochomae');
    });

    it('大江戸線OUTBOUND、築地市場以前の駅で経由表示', () => {
      mockUseAtomValue.mockReturnValue({
        selectedBound: hikarigaoka,
        selectedDirection: 'OUTBOUND',
        stations: [],
      });
      mockUseBounds.mockReturnValue({
        directionalStops: [tochomae, hikarigaoka],
        bounds: [[tochomae, hikarigaoka], []],
      });
      // 築地市場より小さいIDの駅
      const beforeTsukijishijo = createStation(
        TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID - 1,
        {
          groupId: 104,
          name: '汐留',
          nameRoman: 'Shiodome',
          nameChinese: '汐留',
          nameKorean: '시오도메',
          nameKatakana: '汐留',
        }
      );
      mockUseCurrentStation.mockReturnValue(beforeTsukijishijo);

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('boundText').props.children);

      expect(result.JA).toBe('都庁前経由 光が丘ゆき');
    });

    it('大江戸線、都庁前以外の行先で経由表示', () => {
      mockUseAtomValue.mockReturnValue({
        selectedBound: hikarigaoka,
        selectedDirection: 'INBOUND',
        stations: [],
      });
      mockUseBounds.mockReturnValue({
        directionalStops: [tochomae, hikarigaoka],
        bounds: [[tochomae, hikarigaoka], []],
      });
      // 両国より前の駅（経由表示されないケース）
      const beforeRyogoku = createStation(
        TOEI_OEDO_LINE_RYOGOKU_STATION_ID - 1,
        {
          groupId: 105,
          name: '蔵前',
          nameRoman: 'Kuramae',
          nameChinese: '藏前',
          nameKorean: '구라마에',
          nameKatakana: '蔵前',
        }
      );
      mockUseCurrentStation.mockReturnValue(beforeRyogoku);

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('boundText').props.children);

      // 都庁前行きではないので経由表示
      expect(result.JA).toBe('都庁前経由 光が丘ゆき');
    });

    it('大江戸線、excludePrefixAndSuffix=trueの場合、経由表示なし', () => {
      mockUseAtomValue.mockReturnValue({
        selectedBound: hikarigaoka,
        selectedDirection: 'INBOUND',
        stations: [],
      });
      mockUseBounds.mockReturnValue({
        directionalStops: [tochomae, hikarigaoka],
        bounds: [[tochomae, hikarigaoka], []],
      });
      mockUseCurrentStation.mockReturnValue(ryogoku);

      const { getByTestId } = render(
        <TestComponent excludePrefixAndSuffix={true} />
      );
      const result = JSON.parse(getByTestId('boundText').props.children);

      expect(result.JA).toBe('都庁前・光が丘');
    });
  });
});
