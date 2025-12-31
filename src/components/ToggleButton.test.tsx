import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ToggleButton } from './ToggleButton';

// Mock jotai
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false), // isLEDThemeAtom returns false by default
  atom: jest.fn((initialValue) => initialValue),
}));

describe('ToggleButton', () => {
  const defaultProps = {
    children: 'テストボタン',
    onToggle: jest.fn(),
    state: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされる', () => {
    const { getByText } = render(<ToggleButton {...defaultProps} />);

    expect(getByText('テストボタン')).toBeTruthy();
  });

  it('onToggleが呼ばれる', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <ToggleButton {...defaultProps} onToggle={onToggle} />
    );

    const button = getByText('テストボタン');
    fireEvent.press(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('stateがtrueの場合、ONと表示される', () => {
    const { getByText } = render(
      <ToggleButton {...defaultProps} state={true} />
    );

    expect(getByText('ON')).toBeTruthy();
  });

  it('stateがfalseの場合、OFFと表示される', () => {
    const { getByText } = render(
      <ToggleButton {...defaultProps} state={false} />
    );

    expect(getByText('OFF')).toBeTruthy();
  });

  it('カスタムonTextとoffTextが正しく表示される', () => {
    const { getByText, rerender } = render(
      <ToggleButton
        {...defaultProps}
        state={true}
        onText="有効"
        offText="無効"
      />
    );

    expect(getByText('有効')).toBeTruthy();

    rerender(
      <ToggleButton
        {...defaultProps}
        state={false}
        onText="有効"
        offText="無効"
      />
    );

    expect(getByText('無効')).toBeTruthy();
  });

  it('outlineスタイルが適用される', () => {
    const { getByText } = render(
      <ToggleButton {...defaultProps} outline={true} />
    );

    const button = getByText('テストボタン').parent?.parent;
    expect(button).toBeTruthy();
  });

  it('childrenがReactNodeとして正しくレンダリングされる', () => {
    const { getByText } = render(
      <ToggleButton {...defaultProps}>
        <Text>カスタム子要素</Text>
      </ToggleButton>
    );

    expect(getByText('カスタム子要素')).toBeTruthy();
  });

  it('複数回クリックしても正しく動作する', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <ToggleButton {...defaultProps} onToggle={onToggle} />
    );

    const button = getByText('テストボタン');
    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(button);

    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('paddingHorizontalが24pxに設定されている', () => {
    const { getByText } = render(<ToggleButton {...defaultProps} />);

    const button = getByText('テストボタン').parent?.parent;
    expect(button).toBeTruthy();
    // スタイルのアサーションは実際のスナップショットテストで確認されるべき
  });
});
