import { fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { createStation } from '~/utils/test/factories';
import { CommonCard } from './CommonCard';
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

jest.mock('../hooks', () => ({
  useBounds: jest.fn(() => ({ bounds: [[], []] })),
  useGetLineMark: jest.fn(() => jest.fn(() => null)),
}));

jest.mock('./TransferLineMark', () => () => null);

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  autoModeEnabled: false,
  toggleAutoModeEnabled: jest.fn(),
};

describe('SelectBoundSettingListModal', () => {
  afterEach(() => {
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

  describe('テーマボタン', () => {
    it('onThemePressが未指定の場合、テーマボタンが表示されない', () => {
      const { queryByText } = render(
        <SelectBoundSettingListModal {...defaultProps} />
      );
      expect(queryByText('theme')).toBeNull();
    });

    it('onThemePressが指定されている場合、テーマボタンが表示される', () => {
      const { getByText } = render(
        <SelectBoundSettingListModal
          {...defaultProps}
          onThemePress={jest.fn()}
          themeLabel="東京メトロ風"
        />
      );
      expect(getByText('theme')).toBeTruthy();
      expect(getByText('東京メトロ風')).toBeTruthy();
    });

    it('themeLabelが空の場合、フォールバックテキストが表示される', () => {
      const { getByText } = render(
        <SelectBoundSettingListModal
          {...defaultProps}
          onThemePress={jest.fn()}
        />
      );
      expect(getByText('autoTheme')).toBeTruthy();
    });

    it('テーマボタンを押すとonThemePressが呼ばれる', () => {
      const onThemePress = jest.fn();
      const { getByText } = render(
        <SelectBoundSettingListModal
          {...defaultProps}
          onThemePress={onThemePress}
          themeLabel="自動"
        />
      );
      fireEvent.press(getByText('theme'));
      expect(onThemePress).toHaveBeenCalledTimes(1);
    });
  });
});

describe('現在駅の手動指定', () => {
  it('駅一覧に切り替え、選択してモーダルを閉じる', () => {
    const station = createStation(1, {
      name: '豊島園',
      nameRoman: 'Toshimaen',
    });
    const onStationSelect = jest.fn();
    const onClose = jest.fn();
    const ui = render(
      <SelectBoundSettingListModal
        {...defaultProps}
        stations={[station]}
        onStationSelect={onStationSelect}
        onClose={onClose}
      />
    );
    fireEvent.press(ui.getByText('specifyStation'));
    expect(ui.queryByText('autoModeSettings')).toBeNull();
    const card = ui.UNSAFE_getByType(CommonCard);
    expect(card.props.targetStation).toBe(station);
    expect(card.props.line).toBe(station.line);
    expect(ui.getByText('Test Line')).toBeTruthy();
    fireEvent.press(ui.getByText('Toshimaen'));
    expect(onStationSelect).toHaveBeenCalledWith(station);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('一覧を閉じて開き直すと設定に戻る', () => {
    const props = {
      ...defaultProps,
      stations: [createStation(1)],
      onStationSelect: jest.fn(),
    };
    const ui = render(<SelectBoundSettingListModal {...props} />);
    fireEvent.press(ui.getByText('specifyStation'));
    ui.rerender(<SelectBoundSettingListModal {...props} visible={false} />);
    ui.rerender(<SelectBoundSettingListModal {...props} visible />);
    expect(ui.getByText('autoModeSettings')).toBeTruthy();
    expect(props.onStationSelect).not.toHaveBeenCalled();
  });
});
