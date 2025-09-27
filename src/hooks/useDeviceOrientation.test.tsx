import { act, render } from '@testing-library/react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Text } from 'react-native';
import { useDeviceOrientation } from './useDeviceOrientation';

jest.mock('expo-screen-orientation', () => ({
  __esModule: true,
  addOrientationChangeListener: jest.fn(),
  Orientation: {
    PORTRAIT_UP: 1,
    LANDSCAPE_LEFT: 2,
    LANDSCAPE_RIGHT: 3,
    PORTRAIT_DOWN: 4,
  },
}));

const TestComponent: React.FC = () => {
  const orientation = useDeviceOrientation();
  return <Text testID="orientation">{orientation ?? 'null'}</Text>;
};

describe('useDeviceOrientation フック', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('orientation 変更イベントを受け取ると orientation が更新される', () => {
    // addOrientationChangeListener から返される購読オブジェクトのモックを準備
    const removeMock = jest.fn();
    (
      ScreenOrientation.addOrientationChangeListener as jest.Mock
    ).mockImplementation(() => {
      // 必要ならここでコールバックを即時呼び出して初期イベントをシミュレートできるが
      // ここでは購読オブジェクトだけ返してテスト側でコールバックを発火させる
      return { remove: removeMock };
    });

    const { getByTestId } = render(<TestComponent />);

    // 初期値が null であることを確認
    expect(getByTestId('orientation').props.children).toBe('null');

    // フックが登録したコールバック関数を取得
    const mock = ScreenOrientation.addOrientationChangeListener as jest.Mock;
    expect(mock).toHaveBeenCalled();
    const cb = mock.mock.calls[0][0];
    // orientation 変更イベントを発火
    act(() => {
      cb({
        orientationInfo: {
          orientation: ScreenOrientation.Orientation.LANDSCAPE_LEFT,
        },
      });
    });

    // イベント発火後、コンポーネントが数値の orientation を表示すること
    expect(getByTestId('orientation').props.children).toBe(
      ScreenOrientation.Orientation.LANDSCAPE_LEFT
    );
  });

  it('アンマウント時に購読が remove される', () => {
    const removeMock = jest.fn();
    (
      ScreenOrientation.addOrientationChangeListener as jest.Mock
    ).mockImplementation(() => ({ remove: removeMock }));

    const { unmount } = render(<TestComponent />);

    // 購読が作成されたことを確認
    expect(ScreenOrientation.addOrientationChangeListener).toHaveBeenCalled();

    // アンマウント時に購読の remove が呼ばれること
    unmount();
    expect(removeMock).toHaveBeenCalled();
  });
});
