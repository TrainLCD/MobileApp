import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import {
  HORIZONTAL_STATION_NAME_FONT_SIZE,
  HORIZONTAL_STATION_NAME_ROTATION_DEG,
} from '../styles/commonStyles';
import { FittedEnglishStationName } from './FittedEnglishStationName';

jest.mock('../../../Typography', () => require('react-native').Text);

it.each([
  ['Kyūdai-Gakkentoshi', ['Kyūdai-\n', 'Gakken', 'toshi']],
  ['Itoshimakōkōmae', ['Itoshima', 'kōkō\n', 'mae']],
  ['Imajuku', ['Imajuku']],
] as const)('駅名 %s を同じ文字サイズで最終行まで表示する', (roman, lines) => {
  const { UNSAFE_getByType, UNSAFE_getAllByType } = render(
    <FittedEnglishStationName
      station={{ nameRoman: roman } as Station}
      passed={false}
      bottom={100}
    />
  );
  for (const available of [112, 80]) {
    fireEvent(UNSAFE_getByType(View), 'layout', {
      nativeEvent: { layout: { width: 98, height: available } },
    });
    const [probe] = UNSAFE_getAllByType(Text);
    expect(probe.props.children.replaceAll('\n', '')).toBe(roman);
    fireEvent(probe, 'textLayout', {
      nativeEvent: { lines: lines.map((text) => ({ text })) },
    });
    const [measurement, ...labels] = UNSAFE_getAllByType(Text);
    expect(labels.map((label) => label.props.children).join('')).toBe(roman);
    for (const label of [measurement, ...labels]) {
      expect(label.props.adjustsFontSizeToFit).toBeFalsy();
      expect(label.props.numberOfLines).toBeUndefined();
      const { width, lineHeight, fontSize } = StyleSheet.flatten(
        label.props.style
      );
      expect(fontSize).toBe(HORIZONTAL_STATION_NAME_FONT_SIZE);
      const angle = (HORIZONTAL_STATION_NAME_ROTATION_DEG * Math.PI) / 180;
      expect(
        width * Math.sin(angle) + lineHeight * Math.cos(angle)
      ).toBeLessThanOrEqual(available);
    }
  }
});
