import { act, fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import {
  resetDialogPresentationForTests,
  showDialog,
} from '~/utils/dialogPresentation';
import { CommonDialogPresenter } from './CommonDialogPresenter';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

// 実物の CustomModal を描画したまま、同じインスタンスが閉じた後に再び開かれた回数を数える。
jest.mock('./CustomModal', () => {
  const { createElement, useRef } = jest.requireActual('react');
  const actual = jest.requireActual('./CustomModal');
  const tracker = { reopenCount: 0 };
  const TrackedCustomModal = (props: { visible: boolean }) => {
    const closedRef = useRef(false);
    if (!props.visible) {
      closedRef.current = true;
    } else if (closedRef.current) {
      closedRef.current = false;
      tracker.reopenCount += 1;
    }
    return createElement(actual.CustomModal, props);
  };
  return {
    ...actual,
    CustomModal: TrackedCustomModal,
    default: TrackedCustomModal,
    customModalTracker: tracker,
  };
});

const { customModalTracker } = jest.requireMock('./CustomModal') as {
  customModalTracker: { reopenCount: number };
};

describe('CommonDialogPresenter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetDialogPresentationForTests();
    customModalTracker.reopenCount = 0;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
      resetDialogPresentationForTests();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('破壊的操作の確認ダイアログを表示してボタン処理を実行する', () => {
    const onConfirm = jest.fn();
    const { getByText, queryByText } = render(<CommonDialogPresenter />);

    act(() => {
      showDialog('確認', '実行しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '実行', style: 'destructive', onPress: onConfirm },
      ]);
    });

    expect(getByText('⚠️')).toBeTruthy();
    expect(getByText('確認')).toBeTruthy();
    expect(getByText('実行しますか？')).toBeTruthy();

    fireEvent.press(getByText('実行'));
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(queryByText('確認')).toBeNull();
  });

  it('待機していたダイアログを閉じたモーダルの使い回しでなく新しいモーダルで表示する', () => {
    const onConfirmFirst = jest.fn();
    const onConfirmSecond = jest.fn();
    const { getByText, queryByText } = render(<CommonDialogPresenter />);

    act(() => {
      showDialog('1件目', undefined, [
        { text: 'OK1', onPress: onConfirmFirst },
      ]);
      showDialog('2件目', undefined, [
        { text: 'OK2', onPress: onConfirmSecond },
      ]);
    });

    fireEvent.press(getByText('OK1'));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(onConfirmFirst).toHaveBeenCalledTimes(1);
    expect(queryByText('1件目')).toBeNull();
    expect(getByText('2件目')).toBeTruthy();
    // 閉じた CustomModal を開き直すと、Android 実機では開くアニメーションが反映されず
    // 透明なまま背景だけがタップを受け、2件目が見えないまま閉じられてしまう。
    expect(customModalTracker.reopenCount).toBe(0);

    fireEvent.press(getByText('OK2'));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(onConfirmSecond).toHaveBeenCalledTimes(1);
    expect(queryByText('2件目')).toBeNull();
  });

  it('チェックした今後表示しない設定をOK押下後に反映する', () => {
    const onSuppress = jest.fn();
    const onConfirm = jest.fn();
    const { getByRole, getByText } = render(<CommonDialogPresenter />);

    act(() => {
      showDialog('動作保証外', '確認してください', [
        {
          text: '次回以降表示しない',
          style: 'checkbox',
          onPress: onSuppress,
        },
        { text: 'OK', onPress: onConfirm },
      ]);
    });

    fireEvent.press(getByText('次回以降表示しない'));
    expect(getByRole('checkbox').props.accessibilityState).toEqual({
      checked: true,
    });

    fireEvent.press(getByText('OK'));
    expect(onSuppress).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(onSuppress).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
