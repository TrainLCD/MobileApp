import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { Station } from '~/@types/graphql';
import { HORIZONTAL_STATION_NAME_ROTATION_DEG } from '../styles/commonStyles';
import { FittedEnglishStationName } from './FittedEnglishStationName';

jest.mock('../../../Typography', () => require('react-native').Text);

it.each([
  ['Kyūdai-Gakkentoshi', 'Kyūdai-\nGakkentoshi', 2],
  ['Itoshimakōkōmae', 'Itoshimakōkō\nmae', 2],
  ['Imajuku', 'Imajuku', 1],
])('駅名 %s の全行を実測高に収める', (roman, expected, lines) => {
  const { getByText, UNSAFE_getByType } = render(
    <FittedEnglishStationName
      station={{ nameRoman: roman } as Station}
      passed={false}
      bottom={100}
    />
  );
  const { View } = require('react-native');
  for (const available of [112, 80]) {
    fireEvent(UNSAFE_getByType(View), 'layout', {
      nativeEvent: { layout: { width: 98, height: available } },
    });
    const label = getByText(String(expected), { normalizer: (value) => value });
    expect(label.props.numberOfLines).toBe(lines);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    const { width, height } = StyleSheet.flatten(label.props.style);
    const angle = (HORIZONTAL_STATION_NAME_ROTATION_DEG * Math.PI) / 180;
    expect(
      width * Math.sin(angle) + height * Math.cos(angle)
    ).toBeLessThanOrEqual(available);
  }
});
