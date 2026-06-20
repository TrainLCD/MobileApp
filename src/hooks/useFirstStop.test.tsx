import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { firstStopAtom } from '~/store/atoms/navigation';
import { arrivedAtom } from '~/store/atoms/station';
import { useFirstStop } from './useFirstStop';
import { usePrevious } from './usePrevious';

jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
  useSetAtom: jest.fn(),
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
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseSetAtom = useSetAtom as jest.MockedFunction<typeof useSetAtom>;
  const mockUsePrevious = usePrevious as jest.MockedFunction<
    typeof usePrevious
  >;

  let setNavigationStateMock: jest.Mock;

  const mockAtomValues = ({
    firstStop,
    arrived,
  }: {
    firstStop: boolean;
    arrived: boolean;
  }) => {
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === firstStopAtom) {
        return firstStop;
      }
      if (atom === arrivedAtom) {
        return arrived;
      }
      return undefined;
    });
  };

  beforeEach(() => {
    setNavigationStateMock = jest.fn();
    mockUseSetAtom.mockReturnValue(setNavigationStateMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('firstStop=true の場合、trueを返す', () => {
    mockAtomValues({ firstStop: true, arrived: false });
    mockUsePrevious.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('firstStop').props.children).toBe('true');
  });

  it('firstStop=false の場合、falseを返す', () => {
    mockAtomValues({ firstStop: false, arrived: false });
    mockUsePrevious.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('firstStop').props.children).toBe('false');
  });

  it('shouldUpdate=false の場合、状態を更新しない', () => {
    mockAtomValues({ firstStop: true, arrived: false });
    mockUsePrevious.mockReturnValue(true); // prevArrived=true, arrived=false

    render(<TestComponent shouldUpdate={false} />);
    expect(setNavigationStateMock).not.toHaveBeenCalled();
  });

  it('shouldUpdate=true, arrived=false, prevArrived=true の場合、firstStopをfalseに更新する', async () => {
    mockAtomValues({ firstStop: true, arrived: false });
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
    mockAtomValues({ firstStop: true, arrived: true });
    mockUsePrevious.mockReturnValue(true);

    render(<TestComponent shouldUpdate={true} />);
    expect(setNavigationStateMock).not.toHaveBeenCalled();
  });

  it('shouldUpdate=true, prevArrived=false の場合、状態を更新しない', () => {
    mockAtomValues({ firstStop: true, arrived: false });
    mockUsePrevious.mockReturnValue(false);

    render(<TestComponent shouldUpdate={true} />);
    expect(setNavigationStateMock).not.toHaveBeenCalled();
  });

  it('firstStop=false の場合、更新後もfalseのまま', async () => {
    mockAtomValues({ firstStop: false, arrived: false });
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
