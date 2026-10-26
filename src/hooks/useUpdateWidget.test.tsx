import { render } from '@testing-library/react-native';
import type React from 'react';
import type { Line, Station } from '~/@types/graphql';

// フックの依存を制御するためモジュールをモックする
jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));
jest.mock('./useCurrentStation', () => ({ useCurrentStation: jest.fn() }));
jest.mock('./useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(),
}));
jest.mock('./useNextStation', () => ({ useNextStation: jest.fn() }));
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
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useNextStation } from './useNextStation';
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
    (useCurrentStation as jest.Mock).mockReturnValue({
      ...makeStation('新宿'),
      groupId: 1,
    });
    (useDisplayNextStation as jest.Mock).mockReturnValue({
      ...makeStation('代々木'),
      groupId: 2,
    });
    (useNextStation as jest.Mock).mockReturnValue({
      ...makeStation('代々木'),
      groupId: 2,
    });
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
      stationName: '新宿',
      nextStationName: '代々木',
    });
  });

  it('次駅が現在駅へ重なる遷移では記録基準の次駅を送る', () => {
    setAtomValues({ selectedBound: makeStation('大崎') });
    (useDisplayNextStation as jest.Mock).mockReturnValue({
      ...makeStation('新宿'),
      groupId: 1,
    });
    render(<TestComponent />);
    expect(updateWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        stationName: '新宿',
        nextStationName: '代々木',
      })
    );
  });

  it('終点で次駅がなければ架空の駅を補わない', () => {
    setAtomValues({ selectedBound: makeStation('大崎') });
    (useDisplayNextStation as jest.Mock).mockReturnValue(undefined);
    (useNextStation as jest.Mock).mockReturnValue(undefined);
    render(<TestComponent />);
    expect(updateWidget).toHaveBeenCalledWith(
      expect.objectContaining({ stationName: '新宿', nextStationName: '' })
    );
  });

  it('駅名が変わったときに更新する', () => {
    setAtomValues({ selectedBound: makeStation('大崎') });
    const { rerender } = render(<TestComponent />);
    (useCurrentStation as jest.Mock).mockReturnValue({
      ...makeStation('代々木'),
      groupId: 2,
    });
    (useDisplayNextStation as jest.Mock).mockReturnValue({
      ...makeStation('原宿'),
      groupId: 3,
    });
    rerender(<TestComponent />);
    expect(updateWidget).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stationName: '代々木',
        nextStationName: '原宿',
      })
    );
  });

  it('行先未選択のうちはウィジェットを更新しない', () => {
    setAtomValues({ selectedBound: null });

    render(<TestComponent />);

    expect(updateWidget).not.toHaveBeenCalled();
  });

  it('行先が解除されたらマウントされたままでもウィジェットを消去する', () => {
    setAtomValues({ selectedBound: makeStation('大崎') });

    const { rerender } = render(<TestComponent />);
    const callsBeforeReset = (clearWidget as jest.Mock).mock.calls.length;

    setAtomValues({ selectedBound: null });
    rerender(<TestComponent />);

    expect((clearWidget as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsBeforeReset
    );
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
