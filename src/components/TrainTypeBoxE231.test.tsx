import { render } from '@testing-library/react-native';
import type React from 'react';
import type { TrainType } from '~/@types/graphql';
import { TrainTypeKind } from '~/@types/graphql';
import { headerStateAtom } from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';

// SvgのText要素を通常のText要素として扱うことで、getByTextでテキスト検証できるようにする
jest.mock('react-native-svg', () => {
  const _React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: { children?: React.ReactNode }) => (
      <View {...(props as object)} />
    ),
    Svg: (props: { children?: React.ReactNode }) => (
      <View {...(props as object)} />
    ),
    G: (props: { children?: React.ReactNode }) => (
      <View {...(props as object)} />
    ),
    Text: ({
      children,
      fill,
      ...rest
    }: {
      children?: React.ReactNode;
      fill?: string;
    }) => {
      // strokeのみ・fill="none"の要素は描画文字としてはダブるためスキップする
      if (fill === 'none') {
        return null;
      }
      return <Text {...(rest as object)}>{children}</Text>;
    },
  };
});

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
  useCurrentLine: jest.fn(() => ({
    id: 1,
    nameShort: 'テスト',
    lineType: 'Normal',
  })),
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key: string) => {
    const dict: Record<string, string> = {
      local: '普通',
      localEn: 'Local',
      localZh: '普通',
      localKo: '보통',
    };
    return dict[key] ?? key;
  }),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/rfValue', () => ({
  RFValue: jest.fn((v: number) => v),
}));

jest.mock('~/utils/truncateTrainType', () => ({
  __esModule: true,
  default: jest.fn((name: string | null | undefined) => name ?? ''),
}));

jest.mock('~/utils/line', () => ({
  isBusLine: jest.fn(() => false),
}));

import TrainTypeBoxE231 from './TrainTypeBoxE231';

const baseTrainType = (overrides: Partial<TrainType> = {}): TrainType => ({
  __typename: 'TrainType',
  id: 1,
  typeId: 1,
  groupId: 1,
  name: '通勤快速',
  nameKatakana: 'ツウキンカイソク',
  nameRoman: 'Commuter Rapid',
  nameIpa: null,
  nameRomanIpa: null,
  nameTtsSegments: null,
  nameChinese: '通勤快速',
  nameKorean: '통근쾌속',
  color: '#FF0000',
  direction: null,
  kind: TrainTypeKind.CommuterRapid,
  line: null,
  lines: null,
  ...overrides,
});

const setHeaderLangState = (
  state: 'CURRENT' | 'CURRENT_EN' | 'CURRENT_ZH' | 'CURRENT_KO'
) => {
  const { useAtomValue } = require('jotai');
  // 渡されたatomの同一性で読み出し値を出し分ける
  (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
    if (atom === isLEDThemeAtom) {
      return false;
    }
    if (atom === headerStateAtom) {
      return state;
    }
    return undefined;
  });
};

describe('TrainTypeBoxE231 - CommuterRapid種別の表示', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('日本語表示 (CURRENT)', () => {
    beforeEach(() => setHeaderLangState('CURRENT'));

    it('4文字以下の名称はそのまま2行に分割して表示される', () => {
      const { getByText } = render(
        <TrainTypeBoxE231 trainType={baseTrainType({ name: '通勤快速' })} />
      );
      // formatCjk: 4文字 → "通勤\n快速"
      expect(getByText('通勤')).toBeTruthy();
      expect(getByText('快速')).toBeTruthy();
    });

    it('5文字以上の名称はkindベースの短縮名にフォールバックする', () => {
      const { getByText } = render(
        <TrainTypeBoxE231
          trainType={baseTrainType({ name: '通勤快速サービス' })}
        />
      );
      // SHORT_NAME_JA[CommuterRapid] = "通勤\n快速"
      expect(getByText('通勤')).toBeTruthy();
      expect(getByText('快速')).toBeTruthy();
    });
  });

  describe('英語表示 (CURRENT_EN)', () => {
    beforeEach(() => setHeaderLangState('CURRENT_EN'));

    it('日本語名が「通勤快速」のときSHORT_NAME_EN経由で"Commuter\\nRapid"が表示される', () => {
      const { getByText } = render(
        <TrainTypeBoxE231 trainType={baseTrainType({ name: '通勤快速' })} />
      );
      expect(getByText('Commuter')).toBeTruthy();
      expect(getByText('Rapid')).toBeTruthy();
    });

    it('日本語名が長くjaAbbreviated経路に入っても"Commuter\\nRapid"が表示される', () => {
      const { getByText } = render(
        <TrainTypeBoxE231
          trainType={baseTrainType({ name: '通勤快速サービス' })}
        />
      );
      expect(getByText('Commuter')).toBeTruthy();
      expect(getByText('Rapid')).toBeTruthy();
    });

    it('CommuterRapid以外（Rapid）の場合は"Rapid"のみが表示される', () => {
      const { queryByText, getByText } = render(
        <TrainTypeBoxE231
          trainType={baseTrainType({
            name: 'よくわからない長い快速',
            kind: TrainTypeKind.Rapid,
          })}
        />
      );
      expect(getByText('Rapid')).toBeTruthy();
      expect(queryByText('Commuter')).toBeNull();
    });
  });

  describe('中国語表示 (CURRENT_ZH)', () => {
    beforeEach(() => setHeaderLangState('CURRENT_ZH'));

    it('5文字以上の場合、SHORT_NAME_ZH[CommuterRapid]の"通勤\\n快速"が表示される', () => {
      const { getByText } = render(
        <TrainTypeBoxE231
          trainType={baseTrainType({
            name: '通勤快速サービス',
            nameChinese: '通勤快速服务',
          })}
        />
      );
      expect(getByText('通勤')).toBeTruthy();
      expect(getByText('快速')).toBeTruthy();
    });
  });

  describe('韓国語表示 (CURRENT_KO)', () => {
    beforeEach(() => setHeaderLangState('CURRENT_KO'));

    it('5文字以上の場合、SHORT_NAME_KO[CommuterRapid]の"통근\\n쾌속"が表示される', () => {
      const { getByText } = render(
        <TrainTypeBoxE231
          trainType={baseTrainType({
            name: '通勤快速サービス',
            nameKorean: '통근쾌속서비스',
          })}
        />
      );
      expect(getByText('통근')).toBeTruthy();
      expect(getByText('쾌속')).toBeTruthy();
    });
  });
});
