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
    expect(
      style().width * Math.sin((55 * Math.PI) / 180) +
        40 * Math.cos((55 * Math.PI) / 180)
    ).toBeLessThanOrEqual(80);
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
