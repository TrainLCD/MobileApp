import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import tuningState from '~/store/atoms/tuning';
import MainStack from './MainStack';

type ScreenProps = {
  name: string;
  options?: { gestureEnabled?: boolean };
};

const screenProps: ScreenProps[] = [];

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: (props: ScreenProps) => {
      screenProps.push(props);
      return null;
    },
  }),
}));

jest.mock('~/hooks', () => ({
  useConnectivity: () => true,
  useUnderMaintenance: () => false,
}));

// 画面コンポーネント本体はここでの検証対象ではなく、
// ネイティブ依存の解決コストだけが増えるため空実装へ差し替える
jest.mock('~/components/Permitted', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
// jest.mock はファイル先頭へ巻き上げられる必要があるため、ループでまとめず個別に書く
jest.mock('~/screens/AndroidSettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/AppSettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/BatterySettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/DestinationAgent', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/EnabledLanguagesSettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/ExperimentalSettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/Licenses', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/Main', () => ({ __esModule: true, default: () => null }));
jest.mock('~/screens/NotificationSettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/RouteSearchScreen', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/SelectLineScreen', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/ThemeSettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/screens/TTSSettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/components/ErrorScreen', () => ({
  __esModule: true,
  default: () => null,
}));

const renderWithStore = (untouchableModeEnabled: boolean) => {
  const store = createStore();
  store.set(tuningState, (prev) => ({ ...prev, untouchableModeEnabled }));

  return render(
    <Provider store={store}>
      <MainStack />
    </Provider>
  );
};

const getMainScreenProps = () =>
  screenProps.find((props) => props.name === 'Main');

describe('MainStack', () => {
  beforeEach(() => {
    screenProps.length = 0;
  });

  it('タッチ不可モードが有効な場合は走行画面のスワイプバックを無効化する', () => {
    renderWithStore(true);

    expect(getMainScreenProps()?.options?.gestureEnabled).toBe(false);
  });

  it('タッチ不可モードが無効な場合は走行画面のスワイプバックを許可する', () => {
    renderWithStore(false);

    expect(getMainScreenProps()?.options?.gestureEnabled).toBe(true);
  });
});
