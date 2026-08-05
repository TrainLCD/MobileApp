import { fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { CommonDialogModal } from './CommonDialogModal';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

describe('CommonDialogModal', () => {
  it('絵文字、タイトル、本文、アクションを表示する', () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const { getByText } = render(
      <CommonDialogModal
        visible
        emoji="🚃"
        title="共通ダイアログ"
        description="確認してください"
        cancelButtonText="キャンセル"
        confirmButtonText="確認"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(getByText('🚃')).toBeTruthy();
    expect(getByText('共通ダイアログ')).toBeTruthy();
    expect(getByText('確認してください')).toBeTruthy();

    fireEvent.press(getByText('キャンセル'));
    fireEvent.press(getByText('確認'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
