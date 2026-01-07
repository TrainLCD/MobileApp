import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import { useCurrentStation } from './useCurrentStation';
import { useIsPassing } from './useIsPassing';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const isPassing = useIsPassing();
  return <Text testID="isPassing">{String(isPassing)}</Text>;
};

describe('useIsPassing', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('arrived=false の場合、falseを返す', () => {
    mockUseAtomValue.mockReturnValue({ arrived: false });
    mockUseCurrentStation.mockReturnValue(
      createStation(1, { stopCondition: StopCondition.Not })
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isPassing').props.children).toBe('false');
  });

  it('arrived=true, stopCondition=All の場合、falseを返す', () => {
    mockUseAtomValue.mockReturnValue({ arrived: true });
    mockUseCurrentStation.mockReturnValue(
      createStation(1, { stopCondition: StopCondition.All })
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isPassing').props.children).toBe('false');
  });

  it('arrived=true, stopCondition=Not の場合、trueを返す', () => {
    mockUseAtomValue.mockReturnValue({ arrived: true });
    mockUseCurrentStation.mockReturnValue(
      createStation(1, { stopCondition: StopCondition.Not })
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isPassing').props.children).toBe('true');
  });

  it('arrived=true, stopCondition=PartialStop の場合、falseを返す', () => {
    mockUseAtomValue.mockReturnValue({ arrived: true });
    mockUseCurrentStation.mockReturnValue(
      createStation(1, { stopCondition: StopCondition.PartialStop })
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isPassing').props.children).toBe('false');
  });

  it('arrived=true, stopCondition=Partial の場合、falseを返す', () => {
    mockUseAtomValue.mockReturnValue({ arrived: true });
    mockUseCurrentStation.mockReturnValue(
      createStation(1, { stopCondition: StopCondition.Partial })
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isPassing').props.children).toBe('false');
  });

  it('currentStation が undefined の場合、falseを返す', () => {
    mockUseAtomValue.mockReturnValue({ arrived: true });
    mockUseCurrentStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isPassing').props.children).toBe('false');
  });

  it('stopCondition が null の場合、falseを返す', () => {
    mockUseAtomValue.mockReturnValue({ arrived: true });
    const stationWithNullCondition = createStation(1, {
      stopCondition: StopCondition.All,
    });
    stationWithNullCondition.stopCondition = null;
    mockUseCurrentStation.mockReturnValue(stationWithNullCondition);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isPassing').props.children).toBe('false');
  });

  it('stopCondition が undefined の場合、falseを返す', () => {
    mockUseAtomValue.mockReturnValue({ arrived: true });
    const stationWithUndefinedCondition = createStation(1, {
      stopCondition: StopCondition.All,
    });
    stationWithUndefinedCondition.stopCondition = undefined;
    mockUseCurrentStation.mockReturnValue(stationWithUndefinedCondition);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isPassing').props.children).toBe('false');
  });
});
