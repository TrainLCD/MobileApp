import { render } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import FatalErrorScreen from './FatalErrorScreen';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
}));

describe('FatalErrorScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('マウント時にスプラッシュスクリーンを閉じてエラーを前面に出す', () => {
    render(<FatalErrorScreen title="エラー" text="本文" />);

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
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
