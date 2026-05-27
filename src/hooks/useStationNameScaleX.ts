import { useCallback, useMemo, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';

// 実機の駅名 LCD（JR 東日本 E235 系など）は長い駅名をおよそ 50% 程度まで字幅を詰めて
// 表示するため、その下限に合わせて 0.5 を採用する。これより下げると視認性が著しく落ちる。
const MIN_SCALE_FLOOR = 0.5;

// onLayout が報告する幅のジッターを無視するための閾値（px）。
const MEASUREMENT_EPSILON = 0.5;

/**
 * 駅名の表示スロットの実測幅を `onLayout` で取得するためのフック。
 * Header コンポーネント内で駅名のコンテナ View に渡すことで、画面サイズや
 * 端末（タブレット/スマホ）に依らない実際の収容可能幅を取得できる。
 */
export const useStationNameContainerWidth = () => {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((prev) =>
      Math.abs(prev - next) > MEASUREMENT_EPSILON ? next : prev
    );
  }, []);
  return [width, onLayout] as const;
};

/**
 * 駅名 Text の自然描画幅とスロット幅から、`transform: [{ scaleX }]` に渡す
 * 横方向圧縮率を実測ベースで返すフック。
 *
 * 旧実装は `Dimensions.get('window').width * widthRatio` を収容幅とみなし、
 * `text.length * CHAR_WIDTH_RATIO * fontSize` で文字列幅を見積っていた。
 * この近似はタブレットや英字駅名（例: 山手線「Hamamatsuchō」）など、
 * 実際には 1 行で収まるケースでも誤検知で圧縮を発動させてしまう。
 * 本フックでは Text の `onTextLayout` から得られる実測幅を採用し、
 * 文字列が収まる場合は scaleX=1（圧縮なし）を返す。
 *
 * 使い方:
 *   - `useStationNameContainerWidth()` で取得した `[width, onLayout]` の
 *     `onLayout` を駅名スロットの View に渡し、`width` を本フックに渡す。
 *   - 本フックが返す `onTextLayout` を可視 Text に渡す。Text 自身は幅を
 *     制約されないよう、親 View が overflow: visible または position:
 *     absolute などで自然幅レンダリングを許す構造にする必要がある。
 *   - 本フックが返す `scaleX` を可視 Text の `transform` に適用する。
 */
export const useStationNameScaleX = (text: string, containerWidth: number) => {
  const [naturalTextWidth, setNaturalTextWidth] = useState(0);
  // 駅名が切り替わったら計測値をリセットする。再計測前のフレームで古い
  // 自然幅を新しい文字列に適用してしまうと、長さの違う駅名が誤って圧縮
  // されることがあるため、レンダー中に検知してリセットする
  // （React 公式の「prop の変化に応じて state を初期化する」パターン）。
  const [trackedText, setTrackedText] = useState(text);
  if (trackedText !== text) {
    setTrackedText(text);
    setNaturalTextWidth(0);
  }

  const onTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const widest = event.nativeEvent.lines.reduce(
        (max, line) => Math.max(max, line.width),
        0
      );
      setNaturalTextWidth((prev) =>
        Math.abs(prev - widest) > MEASUREMENT_EPSILON ? widest : prev
      );
    },
    []
  );

  const scaleX = useMemo(() => {
    if (!text || containerWidth <= 0 || naturalTextWidth <= 0) {
      return 1;
    }
    if (naturalTextWidth <= containerWidth) {
      return 1;
    }
    return Math.max(MIN_SCALE_FLOOR, containerWidth / naturalTextWidth);
  }, [text, containerWidth, naturalTextWidth]);

  return { onTextLayout, scaleX };
};
