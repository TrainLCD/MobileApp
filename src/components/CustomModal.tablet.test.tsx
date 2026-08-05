import { render } from '@testing-library/react-native';
import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { CustomModal } from './CustomModal';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: true,
}));

describe('CustomModal - tablet', () => {
  it('最大高さを90%に広げる', () => {
    const { UNSAFE_root } = render(
      <CustomModal visible={true}>
        <Text>Test Content</Text>
      </CustomModal>
    );

    const modalContent = UNSAFE_root.findAll((node: typeof UNSAFE_root) => {
      const style = StyleSheet.flatten(node.props.style);
      return style?.maxWidth === 480;
    })[0];

    expect(modalContent).toBeDefined();
    expect(StyleSheet.flatten(modalContent.props.style)?.maxHeight).toBe('90%');
  });
});
