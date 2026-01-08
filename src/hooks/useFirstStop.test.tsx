import { render, waitFor } from '@testing-library/react-native';
import { useAtom, useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { useFirstStop } from './useFirstStop';
import { usePrevious } from './usePrevious';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtom: jest.fn(),
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./usePrevious', () => ({
  __esModule: true,
  usePrevious: jest.fn(),
}));

const TestComponent: React.FC<{ shouldUpdate?: boolean }> = ({
  shouldUpdate = false,
}) => {
  const firstStop = useFirstStop(shouldUpdate);
  return <Text testID="firstStop">{String(firstStop)}</Text>;
};

describe('useFirstStop', () => {
  const mockUseAtom = useAtom as jest.MockedFunction<typeof useAtom>;
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUsePrevious = usePrevious as jest.MockedFunction<
    typeof usePrevious
  >;

  let setNavigationStateMock: jest.Mock;

  beforeEach(() => {
    setNavigationStateMock = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('firstStop=true の場合、trueを返す', () => {
    mockUseAtom.mockReturnValue([
      { firstStop: true },
      setNavigationStateMock,
    ] as unknown as ReturnType<typeof useAtom>);
    mockUseAtomValue.mockReturnValue({ arrived: false });
    mockUsePrevious.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('firstStop').props.children).toBe('true');
  });

  it('firstStop=false の場合、falseを返す', () => {
    mockUseAtom.mockReturnValue([
      { firstStop: false },
      setNavigationStateMock,
    ] as unknown as ReturnType<typeof useAtom>);
    mockUseAtomValue.mockReturnValue({ arrived: false });
    mockUsePrevious.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('firstStop').props.children).toBe('false');
  });

  it('shouldUpdate=false の場合、状態を更新しない', () => {
    mockUseAtom.mockReturnValue([
      { firstStop: true },
      setNavigationStateMock,
    ] as unknown as ReturnType<typeof useAtom>);
    mockUseAtomValue.mockReturnValue({ arrived: false });
    mockUsePrevious.mockReturnValue(true); // prevArrived=true, arrived=false

    render(<TestComponent shouldUpdate={false} />);
    expect(setNavigationStateMock).not.toHaveBeenCalled();
  });

  it('shouldUpdate=true, arrived=false, prevArrived=true の場合、firstStopをfalseに更新する', async () => {
    mockUseAtom.mockReturnValue([
      { firstStop: true },
      setNavigationStateMock,
    ] as unknown as ReturnType<typeof useAtom>);
    mockUseAtomValue.mockReturnValue({ arrived: false });
    mockUsePrevious.mockReturnValue(true); // prevArrived=true

    render(<TestComponent shouldUpdate={true} />);

    await waitFor(() => {
      expect(setNavigationStateMock).toHaveBeenCalled();
    });

    // setNavigationStateに渡された関数を実行して結果を確認
    const updateFn = setNavigationStateMock.mock.calls[0][0];
    const result = updateFn({ firstStop: true });
    expect(result.firstStop).toBe(false);
  });

  it('shouldUpdate=true, arrived=true の場合、状態を更新しない', () => {
    mockUseAtom.mockReturnValue([
      { firstStop: true },
      setNavigationStateMock,
    ] as unknown as ReturnType<typeof useAtom>);
    mockUseAtomValue.mockReturnValue({ arrived: true });
    mockUsePrevious.mockReturnValue(true);

    render(<TestComponent shouldUpdate={true} />);
    expect(setNavigationStateMock).not.toHaveBeenCalled();
  });

  it('shouldUpdate=true, prevArrived=false の場合、状態を更新しない', () => {
    mockUseAtom.mockReturnValue([
      { firstStop: true },
      setNavigationStateMock,
    ] as unknown as ReturnType<typeof useAtom>);
    mockUseAtomValue.mockReturnValue({ arrived: false });
    mockUsePrevious.mockReturnValue(false);

    render(<TestComponent shouldUpdate={true} />);
    expect(setNavigationStateMock).not.toHaveBeenCalled();
  });

  it('firstStop=false の場合、更新後もfalseのまま', async () => {
    mockUseAtom.mockReturnValue([
      { firstStop: false },
      setNavigationStateMock,
    ] as unknown as ReturnType<typeof useAtom>);
    mockUseAtomValue.mockReturnValue({ arrived: false });
    mockUsePrevious.mockReturnValue(true);

    render(<TestComponent shouldUpdate={true} />);

    await waitFor(() => {
      expect(setNavigationStateMock).toHaveBeenCalled();
    });

    // firstStopがfalseの場合、更新してもfalseのまま
    const updateFn = setNavigationStateMock.mock.calls[0][0];
    const result = updateFn({ firstStop: false });
    expect(result.firstStop).toBe(false);
  });
});
