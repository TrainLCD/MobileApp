import { fireEvent, render, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SquareMainView, type SquareMainViewProps } from './SquareMainView';

const transferPress = jest.fn();
const settingsPress = jest.fn();
const props: SquareMainViewProps = {
  dark: false,
  lineName: '山手線',
  lineColor: '#80C241',
  boundText: '品川・東京方面',
  trainTypeName: '普通',
  trainTypeColor: '#123456',
  trainTypeTextColor: '#FFFFFF',
  stateText: 'つぎは',
  stationText: '恵比寿',
  numbering: <Text>JY 21</Text>,
  transferHeading: '恵比寿での乗換',
  transferLabel: 'のりかえ',
  noTransfersText: '乗換路線はありません',
  settingsLabel: '設定',
  toggleLabel: '表示切替',
  disabled: false,
  onSettings: settingsPress,
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  transfers: [
    { key: '1', name: '埼京線', mark: <Text>JA</Text>, onPress: transferPress },
  ],
  stops: [
    {
      key: '1',
      name: '渋谷',
      number: 'JY-20',
      color: '#80C241',
      focused: false,
      passed: true,
      label: '',
    },
    {
      key: '2',
      name: '恵比寿',
      number: 'JY-21',
      color: '#80C241',
      focused: true,
      passed: false,
      label: 'つぎは',
    },
  ],
};
afterEach(() => jest.clearAllMocks());
it('starts with C and switches to B and back; B footer contains a transfer label and marks', () => {
  const r = render(<SquareMainView {...props} />);
  expect(r.getByTestId('square-transfers')).toBeTruthy();
  expect(r.queryByTestId('square-stops')).toBeNull();
  fireEvent.press(r.getByTestId('square-station-tap'));
  expect(r.getByTestId('square-stops')).toBeTruthy();
  const footer = within(r.getByTestId('square-transfer-marks'));
  expect(footer.getByText('のりかえ')).toBeTruthy();
  expect(footer.getByText('JA')).toBeTruthy();
  expect(footer.queryByText('埼京線')).toBeNull();
  expect(footer.queryByText('恵比寿での乗換')).toBeNull();
  fireEvent.press(r.getByTestId('square-stops-tap'));
  expect(r.getByTestId('square-transfers')).toBeTruthy();
});
it('does not reset B when the existing language or arrival state changes', () => {
  const r = render(<SquareMainView {...props} />);
  fireEvent.press(r.getByTestId('square-station-tap'));
  r.rerender(
    <SquareMainView
      {...props}
      transferLabel="Transfers"
      stateText="Next"
      stationText="Ebisu"
      boundText="For Tokyo"
    />
  );
  expect(r.getByTestId('square-stops')).toBeTruthy();
  expect(
    within(r.getByTestId('square-transfer-marks')).getByText('Transfers')
  ).toBeTruthy();
  fireEvent.press(r.getByTestId('square-stops-tap'));
  expect(r.getByTestId('square-station-name').props.children).toBe('Ebisu');
  expect(r.getByTestId('square-state').props.children).toBe('Next');
});
it('keeps settings and transfer actions separate from toggling', () => {
  const r = render(<SquareMainView {...props} />);
  fireEvent.press(r.getByTestId('square-settings'));
  fireEvent.press(r.getByTestId('square-transfer-1'));
  expect(settingsPress).toHaveBeenCalledTimes(1);
  expect(transferPress).toHaveBeenCalledTimes(1);
  expect(r.queryByTestId('square-stops')).toBeNull();
});
it('ignores taps after a scroll gesture', () => {
  const r = render(<SquareMainView {...props} />);
  fireEvent.press(r.getByTestId('square-station-tap'));
  fireEvent(r.getByTestId('square-stops'), 'scrollBeginDrag');
  fireEvent.press(r.getByTestId('square-stops-tap'));
  expect(r.getByTestId('square-stops')).toBeTruthy();
  fireEvent(r.getByTestId('square-root'), 'touchStart');
  fireEvent.press(r.getByTestId('square-stops-tap'));
  expect(r.getByTestId('square-transfers')).toBeTruthy();
});
it('honors touch lock for toggles, settings and transfers', () => {
  const r = render(<SquareMainView {...props} disabled />);
  fireEvent.press(r.getByTestId('square-station-tap'));
  fireEvent.press(r.getByTestId('square-settings'));
  fireEvent.press(r.getByTestId('square-transfer-1'));
  expect(r.queryByTestId('square-stops')).toBeNull();
  expect(settingsPress).not.toHaveBeenCalled();
  expect(transferPress).not.toHaveBeenCalled();
});
it('supports dark appearance, no numbering and no transfers', () => {
  const r = render(
    <SquareMainView {...props} dark numbering={null} transfers={[]} />
  );
  expect(r.getByTestId('square-root')).toHaveStyle({
    backgroundColor: '#202124',
  });
  expect(r.getByTestId('square-line-rule')).toHaveStyle({
    backgroundColor: '#80C241',
  });
  expect(r.queryByText('JY 21')).toBeNull();
  expect(r.getByText('乗換路線はありません')).toBeTruthy();
  fireEvent.press(r.getByTestId('square-empty-transfers'));
  expect(r.getByTestId('square-stops')).toBeTruthy();
});
