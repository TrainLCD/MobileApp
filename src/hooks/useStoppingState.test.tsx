import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import { approachingAtom, arrivedAtom } from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useStoppingState } from './useStoppingState';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

jest.mock('./useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(),
}));

jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const state = useStoppingState();
  return <Text testID="state">{state}</Text>;
};

describe('useStoppingState', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseNextStation = useDisplayNextStation as jest.MockedFunction<
    typeof useDisplayNextStation
  >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  const mockAtomValues = ({
    arrived,
    approaching,
  }: {
    arrived: boolean;
    approaching: boolean;
  }) => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === arrivedAtom) {
        return arrived;
      }
      if (atom === approachingAtom) {
        return approaching;
      }
      return undefined;
    });
  };

  beforeEach(() => {
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('arrived=trueかつ通過駅でない場合、CURRENTを返す', () => {
    const currentStation = createStation(1, {
      stopCondition: StopCondition.All,
    });
    const nextStation = createStation(2, {
      stopCondition: StopCondition.All,
    });

    mockAtomValues({
      arrived: true,
      approaching: false,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('CURRENT');
  });

  it('nextStationがundefinedの場合、CURRENTを返す', () => {
    const currentStation = createStation(1, {
      stopCondition: StopCondition.All,
    });

    mockAtomValues({
      arrived: false,
      approaching: false,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('CURRENT');
  });

  it('approaching=trueかつarrived=falseかつ次の駅が通過駅でない場合、ARRIVINGを返す', () => {
    const currentStation = createStation(1, {
      stopCondition: StopCondition.All,
    });
    const nextStation = createStation(2, {
      stopCondition: StopCondition.All,
    });

    mockAtomValues({
      arrived: false,
      approaching: true,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('ARRIVING');
  });

  it('approaching=trueだが次の駅が通過駅の場合、NEXTを返す', () => {
    const currentStation = createStation(1, {
      stopCondition: StopCondition.All,
    });
    // pass station
    const nextStation = createStation(2, {
      stopCondition: StopCondition.Not,
    });

    mockAtomValues({
      arrived: false,
      approaching: true,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('NEXT');
  });

  it('approaching=falseかつarrived=falseの場合、NEXTを返す', () => {
    const currentStation = createStation(1, {
      stopCondition: StopCondition.All,
    });
    const nextStation = createStation(2, {
      stopCondition: StopCondition.All,
    });

    mockAtomValues({
      arrived: false,
      approaching: false,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('NEXT');
  });

  it('arrived=trueだがcurrentStationが通過駅の場合、NEXTを返す', () => {
    // pass station
    const currentStation = createStation(1, {
      stopCondition: StopCondition.Not,
    });
    const nextStation = createStation(2, {
      stopCondition: StopCondition.All,
    });

    mockAtomValues({
      arrived: true,
      approaching: false,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('NEXT');
  });

  it('arrived=trueかつapproaching=trueかつcurrentStationが通過駅でない場合、CURRENTを返す', () => {
    const currentStation = createStation(1, {
      stopCondition: StopCondition.All,
    });
    const nextStation = createStation(2, {
      stopCondition: StopCondition.All,
    });

    mockAtomValues({
      arrived: true,
      approaching: true,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('CURRENT');
  });
});
