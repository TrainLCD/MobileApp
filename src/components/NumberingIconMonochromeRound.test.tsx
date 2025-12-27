import { render } from '@testing-library/react-native';
import NumberingIconMonochromeRound from './NumberingIconMonochromeRound';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconMonochromeRound', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正常にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconMonochromeRound stationNumber="01" />
    );
    expect(getByText('01')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconMonochromeRound stationNumber="01" withOutline={true} />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('異なるstationNumberでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconMonochromeRound stationNumber="99" />
    );
    expect(getByText('99')).toBeTruthy();
  });
});
