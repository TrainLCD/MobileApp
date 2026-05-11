import { fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { THEME_PREFERENCE } from '~/models/Theme';
import { ThemeListModal } from './ThemeListModal';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('react-native-app-clip', () => ({
  isClip: jest.fn(() => false),
}));

jest.mock('../translation', () => ({
  translate: (key: string) => key,
  isJapanese: false,
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: false,
}));

const defaultProps = {
  visible: true,
  currentPreference: THEME_PREFERENCE.AUTO,
  onClose: jest.fn(),
  onSelect: jest.fn(),
};

describe('ThemeListModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('全テーマの選択肢が表示される', () => {
    const { getByText } = render(<ThemeListModal {...defaultProps} />);
    // 翻訳キーをそのまま返すモックなので、各テーマのラベルキーが描画される
    expect(getByText('autoTheme')).toBeTruthy();
    expect(getByText('tokyoMetroLike')).toBeTruthy();
    expect(getByText('ledLike')).toBeTruthy();
  });

  it('現在選択中のテーマは inUse、その他は select と表示される', () => {
    const { getAllByText } = render(
      <ThemeListModal
        {...defaultProps}
        currentPreference={THEME_PREFERENCE.TOKYO_METRO}
      />
    );
    expect(getAllByText('inUse')).toHaveLength(1);
    // 全テーマ数 - 1（選択中以外）が select 表示
    expect(getAllByText('select').length).toBeGreaterThan(1);
  });

  it('テーマを押すと onSelect がそのテーマで呼ばれる', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ThemeListModal {...defaultProps} onSelect={onSelect} />
    );
    fireEvent.press(getByText('tokyoMetroLike'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(THEME_PREFERENCE.TOKYO_METRO);
  });

  it('閉じるボタンを押すと onClose が呼ばれる', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ThemeListModal {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByText('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
