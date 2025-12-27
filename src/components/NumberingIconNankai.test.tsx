import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconNankai from './NumberingIconNankai';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('react-native-svg', () => {
  const _React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => <View {...(props as object)} />,
    Ellipse: (props: unknown) => (
      <View {...(props as object)} testID="ellipse" />
    ),
  };
});

describe('NumberingIconNankai', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconNankai lineColor="#0066cc" stationNumber="NK-01" />
    );
    expect(getByText('NK')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconNankai
        lineColor="#0066cc"
        stationNumber="NK-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('NK')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconNankai
        lineColor="#0066cc"
        stationNumber="NK-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconNankai lineColor="#0066cc" stationNumber="NK-42" />
    );
    expect(getByText('NK')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
  });
});
