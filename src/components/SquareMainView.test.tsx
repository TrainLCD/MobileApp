import { act, fireEvent, render, within } from '@testing-library/react-native';
import { AccessibilityInfo, ScrollView, Text } from 'react-native';
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
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
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

it.each([
  [2.6, '3', true],
  [0.4, 'まもなく', false],
  [null, '--', false],
])('renders portrait ETA formatting for %s', (minutes, text, unit) => {
  const r = render(
    <SquareMainView
      {...props}
      etaUnit="分"
      etaSoon="まもなく"
      stops={[
        {
          ...props.stops[1],
          label: '',
          showEta: true,
          estimatedMinutes: minutes as number | null,
        },
      ]}
    />
  );
  fireEvent.press(r.getByTestId('square-station-tap'));
  const eta = within(r.getByTestId('square-eta-2'));
  expect(eta.getByText(text as string)).toBeTruthy();
  expect(!!eta.queryByText('分')).toBe(unit);
  expect(r.getByTestId('square-number-2').props.children).toBe('JY-21');
});

it.each(['つぎは', 'まもなく', 'ただいま', 'Now stopping at'])(
  'shows focused state above the station alongside numbering and ETA: %s',
  (stateText) => {
    const r = render(
      <SquareMainView
        {...props}
        showStops
        stops={props.stops.map((s) => ({
          ...s,
          label: '',
          stateText,
          showEta: s.focused,
          estimatedMinutes: 3,
        }))}
        etaUnit="分"
      />
    );
    const row = within(r.getByTestId('square-stop-2'));
    expect(row.getByTestId('square-stop-state-2').props.children).toBe(
      stateText
    );
    expect(row.getByText('恵比寿')).toBeTruthy();
    expect(row.getByText('JY-21')).toBeTruthy();
    expect(row.getByTestId('square-eta-2')).toBeTruthy();
    expect(r.queryByTestId('square-stop-state-1')).toBeNull();
  }
);

it('follows focused row layout and station changes without resetting manual scrolling on language updates', async () => {
  const scrollTo = ScrollView.prototype.scrollTo as jest.Mock;
  scrollTo.mockClear();
  const stops = [
    ...props.stops,
    { ...props.stops[1], key: '3', name: '目黒', focused: false },
  ];
  const r = render(<SquareMainView {...props} showStops stops={stops} />);
  await act(async () => {});
  const layout = (key: string, y: number) =>
    fireEvent(r.getByTestId(`square-stop-${key}`), 'layout', {
      nativeEvent: { layout: { x: 0, y, width: 328, height: 54 } },
    });
  layout('1', 0);
  layout('2', 108);
  layout('3', 198);
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 54, animated: true });
  scrollTo.mockClear();
  fireEvent.scroll(r.getByTestId('square-stops'), {
    nativeEvent: { contentOffset: { y: 200 } },
  });
  r.rerender(
    <SquareMainView {...props} showStops stops={stops} stateText="Next" />
  );
  layout('2', 108);
  expect(scrollTo).not.toHaveBeenCalled();
  r.rerender(
    <SquareMainView
      {...props}
      showStops
      stops={stops.map((s) => ({ ...s, focused: s.key === '3' }))}
    />
  );
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 144, animated: true });
  layout('3', 210);
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 156, animated: true });
});
it('reacquires row positions when reopening B and scrolls to the top when the first row is focused', async () => {
  const scrollTo = ScrollView.prototype.scrollTo as jest.Mock;
  scrollTo.mockClear();
  const r = render(<SquareMainView {...props} />);
  await act(async () => {});
  fireEvent.press(r.getByTestId('square-station-tap'));
  fireEvent(r.getByTestId('square-stop-2'), 'layout', {
    nativeEvent: { layout: { y: 120 } },
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 66, animated: true });
  fireEvent.press(r.getByTestId('square-stops-tap'));
  fireEvent.press(r.getByTestId('square-station-tap'));
  scrollTo.mockClear();
  fireEvent(r.getByTestId('square-stop-2'), 'layout', {
    nativeEvent: { layout: { y: 120 } },
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 66, animated: true });
  r.rerender(
    <SquareMainView
      {...props}
      stops={props.stops.map((s) => ({ ...s, focused: s.key === '1' }))}
    />
  );
  fireEvent(r.getByTestId('square-stop-1'), 'layout', {
    nativeEvent: { layout: { y: 0 } },
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: true });
});

it('scrolls to the same Y again when the focused station changes', async () => {
  const scrollTo = ScrollView.prototype.scrollTo as jest.Mock;
  const r = render(<SquareMainView {...props} showStops />);
  await act(async () => {});
  for (const [key, y] of [
    ['1', 0],
    ['2', 54],
  ] as const) {
    fireEvent(r.getByTestId(`square-stop-${key}`), 'layout', {
      nativeEvent: { layout: { y } },
    });
  }
  scrollTo.mockClear();
  r.rerender(
    <SquareMainView
      {...props}
      showStops
      stops={props.stops.map((s) => ({ ...s, focused: s.key === '1' }))}
    />
  );
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
});
it('honors reduced motion initially and after changes, and removes the subscription', async () => {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
  const remove = jest.fn();
  let changed: (enabled: boolean) => void = () => {};
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((event, listener) => {
      if (event === 'reduceMotionChanged') changed = listener;
      return { remove };
    });
  const scrollTo = ScrollView.prototype.scrollTo as jest.Mock;
  const r = render(<SquareMainView {...props} showStops />);
  await act(async () => {});
  fireEvent(r.getByTestId('square-stop-2'), 'layout', {
    nativeEvent: { layout: { y: 120 } },
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 66, animated: false });
  act(() => changed(false));
  fireEvent(r.getByTestId('square-stop-2'), 'layout', {
    nativeEvent: { layout: { y: 130 } },
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 76, animated: true });
  r.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it.each([false, true])(
  'dims upcoming, focused and passed pass stations equally (dark: %s)',
  (dark) => {
    const stops = [
      {
        ...props.stops[1],
        key: 'upcoming',
        name: 'Upcoming',
        pass: true,
        focused: false,
        passed: false,
      },
      {
        ...props.stops[1],
        key: 'passing',
        name: 'Passing station',
        pass: true,
        focused: true,
        passed: false,
        stateText: '通過中',
      },
      {
        ...props.stops[1],
        key: 'passed',
        name: 'Passed',
        pass: true,
        focused: false,
        passed: true,
      },
      {
        ...props.stops[1],
        key: 'stop',
        name: 'Stopping station',
        pass: false,
        focused: false,
        passed: false,
      },
    ];
    const r = render(
      <SquareMainView {...props} dark={dark} showStops stops={stops} />
    );
    for (const stop of stops.slice(0, 3)) {
      expect(r.getByText(stop.name)).toHaveStyle({
        color: dark ? '#B6BAC0' : '#60656D',
      });
      expect(r.getByTestId(`square-stop-bar-${stop.key}`)).toHaveStyle({
        opacity: 0.4,
      });
      expect(r.getByTestId(`square-number-${stop.key}`)).toHaveStyle({
        opacity: 0.4,
      });
    }
    expect(r.getByText('Stopping station')).toHaveStyle({
      color: dark ? '#F6F7F8' : '#202124',
    });
    expect(r.getByTestId('square-stop-bar-stop')).toHaveStyle({ opacity: 1 });
    expect(r.getByTestId('square-stop-passing')).toHaveStyle({
      backgroundColor: dark ? '#2B2D31' : '#F2F3F4',
    });
    expect(r.getByTestId('square-stop-state-passing')).toHaveTextContent(
      '通過中'
    );
  }
);

it('scrolls on approach and arrival at the same station after manual scrolling', async () => {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
  const scrollTo = ScrollView.prototype.scrollTo as jest.Mock;
  const r = render(<SquareMainView {...props} showStops scrollPhase="NEXT" />);
  await act(async () => {});
  fireEvent(r.getByTestId('square-stop-2'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 108, width: 328, height: 90 } },
  });
  for (const scrollPhase of ['ARRIVING', 'CURRENT'] as const) {
    fireEvent.scroll(r.getByTestId('square-stops'), {
      nativeEvent: { contentOffset: { y: 300 } },
    });
    scrollTo.mockClear();
    r.rerender(
      <SquareMainView {...props} showStops scrollPhase={scrollPhase} />
    );
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 54, animated: true });
    scrollTo.mockClear();
    r.rerender(
      <SquareMainView
        {...props}
        showStops
        scrollPhase={scrollPhase}
        stateText="English"
      />
    );
    expect(scrollTo).not.toHaveBeenCalled();
  }
});

it('splits junction colors and stacks both numbers while preserving pass opacity', () => {
  const r = render(
    <SquareMainView
      {...props}
      showStops
      stops={[
        {
          ...props.stops[0],
          pass: true,
          junction: [
            { key: 'before', color: '#AA88BB', number: 'Z-01' },
            { key: 'after', color: '#00AA88', number: 'DT-01' },
          ],
        },
      ]}
    />
  );
  expect(r.getByTestId('square-stop-bar-1-0')).toHaveStyle({
    flex: 1,
    backgroundColor: '#AA88BB',
  });
  expect(r.getByTestId('square-stop-bar-1-1')).toHaveStyle({
    flex: 1,
    backgroundColor: '#00AA88',
  });
  expect(r.getByTestId('square-stop-bar-1')).toHaveStyle({ opacity: 0.4 });
  expect(r.getByTestId('square-number-1-0')).toHaveTextContent('Z-01');
  expect(r.getByTestId('square-number-1-1')).toHaveTextContent('DT-01');
});
