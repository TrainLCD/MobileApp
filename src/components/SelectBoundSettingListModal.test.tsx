import { fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { SelectBoundSettingListModal } from './SelectBoundSettingListModal';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../translation', () => ({
  translate: (key: string) => key,
  isJapanese: false,
}));

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  autoModeEnabled: false,
  toggleAutoModeEnabled: jest.fn(),
};

describe('SelectBoundSettingListModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('visible=trueでオートモードのトグルが表示される', () => {
    const { getByText } = render(
      <SelectBoundSettingListModal {...defaultProps} />
    );
    expect(getByText('autoModeSettings')).toBeTruthy();
  });

  it('閉じるボタンを押すとonCloseが呼ばれる', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <SelectBoundSettingListModal {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByText('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('列車種別ボタン', () => {
    it('onTrainTypePressが未指定の場合、列車種別ボタンが表示されない', () => {
      const { queryByText } = render(
        <SelectBoundSettingListModal {...defaultProps} />
      );
      expect(queryByText('trainType')).toBeNull();
    });

    it('onTrainTypePressが指定されている場合、列車種別ボタンが表示される', () => {
      const { getByText } = render(
        <SelectBoundSettingListModal
          {...defaultProps}
          onTrainTypePress={jest.fn()}
          trainTypeName="急行"
        />
      );
      expect(getByText('trainType')).toBeTruthy();
      expect(getByText('急行')).toBeTruthy();
    });

    it('trainTypeNameが空の場合、フォールバックテキストが表示される', () => {
      const { getByText } = render(
        <SelectBoundSettingListModal
          {...defaultProps}
          onTrainTypePress={jest.fn()}
        />
      );
      expect(getByText('trainTypeDefault')).toBeTruthy();
    });

    it('trainTypeDisabled=trueの場合、「列車種別がありません」が表示される', () => {
      const { getByText, queryByText } = render(
        <SelectBoundSettingListModal
          {...defaultProps}
          onTrainTypePress={jest.fn()}
          trainTypeDisabled={true}
        />
      );
      expect(getByText('trainTypesNotExist')).toBeTruthy();
      expect(queryByText('trainType')).toBeNull();
    });

    it('列車種別ボタンを押すとonTrainTypePressが呼ばれる', () => {
      const onTrainTypePress = jest.fn();
      const { getByText } = render(
        <SelectBoundSettingListModal
          {...defaultProps}
          onTrainTypePress={onTrainTypePress}
          trainTypeName="準急"
        />
      );
      fireEvent.press(getByText('trainType'));
      expect(onTrainTypePress).toHaveBeenCalledTimes(1);
    });

    it('trainTypeDisabled=trueの場合、ボタンを押してもonTrainTypePressが呼ばれない', () => {
      const onTrainTypePress = jest.fn();
      const { getByText } = render(
        <SelectBoundSettingListModal
          {...defaultProps}
          onTrainTypePress={onTrainTypePress}
          trainTypeDisabled={true}
        />
      );
      fireEvent.press(getByText('trainTypesNotExist'));
      expect(onTrainTypePress).not.toHaveBeenCalled();
    });
  });
});
