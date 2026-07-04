import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';

jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));
jest.mock('./useLoopLine', () => ({ useLoopLine: jest.fn() }));

import { useAtomValue } from 'jotai';
import { selectedBoundAtom, stationsAtom } from '../store/atoms/station';
import { useIsTerminus } from './useIsTerminus';
import { useLoopLine } from './useLoopLine';

const setAtomValues = ({
  stations = [],
  selectedBound = null,
}: {
  stations?: Station[];
  selectedBound?: Station | null;
}) => {
  (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
    if (atom === stationsAtom) return stations;
    if (atom === selectedBoundAtom) return selectedBound;
    return undefined;
  });
};

const TestComponent: React.FC<{ station?: Station }> = ({ station }) => {
  const isTerminus = useIsTerminus(station);
  return <Text testID="isTerminus">{String(isTerminus)}</Text>;
};

describe('useIsTerminus フック', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('station が未指定なら false を返す', () => {
    setAtomValues({ stations: [] });
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: false,
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('isTerminus').props.children).toBe('false');
  });

  it('環状線のときは常に false を返す', () => {
    const stations = [
      { id: 1, groupId: 1 },
      { id: 2, groupId: 2 },
    ] as unknown as Station[];
    setAtomValues({ stations });
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: true,
      isOedoLine: false,
    });

    const { getByTestId } = render(<TestComponent station={stations[0]} />);
    expect(getByTestId('isTerminus').props.children).toBe('false');
  });

  it('非環状線・非大江戸線では配列の先頭/末尾一致で終点判定する', () => {
    const stations = [
      { id: 1, groupId: 1 },
      { id: 2, groupId: 2 },
      { id: 3, groupId: 3 },
    ] as unknown as Station[];
    setAtomValues({ stations });
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: false,
    });

    const { getByTestId, rerender } = render(
      <TestComponent station={stations[0]} />
    );
    expect(getByTestId('isTerminus').props.children).toBe('true');

    rerender(<TestComponent station={stations[1]} />);
    expect(getByTestId('isTerminus').props.children).toBe('false');

    rerender(<TestComponent station={stations[2]} />);
    expect(getByTestId('isTerminus').props.children).toBe('true');
  });

  it('大江戸線で都庁前(外回り)を通過するだけの場合は終点扱いしない（新宿→都庁前）', () => {
    // 新宿→都庁前(外回り)方面へ向かっているが、実際の行き先は光が丘
    const shinjukuTochomaeOuter = { id: 9930100, groupId: 9930100 };
    const hikarigaoka = { id: 9930138, groupId: 9930138 };
    const stations = [
      { id: 9930101, groupId: 9930101 }, // 都庁前(内回り)
      shinjukuTochomaeOuter, // 都庁前(外回り)
      hikarigaoka, // 光が丘
    ] as unknown as Station[];
    setAtomValues({ stations, selectedBound: hikarigaoka as Station });
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
    });

    const { getByTestId } = render(
      <TestComponent station={shinjukuTochomaeOuter as Station} />
    );
    // 配列の先頭でも末尾でもないため誤検知の余地はないが、
    // 大江戸線では selectedBound とのID一致でのみ判定されることを確認
    expect(getByTestId('isTerminus').props.children).toBe('false');
  });

  it('大江戸線で都庁前が配列の末尾に位置していても、選択中の行き先と異なれば終点扱いしない（西新宿五丁目→都庁前）', () => {
    // 都庁前(外回り)がたまたま配列の末尾にあっても、選択中の行き先(光が丘)と一致しない限り終点にしない
    const tochomaeOuter = { id: 9930100, groupId: 9930100 };
    const hikarigaoka = { id: 9930138, groupId: 9930138 };
    const stations = [
      hikarigaoka,
      { id: 9930101, groupId: 9930101 }, // 都庁前(内回り)
      tochomaeOuter, // 都庁前(外回り) - 末尾
    ] as unknown as Station[];
    setAtomValues({ stations, selectedBound: hikarigaoka as Station });
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
    });

    const { getByTestId } = render(
      <TestComponent station={tochomaeOuter as Station} />
    );
    expect(getByTestId('isTerminus').props.children).toBe('false');
  });

  it('大江戸線で都庁前が実際に選択中の行き先と一致する場合は終点扱いする', () => {
    const tochomaeOuter = { id: 9930100, groupId: 9930100 };
    const stations = [
      { id: 9930101, groupId: 9930101 },
      tochomaeOuter,
    ] as unknown as Station[];
    setAtomValues({ stations, selectedBound: tochomaeOuter as Station });
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
    });

    const { getByTestId } = render(
      <TestComponent station={tochomaeOuter as Station} />
    );
    expect(getByTestId('isTerminus').props.children).toBe('true');
  });
});
