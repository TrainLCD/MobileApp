import { render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import type React from 'react';
import { StyleSheet } from 'react-native';
import { THEME_PREFERENCE } from '~/models/Theme';
import { ThemeConfirmModal } from './ThemeConfirmModal';

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

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

describe('ThemeConfirmModal', () => {
  it('タイトルの位置を保ち、プレビュー画像を説明文より先に表示する', () => {
    const { UNSAFE_getByType, UNSAFE_root, getByText } = render(
      <ThemeConfirmModal
        visible
        themeId={THEME_PREFERENCE.TOKYO_METRO}
        themeTitle="東京メトロ風"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    const renderedNodes = UNSAFE_root.findAll(() => true);
    const themeTitle = getByText('東京メトロ風');
    const previewImage = UNSAFE_getByType(Image);
    const description = getByText('themeDescriptionTokyoMetro');

    expect(renderedNodes.indexOf(themeTitle)).toBeLessThan(
      renderedNodes.indexOf(previewImage)
    );
    expect(renderedNodes.indexOf(previewImage)).toBeLessThan(
      renderedNodes.indexOf(description)
    );
    expect(StyleSheet.flatten(description.props.style)?.marginBottom).toBe(24);
  });
});
