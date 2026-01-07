import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import { createLine } from '~/utils/test/factories';
import { useConnectedLines } from './useConnectedLines';
import { useNextLine } from './useNextLine';

jest.mock('./useConnectedLines', () => ({
  __esModule: true,
  useConnectedLines: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const nextLine = useNextLine();
  return (
    <Text testID="nextLine">
      {nextLine ? JSON.stringify({ id: nextLine.id }) : 'undefined'}
    </Text>
  );
};

describe('useNextLine', () => {
  const mockUseConnectedLines = useConnectedLines as jest.MockedFunction<
    typeof useConnectedLines
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('connectedLinesが空の場合、undefinedを返す', () => {
    mockUseConnectedLines.mockReturnValue([]);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('nextLine').props.children).toBe('undefined');
  });

  it('connectedLinesに要素がある場合、最初の要素を返す', () => {
    const lines = [
      createLine(1, { nameShort: 'Line1' }),
      createLine(2, { nameShort: 'Line2' }),
    ];
    mockUseConnectedLines.mockReturnValue(lines);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('nextLine').props.children).toBe(
      JSON.stringify({ id: 1 })
    );
  });

  it('connectedLinesに1つだけ要素がある場合、その要素を返す', () => {
    const lines = [createLine(3, { nameShort: 'Line3' })];
    mockUseConnectedLines.mockReturnValue(lines);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('nextLine').props.children).toBe(
      JSON.stringify({ id: 3 })
    );
  });

  it('connectedLinesが更新されたら、新しい最初の要素を返す', () => {
    mockUseConnectedLines.mockReturnValue([
      createLine(1, { nameShort: 'Line1' }),
    ]);

    const { getByTestId, rerender } = render(<TestComponent />);
    expect(getByTestId('nextLine').props.children).toBe(
      JSON.stringify({ id: 1 })
    );

    // 更新
    mockUseConnectedLines.mockReturnValue([
      createLine(5, { nameShort: 'Line5' }),
      createLine(6, { nameShort: 'Line6' }),
    ]);
    rerender(<TestComponent />);
    expect(getByTestId('nextLine').props.children).toBe(
      JSON.stringify({ id: 5 })
    );
  });
});
