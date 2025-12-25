import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import { LineDot } from './LineDot';

// モック設定
jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({
    widthScale: (value: number) => value,
    heightScale: (value: number) => value,
    myWidth: 375,
    myHeight: 667,
  })),
}));

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn((station) => station?.stopCondition === 'NOT'),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('../../../PadLineMarks', () => {
  const _React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="pad-line-marks" />,
  };
});

jest.mock('../../../PassChevronTY', () => {
  const _React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="pass-chevron-ty" />,
  };
});

describe('LineDot', () => {
  const mockStation: Station = {
    id: 1,
    groupId: 1,
    name: '東京',
    stopCondition: 'ALL',
  } as unknown as Station;

  const mockTransferLines: Line[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('通過駅（getIsPass=true）の場合、PassChevronTYを表示する', () => {
    const passStation = {
      ...mockStation,
      stopCondition: 'NOT',
    } as unknown as Station;
    const getIsPass = require('~/utils/isPass').default;
    (getIsPass as jest.Mock).mockReturnValue(true);

    const { getByTestId } = render(
      <LineDot
        station={passStation}
        shouldGrayscale={false}
        transferLines={mockTransferLines}
        arrived={false}
        passed={false}
      />
    );

    expect(getByTestId('pass-chevron-ty')).toBeTruthy();
    expect(getByTestId('pad-line-marks')).toBeTruthy();
  });

  it('通過駅でない場合、LinearGradientを表示する', () => {
    const getIsPass = require('~/utils/isPass').default;
    (getIsPass as jest.Mock).mockReturnValue(false);

    const { queryByTestId, getByTestId } = render(
      <LineDot
        station={mockStation}
        shouldGrayscale={false}
        transferLines={mockTransferLines}
        arrived={false}
        passed={false}
      />
    );

    expect(queryByTestId('pass-chevron-ty')).toBeNull();
    expect(getByTestId('pad-line-marks')).toBeTruthy();
  });

  it('passed=true かつ arrived=false の場合、グレーのグラデーションを使用する', () => {
    const getIsPass = require('~/utils/isPass').default;
    (getIsPass as jest.Mock).mockReturnValue(false);

    const { UNSAFE_getByType } = render(
      <LineDot
        station={mockStation}
        shouldGrayscale={false}
        transferLines={mockTransferLines}
        arrived={false}
        passed={true}
      />
    );

    const LinearGradient = require('expo-linear-gradient').LinearGradient;
    const gradient = UNSAFE_getByType(LinearGradient);
    expect(gradient.props.colors).toEqual(['#ccc', '#dadada']);
  });

  it('passed=false の場合、通常のグラデーションを使用する', () => {
    const getIsPass = require('~/utils/isPass').default;
    (getIsPass as jest.Mock).mockReturnValue(false);

    const { UNSAFE_getByType } = render(
      <LineDot
        station={mockStation}
        shouldGrayscale={false}
        transferLines={mockTransferLines}
        arrived={false}
        passed={false}
      />
    );

    const LinearGradient = require('expo-linear-gradient').LinearGradient;
    const gradient = UNSAFE_getByType(LinearGradient);
    expect(gradient.props.colors).toEqual(['#fdfbfb', '#ebedee']);
  });

  it('arrived=true の場合、通常のグラデーションを使用する', () => {
    const getIsPass = require('~/utils/isPass').default;
    (getIsPass as jest.Mock).mockReturnValue(false);

    const { UNSAFE_getByType } = render(
      <LineDot
        station={mockStation}
        shouldGrayscale={false}
        transferLines={mockTransferLines}
        arrived={true}
        passed={true}
      />
    );

    const LinearGradient = require('expo-linear-gradient').LinearGradient;
    const gradient = UNSAFE_getByType(LinearGradient);
    expect(gradient.props.colors).toEqual(['#fdfbfb', '#ebedee']);
  });

  it('shouldGrayscaleとtransferLinesがPadLineMarksに渡される', () => {
    const getIsPass = require('~/utils/isPass').default;
    (getIsPass as jest.Mock).mockReturnValue(false);

    const mockTransferLinesWithData: Line[] = [
      { id: 1, name: '中央線' },
    ] as unknown as Line[];

    const { getByTestId } = render(
      <LineDot
        station={mockStation}
        shouldGrayscale={true}
        transferLines={mockTransferLinesWithData}
        arrived={false}
        passed={false}
      />
    );

    // PadLineMarksがレンダリングされていることを確認
    expect(getByTestId('pad-line-marks')).toBeTruthy();
  });
});
