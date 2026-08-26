import { PortalProvider } from '@gorhom/portal';
import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Text } from 'react-native';
import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import { THEME_PREFERENCE } from '~/models/Theme';
import { useAppColors } from '~/providers/AppColorsProvider';
import { colorSchemePreferenceAtom } from '~/store/atoms/colorScheme';
import { themePreferenceAtom } from '~/store/atoms/theme';
import { CustomModal } from './CustomModal';

const Probe = () => {
  const colors = useAppColors();
  return <Text>{colors.card}</Text>;
};

// 走行画面と同じく AppColorsProvider を挟まないツリーからモーダルを開く。
// Portal は PortalHost の位置で子要素をマウントするため、CustomModal 側で
// Provider を張り直せていないと配色が届かない。
const renderModal = (led = false) => {
  const store = createStore();
  store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.DARK);
  store.set(
    themePreferenceAtom,
    led ? THEME_PREFERENCE.LED : THEME_PREFERENCE.TOKYO_METRO
  );

  return render(
    <Provider store={store}>
      <PortalProvider>
        <CustomModal visible>
          <Probe />
        </CustomModal>
      </PortalProvider>
    </Provider>
  );
};

describe('CustomModal の配色', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('走行画面から開いてもダークの配色が子孫へ届く', () => {
    const { getByText } = renderModal();

    expect(getByText(DARK_APP_COLORS.card)).toBeTruthy();
  });

  it('電光掲示板風テーマではダークを選んでも従来の配色のままにする', () => {
    const { getByText } = renderModal(true);

    expect(getByText(LIGHT_APP_COLORS.card)).toBeTruthy();
  });
});
