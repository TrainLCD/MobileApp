import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconSMR from './NumberingIconSMR';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconSMR', () => {
  it('withDarkTheme=falseでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSMR stationNumber="SM-01" withDarkTheme={false} />
    );
    expect(getByText('SM')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withDarkTheme=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSMR stationNumber="SM-01" withDarkTheme={true} />
    );
    expect(getByText('SM')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSMR
        stationNumber="SM-01"
        withDarkTheme={false}
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('SM')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSMR
        stationNumber="SM-01"
        withDarkTheme={false}
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('SM')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconSMR
        stationNumber="SM-01"
        withDarkTheme={false}
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconSMR stationNumber="SM-23" withDarkTheme={false} />
    );
    expect(getByText('SM')).toBeTruthy();
    expect(getByText('23')).toBeTruthy();
  });
});
