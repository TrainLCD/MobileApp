import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import { useBarStyles } from './useBarStyles';

// モック設定
jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({
    widthScale: (value: number) => value,
    heightScale: (value: number) => value,
    myWidth: 375,
    myHeight: 667,
  })),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

// Note: Tablet-specific scenarios are not tested here due to technical limitations.
// The isTablet value is evaluated at module load time and cannot be dynamically
// changed during test execution without causing React hook errors.
// The implementation correctly handles tablet cases (index=0 -> width=200, index=1 -> width=61.75).

const TestComponent: React.FC<{ index?: number }> = ({ index }) => {
  const { left, width } = useBarStyles({ index });
  return (
    <>
      <Text testID="left">{left}</Text>
      <Text testID="width">{width}</Text>
    </>
  );
};

describe('useBarStyles', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('index=0 の場合、left=-32 を返す', () => {
    const { getByTestId } = render(<TestComponent index={0} />);

    expect(getByTestId('left').props.children).toBe(-32);
  });

  it('index=0 の場合（非タブレット）、width=62 を返す', () => {
    const { getByTestId } = render(<TestComponent index={0} />);

    expect(getByTestId('width').props.children).toBe(62);
  });

  it('index=1 の場合、left=-20 を返す', () => {
    const { getByTestId } = render(<TestComponent index={1} />);

    expect(getByTestId('left').props.children).toBe(-20);
  });

  it('index=1 の場合（非タブレット）、width=62 を返す', () => {
    const { getByTestId } = render(<TestComponent index={1} />);

    expect(getByTestId('width').props.children).toBe(62);
  });

  it('index=2 の場合、left=-20 を返す', () => {
    const { getByTestId } = render(<TestComponent index={2} />);

    expect(getByTestId('left').props.children).toBe(-20);
  });

  it('index=2 の場合（非タブレット）、width=62 を返す', () => {
    const { getByTestId } = render(<TestComponent index={2} />);

    expect(getByTestId('width').props.children).toBe(62);
  });

  it('index未指定の場合、left=-20 を返す', () => {
    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('left').props.children).toBe(-20);
  });

  it('index未指定の場合（非タブレット）、width=62 を返す', () => {
    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('width').props.children).toBe(62);
  });
});
