import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { createStation } from '~/utils/test/factories';
import { useApproachingStation } from './useApproachingStation';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useNextStation } from './useNextStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

jest.mock('./useApproachingStation', () => ({
  __esModule: true,
  useApproachingStation: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const station = useDisplayNextStation();
  return <Text testID="station">{JSON.stringify(station)}</Text>;
};

describe('useDisplayNextStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockUseApproachingStation =
    useApproachingStation as jest.MockedFunction<typeof useApproachingStation>;

  const nextStation = createStation(1);
  const approachingStation = createStation(2);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('接近中かつ接近駅が特定できる場合は接近駅を返す', () => {
    mockUseAtomValue.mockReturnValue({ approaching: true });
    mockUseNextStation.mockReturnValue(nextStation);
    mockUseApproachingStation.mockReturnValue(approachingStation);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(2);
  });

  it('接近中でない場合は従来の次の駅を返す', () => {
    mockUseAtomValue.mockReturnValue({ approaching: false });
    mockUseNextStation.mockReturnValue(nextStation);
    mockUseApproachingStation.mockReturnValue(approachingStation);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(1);
  });

  it('接近中でも接近駅が特定できない場合は従来の次の駅にフォールバックする', () => {
    mockUseAtomValue.mockReturnValue({ approaching: true });
    mockUseNextStation.mockReturnValue(nextStation);
    mockUseApproachingStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(1);
  });
});
