import { act, renderHook } from '@testing-library/react-native';
import type {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  TextLayoutEventData,
  TextLayoutLine,
} from 'react-native';
import {
  useStationNameContainerWidth,
  useStationNameScaleX,
} from './useStationNameScaleX';

const layoutEvent = (width: number): LayoutChangeEvent =>
  ({
    nativeEvent: {
      layout: { x: 0, y: 0, width, height: 0 },
    },
  }) as LayoutChangeEvent;

const textLayoutEvent = (
  widths: number[]
): NativeSyntheticEvent<TextLayoutEventData> =>
  ({
    nativeEvent: {
      lines: widths.map(
        (width) =>
          ({
            x: 0,
            y: 0,
            width,
            height: 0,
            ascender: 0,
            capHeight: 0,
            descender: 0,
            text: '',
            xHeight: 0,
          }) satisfies TextLayoutLine
      ),
    },
  }) as NativeSyntheticEvent<TextLayoutEventData>;

describe('useStationNameContainerWidth', () => {
  it('onLayout で報告された幅を保持する', () => {
    const { result } = renderHook(() => useStationNameContainerWidth());
    expect(result.current[0]).toBe(0);
    act(() => {
      result.current[1](layoutEvent(412));
    });
    expect(result.current[0]).toBe(412);
  });

  it('幅の差が 0.5px 以下のジッターは無視する', () => {
    const { result } = renderHook(() => useStationNameContainerWidth());
    act(() => {
      result.current[1](layoutEvent(412));
    });
    act(() => {
      result.current[1](layoutEvent(412.3));
    });
    expect(result.current[0]).toBe(412);
  });

  it('意味のある差はちゃんと反映する', () => {
    const { result } = renderHook(() => useStationNameContainerWidth());
    act(() => {
      result.current[1](layoutEvent(412));
    });
    act(() => {
      result.current[1](layoutEvent(500));
    });
    expect(result.current[0]).toBe(500);
  });
});

describe('useStationNameScaleX', () => {
  it('空文字は常に 1 を返す', () => {
    const { result } = renderHook(() => useStationNameScaleX('', 400));
    expect(result.current.scaleX).toBe(1);
  });

  it('まだ計測値が揃っていない初期描画では 1 を返す（圧縮しない）', () => {
    const { result } = renderHook(() =>
      useStationNameScaleX('Hamamatsuchō', 0)
    );
    expect(result.current.scaleX).toBe(1);
  });

  it('自然描画幅 ≤ コンテナ幅なら 1 を返す（収まる駅名は圧縮しない）', () => {
    const { result } = renderHook(() =>
      useStationNameScaleX('Hamamatsuchō', 412)
    );
    act(() => {
      result.current.onTextLayout(textLayoutEvent([380]));
    });
    expect(result.current.scaleX).toBe(1);
  });

  it('自然描画幅がコンテナ幅を超えるとはみ出し比に応じて圧縮する', () => {
    const { result } = renderHook(() =>
      useStationNameScaleX('長すぎる駅名', 200)
    );
    act(() => {
      result.current.onTextLayout(textLayoutEvent([300]));
    });
    expect(result.current.scaleX).toBeCloseTo(200 / 300, 5);
  });

  it('過度に長い駅名でも下限 0.5 にクランプされる', () => {
    const { result } = renderHook(() => useStationNameScaleX('長い駅名', 100));
    act(() => {
      result.current.onTextLayout(textLayoutEvent([1000]));
    });
    expect(result.current.scaleX).toBe(0.5);
  });

  it('text が変わったら計測値はリセットされ、再計測前は 1 に戻る', () => {
    const { result, rerender } = renderHook(
      ({ text }: { text: string }) => useStationNameScaleX(text, 200),
      { initialProps: { text: '長い駅名' } }
    );
    act(() => {
      result.current.onTextLayout(textLayoutEvent([400]));
    });
    expect(result.current.scaleX).toBe(0.5);

    rerender({ text: '駅' });
    expect(result.current.scaleX).toBe(1);
  });
});
