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

describe('CommonDialogPresenter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetDialogPresentationForTests();
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
});
