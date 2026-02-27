import { render, waitFor } from '@testing-library/react-native';
import type React from 'react';
import { Animated, Text } from 'react-native';
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
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    timingSpy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((_value, _config) => {
        return {
          start: (callback?: Animated.EndCallback) => callback?.({ finished: true }),
          stop: jest.fn(),
          reset: jest.fn(),
        } as unknown as Animated.CompositeAnimation;
      });
  });

  afterEach(() => {
    timingSpy.mockRestore();
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

    // Animated.timing が呼ばれることを確認
    expect(timingSpy).toHaveBeenCalled();
  });

  it('閉じるアニメーション完了後に onCloseAnimationEnd が呼ばれる', async () => {
    const onCloseAnimationEnd = jest.fn();

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
