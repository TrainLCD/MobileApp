import { act, render } from '@testing-library/react-native';
import { BlinkingChevron } from './BlinkingChevron';

// モック設定
jest.mock('../../../ChevronTY', () => ({
  ChevronTY: jest.fn(() => null),
}));

describe('BlinkingChevron', () => {
  const { ChevronTY } = require('../../../ChevronTY');

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('初期表示はcolors[0]になる', () => {
    render(<BlinkingChevron colors={['RED', 'BLUE']} />);
    expect(ChevronTY).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: 'RED' }),
      undefined
    );
  });

  it('1秒ごとにcolors[0]とcolors[1]が交互に切り替わる', () => {
    render(<BlinkingChevron colors={['RED', 'BLUE']} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(ChevronTY).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: 'BLUE' }),
      undefined
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(ChevronTY).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: 'RED' }),
      undefined
    );
  });
});
