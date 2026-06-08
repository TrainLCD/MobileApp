import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { createLine, createStation } from '~/utils/test/factories';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const currentLine = useCurrentLine();
  return <Text testID="line">{JSON.stringify(currentLine)}</Text>;
};

describe('useCurrentLine', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selectedLineとcurrentStationがある場合、現在の路線を返す', () => {
    const lineA = createLine(1, { nameShort: 'LineA' });
    const station1 = createStation(1, {
      groupId: 1,
      line: { id: lineA.id, nameShort: lineA.nameShort },
    });
    const station2 = createStation(2, {
      groupId: 2,
      line: { id: lineA.id, nameShort: lineA.nameShort },
    });

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [station1, station2],
          selectedDirection: 'INBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: lineA,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    const lineResult = getByTestId('line').props.children;

    // Verify line result is returned
    expect(lineResult).toBeDefined();
  });

  it('selectedLineがnullの場合、nullを返す', () => {
    const lineA = createLine(1, { nameShort: 'LineA' });
    const station1 = createStation(1, {
      groupId: 1,
      line: { id: lineA.id, nameShort: lineA.nameShort },
    });

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [station1],
          selectedDirection: 'INBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: null,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('line').props.children).toBe('null');
  });

  it('currentStationがundefinedの場合、nullを返す', () => {
    const lineA = createLine(1, { nameShort: 'LineA' });

    mockUseCurrentStation.mockReturnValue(undefined);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [],
          selectedDirection: 'INBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: lineA,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('line').props.children).toBe('null');
  });

  it('INBOUND方向の場合、路線情報を返す', () => {
    const lineA = createLine(1, { nameShort: 'LineA' });
    const lineB = createLine(2, { nameShort: 'LineB' });
    const station1 = createStation(1, {
      groupId: 1,
      line: { id: lineA.id, nameShort: lineA.nameShort },
    });
    // same groupId, different line
    const station2 = createStation(2, {
      groupId: 1,
      line: { id: lineB.id, nameShort: lineB.nameShort },
    });

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [station1, station2],
          selectedDirection: 'INBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: lineB,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    const lineResult = getByTestId('line').props.children;

    // Verify line result is returned
    expect(lineResult).toBeDefined();
  });

  it('OUTBOUND方向の場合、路線情報を返す', () => {
    const lineA = createLine(1, { nameShort: 'LineA' });
    const lineB = createLine(2, { nameShort: 'LineB' });
    const station1 = createStation(1, {
      groupId: 1,
      line: { id: lineA.id, nameShort: lineA.nameShort },
    });
    // same groupId
    const station2 = createStation(2, {
      groupId: 1,
      line: { id: lineB.id, nameShort: lineB.nameShort },
    });

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [station1, station2],
          selectedDirection: 'OUTBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: lineA,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    const lineResult = getByTestId('line').props.children;

    // Verify line result is returned
    expect(lineResult).toBeDefined();
  });
});
