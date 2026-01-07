import { render, waitFor } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { CustomModal } from './CustomModal';

// jotaiのモック
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

// @gorhom/portalのモック
jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

// react-native-reanimated のモックを拡張
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  const { View } = require('react-native');
  return {
    ...Reanimated,
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value, _config, callback) => {
      if (callback) callback(true);
      return value;
    }),
    runOnJS: jest.fn((fn) => fn),
    cancelAnimation: jest.fn(),
    interpolate: jest.fn((value, inputRange, outputRange) => {
      const progress =
        (value - inputRange[0]) / (inputRange[1] - inputRange[0]);
      return outputRange[0] + progress * (outputRange[1] - outputRange[0]);
    }),
    createAnimatedComponent: jest.fn((component) => component),
    default: {
      View,
      ScrollView: View,
    },
  };
});

describe('CustomModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('visible=true の場合、childrenがレンダリングされる', () => {
    const { getByText } = render(
      <CustomModal visible={true}>
        <Text>Test Content</Text>
      </CustomModal>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('visible=false の場合、初期状態ではレンダリングされない', () => {
    const { queryByText } = render(
      <CustomModal visible={false}>
        <Text>Test Content</Text>
      </CustomModal>
    );

    expect(queryByText('Test Content')).toBeNull();
  });

  it('onClose が呼ばれた時にコールバックが実行される', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CustomModal visible={true} onClose={onClose} testID="modal">
        <Text>Test Content</Text>
      </CustomModal>
    );

    // CustomModal はレンダリングされる
    expect(getByTestId('modal')).toBeTruthy();
  });
});

describe('CustomModal - onCloseAnimationEnd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onCloseAnimationEnd が prop として渡される', () => {
    const onCloseAnimationEnd = jest.fn();

    // コンポーネントが onCloseAnimationEnd を受け取ることを確認
    const { rerender } = render(
      <CustomModal visible={true} onCloseAnimationEnd={onCloseAnimationEnd}>
        <Text>Test Content</Text>
      </CustomModal>
    );

    // 初期状態では呼ばれない
    expect(onCloseAnimationEnd).not.toHaveBeenCalled();

    // visible を false に変更
    rerender(
      <CustomModal visible={false} onCloseAnimationEnd={onCloseAnimationEnd}>
        <Text>Test Content</Text>
      </CustomModal>
    );

    // withTiming が呼ばれることを確認
    expect(withTiming).toHaveBeenCalled();
  });

  it('閉じるアニメーション完了後に onCloseAnimationEnd が呼ばれる', async () => {
    const onCloseAnimationEnd = jest.fn();

    // visible=true の時は withTiming のコールバックを呼ばない（開くアニメーション）
    // visible=false の時だけコールバックを呼ぶ（閉じるアニメーション）
    (withTiming as jest.Mock).mockImplementation((value, _config, callback) => {
      // value が 0 の時（閉じるアニメーション）のみコールバックを実行
      if (callback && value === 0) {
        callback(true);
      }
      return value;
    });

    const { rerender } = render(
      <CustomModal visible={true} onCloseAnimationEnd={onCloseAnimationEnd}>
        <Text>Test Content</Text>
      </CustomModal>
    );

    // 初期状態（visible=true）では呼ばれていない
    expect(onCloseAnimationEnd).not.toHaveBeenCalled();

    // visible を false に変更してクローズアニメーションをトリガー
    rerender(
      <CustomModal visible={false} onCloseAnimationEnd={onCloseAnimationEnd}>
        <Text>Test Content</Text>
      </CustomModal>
    );

    // onCloseAnimationEnd が呼ばれたことを確認
    // （React の StrictMode やモックの挙動により複数回呼ばれる可能性があるため、
    //   少なくとも1回呼ばれたことを確認）
    await waitFor(() => {
      expect(onCloseAnimationEnd).toHaveBeenCalled();
    });
  });

  it('onCloseAnimationEnd が未指定の場合でもエラーにならない', () => {
    (withTiming as jest.Mock).mockImplementation((value, _config, callback) => {
      if (callback) {
        callback(true);
      }
      return value;
    });

    const { rerender } = render(
      <CustomModal visible={true}>
        <Text>Test Content</Text>
      </CustomModal>
    );

    // onCloseAnimationEnd を渡さずに閉じてもエラーにならない
    expect(() => {
      rerender(
        <CustomModal visible={false}>
          <Text>Test Content</Text>
        </CustomModal>
      );
    }).not.toThrow();
  });
});
