import { render } from '@testing-library/react-native';
import { FlatList, Platform } from 'react-native';
import { isClip } from 'react-native-app-clip';
import Licenses from './Licenses';

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({ showActionSheetWithOptions: jest.fn() }),
}));

jest.mock('react-native-app-clip', () => ({
  isClip: jest.fn(() => false),
}));
const mockedIsClip = jest.mocked(isClip);

jest.mock('~/components/FooterTabBar', () => () => null);
jest.mock('~/components/SettingsHeader', () => ({
  SettingsHeader: () => null,
}));
jest.mock('~/components/Button', () => () => null);
jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

// jest-expo の既定 Platform.OS は 'ios'。プラットフォーム別の表示を検証する際は
// 明示的に切り替え、afterEach で必ず元へ戻す。
const originalPlatformOS = Platform.OS;
const setPlatformOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

describe('Licenses', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockedIsClip.mockReturnValue(false);
    setPlatformOS(originalPlatformOS);
  });

  // 一覧は FlatList で末尾の項目は初期描画されないため、描画結果ではなく
  // FlatList に渡した data の id で判定する
  const renderedIds = (): string[] => {
    const screen = render(<Licenses />);
    const list = screen.UNSAFE_getByType(FlatList);
    return (list.props.data as Array<{ id: string }>).map((item) => item.id);
  };

  // VOICEVOX は iOS 本体アプリだけが使う素材なので、クレジットもそこでだけ出す
  describe('VOICEVOX:No.7 のクレジット (iosOnly)', () => {
    it('[iOS 本体アプリ] 表示する', () => {
      setPlatformOS('ios');
      expect(renderedIds()).toContain('voicevox_no7');
    });

    it('[iOS App Clip] Platform.OS が ios でも表示しない', () => {
      setPlatformOS('ios');
      mockedIsClip.mockReturnValue(true);
      const ids = renderedIds();
      expect(ids).not.toContain('voicevox_no7');
      // 他の項目は従来どおり
      expect(ids).toContain('other_oss');
      expect(ids).toContain('ekidata_jp');
    });

    it('[Android] 表示しない', () => {
      setPlatformOS('android');
      expect(renderedIds()).not.toContain('voicevox_no7');
    });
  });
});
