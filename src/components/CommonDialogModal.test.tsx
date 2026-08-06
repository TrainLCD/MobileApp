import { fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { StyleSheet } from 'react-native';
import { CommonDialogModal } from './CommonDialogModal';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
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

  it('路線記号画像がある場合は絵文字の代わりに表示する', () => {
    const { getByTestId, queryByText } = render(
      <CommonDialogModal
        visible
        emoji="ℹ️"
        lineSymbol={{ image: 101, color: '#c1a470' }}
        title="路線を切り替えますか？"
        description="確認してください"
        confirmButtonText="OK"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    const lineSymbolImage = getByTestId('common-dialog-line-symbol-image');
    let leading = lineSymbolImage.parent;

    while (
      leading &&
      StyleSheet.flatten(leading.props.style)?.marginRight !== 12
    ) {
      leading = leading.parent;
    }

    expect(lineSymbolImage).toBeTruthy();
    expect(leading).not.toBeNull();
    expect(queryByText('ℹ️')).toBeNull();
  });

  it('路線記号画像がない場合はラインカラーのグラデーションを表示する', () => {
    const { getByTestId, queryByText } = render(
      <CommonDialogModal
        visible
        emoji="ℹ️"
        lineSymbol={{ color: '#c1a470' }}
        title="路線を切り替えますか？"
        description="確認してください"
        confirmButtonText="OK"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expect(
      getByTestId('common-dialog-line-symbol-fallback').props.colors
    ).toEqual(['#c1a470', '#d0bb94']);
    expect(queryByText('ℹ️')).toBeNull();
  });
});
