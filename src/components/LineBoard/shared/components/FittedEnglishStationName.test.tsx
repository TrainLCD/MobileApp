import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import { commonLineBoardStyles } from '../styles/commonStyles';
import { FittedEnglishStationName } from './FittedEnglishStationName';

jest.mock('../../../Typography', () => require('react-native').Text);

it.each(['Kyūdai-Gakkentoshi', 'Itoshimakōkōmae', 'Imajuku'])(
  '駅名 %s を東京メトロと同じ行送りで一括描画する',
  (roman) => {
    const { UNSAFE_getByType } = render(
      <FittedEnglishStationName
        station={{ nameRoman: roman } as Station}
        passed={false}
        pitch={98}
        bottom={100}
      />
    );
    fireEvent(UNSAFE_getByType(View), 'layout', {
      nativeEvent: { layout: { height: 80 } },
    });
    const label = () => UNSAFE_getByType(Text);
    const style = () => StyleSheet.flatten(label().props.style);
    const before = style().width;
    fireEvent(label(), 'textLayout', {
      nativeEvent: {
        lines: [
          { x: 0, y: 0, width: before, height: 20 },
          { x: 0, y: 20, width: 20, height: 20 },
        ],
      },
    });
    expect(style().width).toBeLessThan(before);
    const lines = [0, 20, 40].map((y) => ({ x: 0, y, width: 45, height: 20 }));
    fireEvent(label(), 'textLayout', { nativeEvent: { lines } });
    const blockHeight = lines.reduce((sum, line) => sum + line.height, 0);
    expect(
      Math.max(
        ...lines.map(
          (line) =>
            line.width * Math.sin((55 * Math.PI) / 180) +
            (blockHeight - line.y) * Math.cos((55 * Math.PI) / 180)
        )
      )
    ).toBeLessThanOrEqual(80);
    expect(style().width).toBeLessThan(before);
    expect(label().props.children.replaceAll('\n', '')).toBe(roman);
    expect(label().props.adjustsFontSizeToFit).toBeFalsy();
    expect(label().props.numberOfLines).toBeUndefined();
    expect(style().lineHeight).toBe(
      commonLineBoardStyles.englishStationNameSpacing.lineHeight
    );
    expect(style().includeFontPadding).toBeUndefined();
    expect(style().fontSize).toBe(
      commonLineBoardStyles.stationNameHorizontal.fontSize
    );
  }
);

it.each([true, false])(
  'checks skipped widths and restores the best measured fit (fit exists: %s)',
  (hasFit) => {
    const result = render(
      <FittedEnglishStationName
        station={{ nameRoman: 'Nerima-kasugacho' } as Station}
        passed={false}
        bottom={0}
        pitch={98}
        rightSpace={56}
      />
    );
    fireEvent(result.UNSAFE_getByType(View), 'layout', {
      nativeEvent: { layout: { height: 80 } },
    });
    const label = () => result.UNSAFE_getByType(Text);
    const style = () => StyleSheet.flatten(label().props.style);
    const visited = new Set<number>();
    const initial = style().width;
    while (!visited.has(style().width)) {
      const width = style().width;
      visited.add(width);
      const count = width === initial ? 2 : width === 80 ? (hasFit ? 1 : 3) : 6;
      const lines = Array.from({ length: count }, (_, i) => ({
        x: 0,
        y: 20 * i,
        width: width === 80 ? 60 : width,
        height: 20,
      }));
      fireEvent(label(), 'textLayout', { nativeEvent: { lines } });
    }
    expect([...visited][1]).toBeLessThan(80);
    expect(visited.has(80)).toBe(true);
    expect(style().width).toBe(80);
    const scale = style().transform[1].scale;
    const measuredHeight =
      60 * Math.sin((55 * Math.PI) / 180) +
      (hasFit ? 20 : 60) * Math.cos((55 * Math.PI) / 180);
    expect(measuredHeight * scale).toBeLessThanOrEqual(80);
    if (hasFit) expect(scale).toBe(1);
  }
);

it('keeps a multi-line label inside the diagonal band above a numbered station', () => {
  const pitch = 98;
  const baselineOffset = 35;
  const result = render(
    <FittedEnglishStationName
      station={{ nameRoman: 'Kyūdai-Gakkentoshi' } as Station}
      passed={false}
      bottom={100}
      pitch={pitch}
      baselineOffset={baselineOffset}
    />
  );
  fireEvent(result.UNSAFE_getByType(View), 'layout', {
    nativeEvent: { layout: { height: 300 } },
  });
  const label = () => result.UNSAFE_getByType(Text);
  const style = () => StyleSheet.flatten(label().props.style);
  const lines = [0, 29, 58].map((y) => ({ x: 0, y, width: 1, height: 29 }));
  const visited = new Set<number>();
  // Even if no wrapping width reduces the three-line block, adjacent bands must be disjoint.
  while (!visited.has(style().width)) {
    visited.add(style().width);
    fireEvent(label(), 'textLayout', { nativeEvent: { lines } });
  }
  const angle = (55 * Math.PI) / 180;
  expect(
    87 * style().transform[1].scale + baselineOffset * Math.cos(angle)
  ).toBeLessThanOrEqual(pitch * Math.sin(angle));
});

it('keeps all four rotated lines inside the left edge of the board', () => {
  const result = render(
    <FittedEnglishStationName
      station={{ nameRoman: 'Nerima-kasugacho' } as Station}
      passed={false}
      bottom={0}
      pitch={128}
      leftSpace={16}
      rightSpace={10}
    />
  );
  fireEvent(result.UNSAFE_getByType(View), 'layout', {
    nativeEvent: { layout: { height: 300 } },
  });
  const label = () => result.UNSAFE_getByType(Text);
  const style = () => StyleSheet.flatten(label().props.style);
  const lines = [0, 20, 40, 60].map((y) => ({ x: 0, y, width: 1, height: 20 }));
  const visited = new Set<number>();
  while (!visited.has(style().width)) {
    visited.add(style().width);
    fireEvent(label(), 'textLayout', { nativeEvent: { lines } });
  }
  const scale = style().transform[1].scale;
  for (const line of lines) {
    const left = 16 - (80 - line.y) * Math.sin((55 * Math.PI) / 180) * scale;
    expect(left).toBeGreaterThanOrEqual(0);
  }
});
