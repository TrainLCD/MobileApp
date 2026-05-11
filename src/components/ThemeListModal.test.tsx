import { fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { THEME_PREFERENCE } from '~/models/Theme';
import { getSettingsThemes } from '~/utils/theme';
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

  it('getSettingsThemes() の全テーマがレンダリングされる', () => {
    const themes = getSettingsThemes();
    const { getByText } = render(<ThemeListModal {...defaultProps} />);
    for (const theme of themes) {
      expect(getByText(theme.label)).toBeTruthy();
    }
  });

  it('現在選択中のテーマのみ inUse、他は全て select と表示される', () => {
    const themes = getSettingsThemes();
    const { getAllByText } = render(
      <ThemeListModal
        {...defaultProps}
        currentPreference={THEME_PREFERENCE.TOKYO_METRO}
      />
    );
    expect(getAllByText('inUse')).toHaveLength(1);
    expect(getAllByText('select')).toHaveLength(themes.length - 1);
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
