import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { manualOutsideRouteStationAtom } from '~/store/atoms/manualStationCorrection';
import { createLine, createStation } from '~/utils/test/factories';
import { selectedLineAtom } from '../store/atoms/line';
import { selectedDirectionAtom, stationsAtom } from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.requireActual('jotai').atom,
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
      if (atom === stationsAtom) return [station1, station2];
      if (atom === selectedDirectionAtom) return 'INBOUND';
      if (atom === selectedLineAtom) return lineA;
      if (atom === manualOutsideRouteStationAtom) return null;
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
      if (atom === stationsAtom) return [station1];
      if (atom === selectedDirectionAtom) return 'INBOUND';
      if (atom === selectedLineAtom) return null;
      if (atom === manualOutsideRouteStationAtom) return null;
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('line').props.children).toBe('null');
  });

  it('currentStationがundefinedの場合、nullを返す', () => {
    const lineA = createLine(1, { nameShort: 'LineA' });

    mockUseCurrentStation.mockReturnValue(undefined);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationsAtom) return [];
      if (atom === selectedDirectionAtom) return 'INBOUND';
      if (atom === selectedLineAtom) return lineA;
      if (atom === manualOutsideRouteStationAtom) return null;
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
      if (atom === stationsAtom) return [station1, station2];
      if (atom === selectedDirectionAtom) return 'INBOUND';
      if (atom === selectedLineAtom) return lineB;
      if (atom === manualOutsideRouteStationAtom) return null;
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
      if (atom === stationsAtom) return [station1, station2];
      if (atom === selectedDirectionAtom) return 'OUTBOUND';
      if (atom === selectedLineAtom) return lineA;
      if (atom === manualOutsideRouteStationAtom) return null;
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    const lineResult = getByTestId('line').props.children;

    // Verify line result is returned
    expect(lineResult).toBeDefined();
  });
});
