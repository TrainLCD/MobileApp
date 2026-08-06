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
  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('今後表示しない設定をアクションではなくチェックボックスで表示する', () => {
    const onCheckboxChange = jest.fn();
    const { getByRole, getByText } = render(
      <CommonDialogModal
        visible
        emoji="ℹ️"
        title="動作保証外"
        description="地下鉄線内は電波が入りづらいため、動作保証外となります。"
        checkboxText="次回以降表示しない"
        checkboxChecked={false}
        onCheckboxChange={onCheckboxChange}
        confirmButtonText="OK"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expect(getByRole('checkbox').props.accessibilityState).toEqual({
      checked: false,
    });

    fireEvent.press(getByText('次回以降表示しない'));
    expect(onCheckboxChange).toHaveBeenCalledWith(true);
  });
});
