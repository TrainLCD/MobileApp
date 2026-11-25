import { fireEvent, render } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { translate } from '../translation';
import {
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from '../utils/dialogPresentation';
import FatalErrorScreen from './FatalErrorScreen';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
}));

describe('FatalErrorScreen', () => {
  afterEach(() => {
    resetDialogPresentationForTests();
    jest.clearAllMocks();
  });

  it('マウント時にスプラッシュスクリーンを閉じてエラーを前面に出す', () => {
    render(<FatalErrorScreen title="エラー" text="本文" />);

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it('スタックトレースを押すと例外が発生した箇所を表示する', () => {
    const stacktrace = 'at ExampleScreen';
    const { getByText } = render(
      <FatalErrorScreen title="エラー" text="本文" stacktrace={stacktrace} />
    );

    fireEvent.press(getByText(translate('stacktrace')));

    expect(getDialogPresentationSnapshot()).toMatchObject({
      visible: true,
      request: { message: stacktrace, buttons: [{ text: 'OK' }] },
    });
  });

  it('hideAsync が reject してもクラッシュしない', () => {
    (SplashScreen.hideAsync as jest.Mock).mockRejectedValueOnce(
      new Error('already hidden')
    );

    expect(() =>
      render(<FatalErrorScreen title="エラー" text="本文" />)
    ).not.toThrow();
  });
});
