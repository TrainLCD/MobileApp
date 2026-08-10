import { fireEvent, render } from '@testing-library/react-native';
import { SavePresetNameModal } from './SavePresetNameModal';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: View };
});

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(() => false),
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: true,
}));

jest.mock('./CustomModal', () => ({
  CustomModal: ({
    visible,
    children,
  }: {
    visible: boolean;
    children: React.ReactNode;
  }) => {
    const { View } = require('react-native');
    return visible ? <View testID="custom-modal">{children}</View> : null;
  },
}));

const renderModal = (
  props: Partial<Parameters<typeof SavePresetNameModal>[0]>
) =>
  render(
    <SavePresetNameModal
      visible
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      defaultName="テストプリセット"
      {...props}
    />
  );

describe('SavePresetNameModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('showKeepEndpointsOptionが未指定ならチェックボックスを表示しない', () => {
    const screen = renderModal({});
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('チェックボックスは既定でオンで、keepEndpoints: trueを渡す', () => {
    const onSubmit = jest.fn();
    const screen = renderModal({ onSubmit, showKeepEndpointsOption: true });

    expect(screen.queryByRole('checkbox', { checked: true })).not.toBeNull();

    fireEvent.press(screen.getByText('save'));
    expect(onSubmit).toHaveBeenCalledWith('テストプリセット', true);
  });

  it('チェックボックスをオフにするとkeepEndpoints: falseを渡す', () => {
    const onSubmit = jest.fn();
    const screen = renderModal({ onSubmit, showKeepEndpointsOption: true });

    fireEvent.press(screen.getByRole('checkbox'));
    expect(screen.queryByRole('checkbox', { checked: false })).not.toBeNull();

    fireEvent.press(screen.getByText('save'));
    expect(onSubmit).toHaveBeenCalledWith('テストプリセット', false);
  });

  it('再表示時はチェック状態が既定のオンへ戻る', () => {
    const onSubmit = jest.fn();
    const screen = renderModal({ onSubmit, showKeepEndpointsOption: true });

    fireEvent.press(screen.getByRole('checkbox'));
    screen.rerender(
      <SavePresetNameModal
        visible={false}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        defaultName="テストプリセット"
        showKeepEndpointsOption
      />
    );
    screen.rerender(
      <SavePresetNameModal
        visible
        onClose={jest.fn()}
        onSubmit={onSubmit}
        defaultName="テストプリセット"
        showKeepEndpointsOption
      />
    );

    expect(screen.queryByRole('checkbox', { checked: true })).not.toBeNull();
  });
});
