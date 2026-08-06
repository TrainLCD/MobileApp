import { render } from '@testing-library/react-native';
import type React from 'react';
import type { Line, Station } from '~/@types/graphql';

// フックの依存を制御するためモジュールをモックする
jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));
jest.mock('./useBounds', () => ({ useBounds: jest.fn() }));
jest.mock('./useCurrentLine', () => ({ useCurrentLine: jest.fn() }));
jest.mock('./useNumbering', () => ({ useNumbering: jest.fn() }));
// jest-expo の既定ロケールは英語のため、日本語表記の組み立てを確認できるよう固定する
jest.mock('../translation', () => ({
  __esModule: true,
  ...jest.requireActual('../translation'),
  isJapanese: true,
}));
jest.mock('../utils/native/android/widgetModule', () => ({
  updateWidget: jest.fn(),
  clearWidget: jest.fn(),
}));

import { useAtomValue } from 'jotai';
import { selectedBoundAtom, stationsAtom } from '../store/atoms/station';
import {
  clearWidget,
  updateWidget,
} from '../utils/native/android/widgetModule';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useNumbering } from './useNumbering';
import { useUpdateWidget } from './useUpdateWidget';

const makeStation = (name: string): Station =>
  ({ name, nameRoman: name }) as Station;

const setAtomValues = ({
  selectedBound = null,
  stations = [],
}: {
  selectedBound?: unknown;
  stations?: Station[];
}) => {
  (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
    if (atom === selectedBoundAtom) return selectedBound;
    if (atom === stationsAtom) return stations;
    return undefined;
  });
};

const TestComponent: React.FC = () => {
  useUpdateWidget();
  return null;
};

describe('useUpdateWidget フック', () => {
  beforeEach(() => {
    (useCurrentLine as jest.Mock).mockReturnValue({
      nameShort: '山手線',
      nameRoman: 'Yamanote Line',
      color: '#80C241',
    } as Line);
    (useNumbering as jest.Mock).mockReturnValue([
      { lineSymbol: 'JY' },
      undefined,
    ]);
    (useBounds as jest.Mock).mockReturnValue({
      bounds: [[], []],
      directionalStops: [makeStation('新宿'), makeStation('渋谷')],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('行先選択済みならウィジェットへ路線情報を送る', () => {
    setAtomValues({ selectedBound: makeStation('大崎') });

    render(<TestComponent />);

    expect(updateWidget).toHaveBeenCalledWith({
      lineName: '山手線',
      lineColor: '#80C241',
      lineSymbol: 'JY',
      boundStationName: '新宿・渋谷方面',
    });
  });

  it('行先未選択のうちはウィジェットを更新しない', () => {
    setAtomValues({ selectedBound: null });

    render(<TestComponent />);

    expect(updateWidget).not.toHaveBeenCalled();
  });

  it('アンマウント(降車)でウィジェットを未乗車表示へ戻す', () => {
    setAtomValues({ selectedBound: makeStation('大崎') });

    // StrictModeの二重マウントで解除が先に走り得るため、アンマウント前後の差分で見る
    const { unmount } = render(<TestComponent />);
    const callsBeforeUnmount = (clearWidget as jest.Mock).mock.calls.length;

    unmount();
    expect((clearWidget as jest.Mock).mock.calls.length).toBe(
      callsBeforeUnmount + 1
    );
  });
});
