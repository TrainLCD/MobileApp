import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import navigationState from '../store/atoms/navigation';
import { useHeaderLangState } from './useHeaderLangState';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  default: { __atom: 'navigation' },
}));

const TestComponent: React.FC = () => {
  const langState = useHeaderLangState();
  return <Text testID="langState">{langState}</Text>;
};

describe('useHeaderLangState', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;

  let navigationAtomValue: { headerState: string };

  beforeEach(() => {
    jest.clearAllMocks();
    navigationAtomValue = { headerState: 'CURRENT' };
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === navigationState) {
        return navigationAtomValue;
      }
      throw new Error('unknown atom');
    });
  });

  it('headerStateがアンダースコアを含まない場合JAを返す', async () => {
    navigationAtomValue.headerState = 'CURRENT';

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('langState').children[0]).toBe('JA');
    });
  });

  it('headerStateがCURRENT_ENの場合ENを返す', async () => {
    navigationAtomValue.headerState = 'CURRENT_EN';

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('langState').children[0]).toBe('EN');
    });
  });

  it('headerStateがCURRENT_KANAの場合KANAを返す', async () => {
    navigationAtomValue.headerState = 'CURRENT_KANA';

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('langState').children[0]).toBe('KANA');
    });
  });

  it('headerStateがARRIVING_ZHの場合ZHを返す', async () => {
    navigationAtomValue.headerState = 'ARRIVING_ZH';

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('langState').children[0]).toBe('ZH');
    });
  });

  it('headerStateがNEXT_KOの場合KOを返す', async () => {
    navigationAtomValue.headerState = 'NEXT_KO';

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('langState').children[0]).toBe('KO');
    });
  });

  it('headerStateがARRIVINGの場合JAを返す', async () => {
    navigationAtomValue.headerState = 'ARRIVING';

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('langState').children[0]).toBe('JA');
    });
  });

  it('headerStateがNEXTの場合JAを返す', async () => {
    navigationAtomValue.headerState = 'NEXT';

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('langState').children[0]).toBe('JA');
    });
  });
});
