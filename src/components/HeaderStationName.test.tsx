import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import HeaderStationName from './HeaderStationName';

describe('HeaderStationName', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the font size and compresses text width when the station name is wider than its container', () => {
    const { UNSAFE_getAllByType } = render(
      <HeaderStationName
        text="ちょうじゃがはましおさいはまなすこうえんまえ"
        textStyle={{ fontSize: 50 }}
      />
    );
    const textNodes = UNSAFE_getAllByType(Text);

    fireEvent(UNSAFE_getAllByType(View)[0], 'layout', {
      nativeEvent: { layout: { width: 120 } },
    });
    fireEvent(textNodes[0], 'textLayout', {
      nativeEvent: { lines: [{ width: 240 }] },
    });

    const scaledWrapperStyle = StyleSheet.flatten(
      UNSAFE_getAllByType(View)[2].props.style
    );
    const viewportStyle = StyleSheet.flatten(
      UNSAFE_getAllByType(View)[1].props.style
    );
    const measureTextStyle = StyleSheet.flatten(textNodes[0].props.style);

    expect(viewportStyle.overflow).toBeUndefined();
    expect(measureTextStyle.width).toBe(10000);
    expect(textNodes[0].props.accessible).toBe(false);
    expect(textNodes[0].props.importantForAccessibility).toBe(
      'no-hide-descendants'
    );
    expect(textNodes[1].props.ellipsizeMode).toBe('clip');
    expect(scaledWrapperStyle.width).toBe(240);
    expect(scaledWrapperStyle.transformOrigin).toBe('center');
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 0.5 }]);
    expect(StyleSheet.flatten(textNodes[1].props.style).fontSize).toBe(50);
  });

  it('ignores the wide measuring layout and uses the actual text line width', () => {
    const { UNSAFE_getAllByType } = render(
      <HeaderStationName
        text="南町田グランベリーパーク"
        textStyle={{ fontSize: 50 }}
      />
    );
    const textNodes = UNSAFE_getAllByType(Text);

    fireEvent(UNSAFE_getAllByType(View)[0], 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent(textNodes[0], 'layout', {
      nativeEvent: { layout: { width: 10000 } },
    });
    fireEvent(textNodes[0], 'textLayout', {
      nativeEvent: { lines: [{ width: 360 }] },
    });

    const scaledWrapperStyle = StyleSheet.flatten(
      UNSAFE_getAllByType(View)[2].props.style
    );

    expect(scaledWrapperStyle.width).toBe(360);
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 300 / 360 }]);
  });

  it('compresses the full station name without clipping the suffix', () => {
    const { UNSAFE_getAllByType } = render(
      <HeaderStationName
        text="北野白梅町・きたのはくばいちょう"
        textStyle={{ fontSize: 50 }}
      />
    );
    const textNodes = UNSAFE_getAllByType(Text);

    fireEvent(UNSAFE_getAllByType(View)[0], 'layout', {
      nativeEvent: { layout: { width: 240 } },
    });
    fireEvent(textNodes[0], 'textLayout', {
      nativeEvent: { lines: [{ width: 360 }] },
    });

    const scaledWrapperStyle = StyleSheet.flatten(
      UNSAFE_getAllByType(View)[2].props.style
    );

    expect(textNodes[1].props.children).toBe(
      '北野白梅町・きたのはくばいちょう'
    );
    expect(scaledWrapperStyle.width).toBe(360);
    expect(scaledWrapperStyle.transformOrigin).toBe('center');
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 240 / 360 }]);
  });
});
