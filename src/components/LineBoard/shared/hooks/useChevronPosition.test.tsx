import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import { useChevronPosition } from './useChevronPosition';

// useScale フックをモック
jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({
    widthScale: (value: number) => value,
    heightScale: (value: number) => value,
    myWidth: 375,
    myHeight: 667,
  })),
}));

const TestComponent: React.FC<{
  index: number;
  arrived: boolean;
  passed: boolean;
}> = ({ index, arrived, passed }) => {
  const position = useChevronPosition(index, arrived, passed);
  return (
    <Text testID="position">
      {position ? JSON.stringify(position) : 'null'}
    </Text>
  );
};

describe('useChevronPosition', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('index が 0 かつ arrived が true の場合、左位置が -14 になる', () => {
    const { getByTestId } = render(
      <TestComponent index={0} arrived={true} passed={false} />
    );

    const position = getByTestId('position').props.children;
    expect(position).toBe(JSON.stringify({ left: -14 }));
  });

  it('index が 0 かつ arrived が false の場合、null を返す', () => {
    const { getByTestId } = render(
      <TestComponent index={0} arrived={false} passed={false} />
    );

    const position = getByTestId('position').props.children;
    expect(position).toBe('null');
  });

  it('index が 0 かつ arrived が false、passed が true の場合も null を返す', () => {
    const { getByTestId } = render(
      <TestComponent index={0} arrived={false} passed={true} />
    );

    const position = getByTestId('position').props.children;
    expect(position).toBe('null');
  });

  it('index > 0 かつ arrived が true の場合、計算された左位置を返す', () => {
    const { getByTestId } = render(
      <TestComponent index={2} arrived={true} passed={false} />
    );

    const position = getByTestId('position').props.children;
    // 41.75 * 2 - 14 = 83.5 - 14 = 69.5
    expect(position).toBe(JSON.stringify({ left: 69.5 }));
  });

  it('index > 0、arrived が false、passed が false の場合、左位置を返す', () => {
    const { getByTestId } = render(
      <TestComponent index={3} arrived={false} passed={false} />
    );

    const position = getByTestId('position').props.children;
    // 42 * 3 = 126
    expect(position).toBe(JSON.stringify({ left: 126 }));
  });

  it('index > 0、arrived が false、passed が true の場合、左位置を返す', () => {
    const { getByTestId } = render(
      <TestComponent index={4} arrived={false} passed={true} />
    );

    const position = getByTestId('position').props.children;
    // 42 * 4 = 168
    expect(position).toBe(JSON.stringify({ left: 168 }));
  });

  it('index が 1、arrived が true の場合の計算が正しい', () => {
    const { getByTestId } = render(
      <TestComponent index={1} arrived={true} passed={false} />
    );

    const position = getByTestId('position').props.children;
    // 41.75 * 1 - 14 = 27.75
    expect(position).toBe(JSON.stringify({ left: 27.75 }));
  });

  it('index が 5、arrived が false、passed が false の場合の計算が正しい', () => {
    const { getByTestId } = render(
      <TestComponent index={5} arrived={false} passed={false} />
    );

    const position = getByTestId('position').props.children;
    // 42 * 5 = 210
    expect(position).toBe(JSON.stringify({ left: 210 }));
  });
});
