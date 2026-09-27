import { fireEvent, render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import { useRef } from 'react';
import { Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { TOEI_SHINJUKU_LINE_LOCAL } from '~/__fixtures__/line';
import { CommonCard } from './CommonCard';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('~/providers/AppColorsProvider', () => ({
  useAppColors: jest.fn(() => ({
    cardBorder: '#FFFFFF',
    cardExpanded: '#F5F5F5',
  })),
}));

jest.mock('../hooks', () => ({
  useBounds: jest.fn(() => ({ bounds: [[], []] })),
  useGetLineMark: jest.fn(() => jest.fn(() => null)),
}));

jest.mock('./TransferLineMark', () => () => null);

const line = TOEI_SHINJUKU_LINE_LOCAL;

describe('CommonCard', () => {
  let withTimingSpy: jest.SpyInstance;

  beforeEach(() => {
    (useAtomValue as jest.Mock).mockReturnValue(false);
    // jest.setup.js の既定モックは初期値を無視して常に { value: 1 } を返すため、
    // 開閉の初期状態を検証できるよう初期値を保持してレンダー間で使い回す
    (Reanimated.useSharedValue as jest.Mock).mockImplementation(
      (initialValue: number) => useRef({ value: initialValue }).current
    );
    withTimingSpy = jest.spyOn(Reanimated, 'withTiming');
  });

  afterEach(() => {
    withTimingSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('アコーディオンを持たないカードはマウント時に開閉アニメーションを走らせない', () => {
    render(<CommonCard line={line} title="山手線" onPress={jest.fn()} />);

    expect(withTimingSpy).not.toHaveBeenCalled();
  });

  it('閉じた状態でマウントしたアコーディオンはアニメーションを走らせない', () => {
    render(
      <CommonCard
        line={line}
        title="新宿"
        expanded={false}
        onExpandedChange={jest.fn()}
        expandableContent={<Text>設定</Text>}
      />
    );

    expect(withTimingSpy).not.toHaveBeenCalled();
  });

  it('expanded が切り替わると UI スレッドのタイミングアニメーションで開閉する', () => {
    const { rerender } = render(
      <CommonCard
        line={line}
        title="新宿"
        expanded={false}
        onExpandedChange={jest.fn()}
        expandableContent={<Text>設定</Text>}
      />
    );

    rerender(
      <CommonCard
        line={line}
        title="新宿"
        expanded
        onExpandedChange={jest.fn()}
        expandableContent={<Text>設定</Text>}
      />
    );

    expect(withTimingSpy).toHaveBeenCalledTimes(1);
    expect(withTimingSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 250 })
    );
  });

  it('アコーディオンのカードを押すと onPress ではなく onExpandedChange を呼ぶ', () => {
    const onPress = jest.fn();
    const onExpandedChange = jest.fn();
    const { getByTestId } = render(
      <CommonCard
        line={line}
        title="新宿"
        testID="card"
        expanded={false}
        onPress={onPress}
        onExpandedChange={onExpandedChange}
        expandableContent={<Text>設定</Text>}
      />
    );

    fireEvent.press(getByTestId('card'));

    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(onPress).not.toHaveBeenCalled();
  });
});
