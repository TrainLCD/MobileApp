import { Alert } from 'react-native';
import { showAlertWhilePresenting } from './alertPresentation';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('showAlertWhilePresenting', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('同じキーのアラートが表示中なら二重表示しない', () => {
    expect(showAlertWhilePresenting('notice', 'title')).toBe(true);
    expect(showAlertWhilePresenting('notice', 'title')).toBe(false);

    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('ボタン押下後は同じキーを再表示できる', () => {
    showAlertWhilePresenting('retryableNotice', 'title', undefined, [
      { text: 'OK' },
    ]);

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons[0].onPress();

    expect(showAlertWhilePresenting('retryableNotice', 'title')).toBe(true);
    expect(Alert.alert).toHaveBeenCalledTimes(2);
  });

  it('dismiss後は同じキーを再表示できる', () => {
    showAlertWhilePresenting('dismissedNotice', 'title');

    const options = (Alert.alert as jest.Mock).mock.calls[0][3];
    options.onDismiss();

    expect(showAlertWhilePresenting('dismissedNotice', 'title')).toBe(true);
    expect(Alert.alert).toHaveBeenCalledTimes(2);
  });
});
