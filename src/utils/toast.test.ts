import Toast from 'react-native-toast-message';
import { showToast, TOAST_HIDE_DURATION } from '~/utils/toast';

jest.mock('react-native-toast-message', () => ({
  hide: jest.fn(),
  show: jest.fn(),
}));

describe('showToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call Toast.hide immediately', () => {
    showToast({ type: 'success', text1: 'Test message' });

    expect(Toast.hide).toHaveBeenCalledTimes(1);
  });

  it('should not call Toast.show before the delay', () => {
    showToast({ type: 'success', text1: 'Test message' });

    expect(Toast.show).not.toHaveBeenCalled();
  });

  it('should call Toast.show after the delay', () => {
    const params = { type: 'success' as const, text1: 'Test message' };
    showToast(params);

    jest.advanceTimersByTime(TOAST_HIDE_DURATION);

    expect(Toast.show).toHaveBeenCalledTimes(1);
    expect(Toast.show).toHaveBeenCalledWith(params);
  });

  it('should pass all params to Toast.show', () => {
    const params = {
      type: 'error' as const,
      text1: 'Error title',
      text2: 'Error description',
      visibilityTime: 5000,
    };
    showToast(params);

    jest.advanceTimersByTime(TOAST_HIDE_DURATION);

    expect(Toast.show).toHaveBeenCalledWith(params);
  });
});
