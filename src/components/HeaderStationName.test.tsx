import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import HeaderStationName from './HeaderStationName';

describe('HeaderStationName', () => {
  it('keeps the font size and compresses text width when the station name is wider than its container', () => {
    const { getAllByText, UNSAFE_getAllByType } = render(
      <HeaderStationName
        text="ちょうじゃがはましおさいはまなすこうえんまえ"
        textStyle={{ fontSize: 50 }}
      />
    );

    fireEvent(UNSAFE_getAllByType(View)[0], 'layout', {
      nativeEvent: { layout: { width: 120 } },
    });
    fireEvent(
      getAllByText('ちょうじゃがはましおさいはまなすこうえんまえ')[0],
      'textLayout',
      {
        nativeEvent: { lines: [{ width: 240 }] },
      }
    );

    const scaledWrapperStyle = StyleSheet.flatten(
      UNSAFE_getAllByType(View)[2].props.style
    );
    const measureTextStyle = StyleSheet.flatten(
      getAllByText('ちょうじゃがはましおさいはまなすこうえんまえ')[0].props
        .style
    );

    expect(measureTextStyle.width).toBe(10000);
    expect(
      getAllByText('ちょうじゃがはましおさいはまなすこうえんまえ')[1].props
        .ellipsizeMode
    ).toBe('clip');
    expect(scaledWrapperStyle.width).toBe(240);
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 0.5 }]);
    expect(
      StyleSheet.flatten(
        getAllByText('ちょうじゃがはましおさいはまなすこうえんまえ')[1].props
          .style
      ).fontSize
    ).toBe(50);
  });

  it('ignores the wide measuring layout and uses the actual text line width', () => {
    const { getAllByText, UNSAFE_getAllByType } = render(
      <HeaderStationName
        text="南町田グランベリーパーク"
        textStyle={{ fontSize: 50 }}
      />
    );

    fireEvent(UNSAFE_getAllByType(View)[0], 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent(getAllByText('南町田グランベリーパーク')[0], 'layout', {
      nativeEvent: { layout: { width: 10000 } },
    });
    fireEvent(getAllByText('南町田グランベリーパーク')[0], 'textLayout', {
      nativeEvent: { lines: [{ width: 360 }] },
    });

    const scaledWrapperStyle = StyleSheet.flatten(
      UNSAFE_getAllByType(View)[2].props.style
    );

    expect(scaledWrapperStyle.width).toBe(360);
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 300 / 360 }]);
  });
});
