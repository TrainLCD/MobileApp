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
    expect(scaledWrapperStyle.width).toBe(248);
    expect(scaledWrapperStyle.transformOrigin).toBe('center');
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 120 / 248 }]);
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

    expect(scaledWrapperStyle.width).toBe(368);
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 300 / 368 }]);
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
    expect(scaledWrapperStyle.width).toBe(368);
    expect(scaledWrapperStyle.transformOrigin).toBe('center');
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 240 / 368 }]);
  });

  it('does not reuse the previous short station width while measuring a changed station name', () => {
    const { UNSAFE_getAllByType, rerender } = render(
      <HeaderStationName text="練馬春日" textStyle={{ fontSize: 50 }} />
    );

    fireEvent(UNSAFE_getAllByType(View)[0], 'layout', {
      nativeEvent: { layout: { width: 240 } },
    });
    fireEvent(UNSAFE_getAllByType(Text)[0], 'textLayout', {
      nativeEvent: { lines: [{ width: 200 }] },
    });

    rerender(
      <HeaderStationName text="練馬春日町" textStyle={{ fontSize: 50 }} />
    );

    const textNodes = UNSAFE_getAllByType(Text);
    const scaledWrapperStyle = StyleSheet.flatten(
      UNSAFE_getAllByType(View)[2].props.style
    );

    expect(textNodes[1].props.children).toBe('練馬春日町');
    expect(scaledWrapperStyle.width).toBe(10000);
    expect(scaledWrapperStyle.transform).toEqual([{ scaleX: 1 }]);

    fireEvent(textNodes[0], 'textLayout', {
      nativeEvent: { lines: [{ width: 240 }] },
    });

    const measuredScaledWrapperStyle = StyleSheet.flatten(
      UNSAFE_getAllByType(View)[2].props.style
    );

    expect(measuredScaledWrapperStyle.width).toBe(248);
    expect(measuredScaledWrapperStyle.transform).toEqual([
      { scaleX: 240 / 248 },
    ]);
  });
});
