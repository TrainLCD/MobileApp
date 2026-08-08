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
