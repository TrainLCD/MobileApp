import React, { useCallback, useState } from 'react';
import { useInterval } from '~/hooks/useInterval';
import { type ChevronColor, ChevronTY } from '../../../ChevronTY';

export interface BlinkingChevronProps {
  // [初期色, 切替色] の順。1秒ごとに交互に切り替わる
  colors: readonly [ChevronColor, ChevronColor];
}

// 点滅stateをチェブロン自身に閉じ込めるためのコンポーネント。
// 以前は親のLineBoardが1秒ごとにchevronColorをstate更新し、チェブロンを
// 表示しない駅セルまで全て毎秒再レンダーされていた。
const BlinkingChevronBase: React.FC<BlinkingChevronProps> = ({
  colors,
}: BlinkingChevronProps) => {
  const [color, setColor] = useState<ChevronColor>(colors[0]);

  const step = useCallback(
    () => setColor((prev) => (prev === colors[0] ? colors[1] : colors[0])),
    [colors]
  );

  useInterval(step, 1000);

  return <ChevronTY color={color} />;
};

export const BlinkingChevron = React.memo(BlinkingChevronBase);
