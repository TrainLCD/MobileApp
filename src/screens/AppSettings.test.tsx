import {
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { ScrollView, View } from 'react-native';
import { CardChevron } from '~/components/CardChevron';
import type {
  WalkthroughStep,
  WalkthroughStepId,
} from '~/components/WalkthroughOverlay';
import { FAQ_URL } from '~/constants';
import AppSettingsScreen from './AppSettings';

// --- モジュールモック ---

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-native-app-clip', () => ({
  isClip: () => false,
}));

let mockIsDevApp = false;

jest.mock('~/utils/isDevApp', () => ({
  get isDevApp() {
    return mockIsDevApp;
  },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

const { openBrowserAsync } = jest.requireMock('expo-web-browser');

jest.mock('expo-linear-gradient', () => {
  const { View: RNView } = require('react-native');
  return { LinearGradient: RNView };
});

// 末尾の印がシェブロンか外部リンクかをテストから判別できるよう、name を props に残す
jest.mock('@expo/vector-icons', () => {
  const { View: RNView } = require('react-native');
  const ReactMock = require('react');
  return {
    Ionicons: (props: { name: string }) =>
      ReactMock.createElement(RNView, props),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View: RNView } = require('react-native');
  return { SafeAreaView: RNView };
});

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

jest.mock('~/components/WalkthroughOverlay', () => () => null);

// ヘッダーはマウント時に onLayout を発火させ、画面側の再計測を起動する
jest.mock('~/components/SettingsHeader', () => {
  const { useEffect: useEffectMock } = require('react');
  return {
    SettingsHeader: ({
      onLayout,
    }: {
      onLayout: (e: { nativeEvent: { layout: { height: number } } }) => void;
    }) => {
      useEffectMock(() => {
        onLayout({ nativeEvent: { layout: { height: 64 } } });
      }, [onLayout]);
      return null;
    },
  };
});

jest.mock('../components/FooterTabBar', () => ({
  __esModule: true,
  default: () => null,
  useFooterHeight: () => 0,
}));

const mockSetSpotlightArea = jest.fn();
let mockCurrentStepId: WalkthroughStepId | null = null;

jest.mock('~/hooks/useSettingsWalkthrough', () => ({
  useSettingsWalkthrough: () => ({
    isWalkthroughCompleted: false,
    isWalkthroughActive: true,
    currentStepIndex: 0,
    currentStepId: mockCurrentStepId,
    currentStep: null,
    totalSteps: 5,
    nextStep: jest.fn(),
    goToStep: jest.fn(),
    skipWalkthrough: jest.fn(),
    setSpotlightArea: mockSetSpotlightArea,
  }),
}));

const MEASURED_RECT = { x: 24, y: 120, width: 320, height: 76 };

const lastSpotlightArea = (): WalkthroughStep['spotlightArea'] => {
  const lastCall = mockSetSpotlightArea.mock.calls.at(-1);
  return lastCall?.[0];
};

// スポットライト対象の項目を持つステップ
const SPOTLIGHT_STEP_IDS: WalkthroughStepId[] = [
  'settingsTheme',
  'settingsColorScheme',
  'settingsTts',
  'settingsLanguages',
];

describe('AppSettingsScreen', () => {
  let measureSpy: jest.SpyInstance;

  beforeEach(() => {
    // jest 環境では measureInWindow のコールバックが呼ばれないため、固定の矩形を返す
    measureSpy = jest
      .spyOn(
        View.prototype as unknown as {
          measureInWindow: (
            callback: (
              x: number,
              y: number,
              width: number,
              height: number
            ) => void
          ) => void;
        },
        'measureInWindow'
      )
      .mockImplementation((callback) => {
        callback(
          MEASURED_RECT.x,
          MEASURED_RECT.y,
          MEASURED_RECT.width,
          MEASURED_RECT.height
        );
      });
  });

  afterEach(() => {
    mockCurrentStepId = null;
    mockIsDevApp = false;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('ウォークスルーの切り抜きは全ステップで同一の角丸半径になる', async () => {
    const radii: (number | undefined)[] = [];

    for (const stepId of SPOTLIGHT_STEP_IDS) {
      mockCurrentStepId = stepId;
      mockSetSpotlightArea.mockClear();

      const { unmount } = render(<AppSettingsScreen />);

      await waitFor(() => expect(mockSetSpotlightArea).toHaveBeenCalled());
      radii.push(lastSpotlightArea()?.borderRadius);

      unmount();
    }

    expect(radii).toHaveLength(SPOTLIGHT_STEP_IDS.length);
    // 角丸なしのケースが混ざらないこと
    expect(radii.every((radius) => typeof radius === 'number')).toBe(true);
    expect(new Set(radii).size).toBe(1);
  });

  // 非対応環境(GNSS非搭載端末など)はアプリ側で判定できないため、FAQへの導線を常設する。
  // 外部ブラウザへ飛ばすと設定画面から離脱するため、アプリ内ブラウザで開くことも固定する
  it('「アプリについて」のFAQ項目からよくある質問をアプリ内ブラウザで開く', async () => {
    openBrowserAsync.mockResolvedValue(undefined);
    const { getByText } = render(<AppSettingsScreen />);

    await waitFor(() => expect(getByText('faq')).toBeTruthy());
    fireEvent.press(getByText('faq'));

    expect(openBrowserAsync).toHaveBeenCalledWith(FAQ_URL);
  });

  // Webページを開く項目と画面遷移する項目が同じシェブロンだと、押すまで
  // アプリ内ブラウザが開くことが分からないため、末尾の印を出し分ける
  it('FAQ項目の末尾は外部リンクの印で、他の項目はシェブロンのままになる', async () => {
    const { getByLabelText } = render(<AppSettingsScreen />);

    await waitFor(() => expect(getByLabelText('faq')).toBeTruthy());

    // UNSAFE_queryAllByProps は同じ要素をコンポジット・ホスト双方で拾うため、
    // 件数ではなく有無で判定する
    const faqRow = within(getByLabelText('faq'));
    expect(
      faqRow.UNSAFE_queryAllByProps({ name: 'open-outline' }).length
    ).toBeGreaterThan(0);
    expect(faqRow.UNSAFE_queryAllByType(CardChevron)).toHaveLength(0);

    // 同じ「アプリについて」セクション内の画面遷移項目は従来どおりであること
    const licenseRow = within(getByLabelText('license'));
    expect(
      licenseRow.UNSAFE_queryAllByProps({ name: 'open-outline' })
    ).toHaveLength(0);
    expect(licenseRow.UNSAFE_queryAllByType(CardChevron)).toHaveLength(1);
  });

  it('スポットライト対象がないステップでは切り抜きを設定しない', async () => {
    mockCurrentStepId = 'settingsWelcome';
    render(<AppSettingsScreen />);

    await waitFor(() => expect(measureSpy).toHaveBeenCalled());
    expect(mockSetSpotlightArea).not.toHaveBeenCalled();
  });

  // 画面上の文字列を上から順に集める
  const collectTexts = (node: unknown): string[] => {
    if (typeof node === 'string') {
      return [node];
    }
    if (Array.isArray(node)) {
      return node.flatMap(collectTexts);
    }
    if (node && typeof node === 'object' && 'children' in node) {
      return collectTexts((node as { children: unknown }).children ?? []);
    }
    return [];
  };

  it('パーソナライズの項目を見出しで分け、項目の無い見出しは出さない', async () => {
    const { toJSON, getByText } = render(<AppSettingsScreen />);

    await waitFor(() =>
      expect(getByText('settingsSectionDisplay')).toBeTruthy()
    );

    // jest の Platform.OS は ios のため Android 向けは出ず、
    // カナリアリリースでもないので試験的機能と「その他」の見出しも出ない
    expect(collectTexts(toJSON())).toEqual([
      'settingsSectionDisplay',
      'selectThemeTitle',
      'colorSchemeSettings',
      'displayLanguages',
      'settingsSectionNotifications',
      'notificationSettings',
      'autoAnnounce',
      'settingsSectionActivity',
      'rideLogSettings',
      'settingsSectionDevice',
      'batterySettings',
      'aboutApp',
      'faq',
      'license',
    ]);
  });

  it('カナリアリリースでは「その他」の見出しの下に試験的機能を出す', async () => {
    mockIsDevApp = true;
    const { toJSON, getByText } = render(<AppSettingsScreen />);

    await waitFor(() => expect(getByText('settingsSectionOther')).toBeTruthy());

    const texts = collectTexts(toJSON());
    expect(
      texts.slice(
        texts.indexOf('settingsSectionOther'),
        texts.indexOf('aboutApp')
      )
    ).toEqual(['settingsSectionOther', 'experimentalSettings']);
  });

  describe('ウォークスルーで案内する行までスクロールする', () => {
    // 測り直しのたびにテーマ設定・外観・自動アナウンス・表示言語の順で測られる。
    // 自動アナウンスは2つ目の見出しの下にあるため、他の行より下に置く
    const ROW_Y_IN_MEASURE_ORDER = [120, 196, 500, 272];
    let scrollToSpy: jest.SpyInstance;

    beforeEach(() => {
      let measureCount = 0;
      measureSpy.mockImplementation((callback) => {
        const y = ROW_Y_IN_MEASURE_ORDER[measureCount % 4];
        measureCount += 1;
        callback(MEASURED_RECT.x, y, MEASURED_RECT.width, MEASURED_RECT.height);
      });
      scrollToSpy = jest
        .spyOn(ScrollView.prototype, 'scrollTo')
        .mockImplementation(() => undefined);
    });

    const renderWithScrollSize = async (
      contentHeight: number,
      viewportHeight: number
    ) => {
      const utils = render(<AppSettingsScreen />);
      const scrollView = utils.UNSAFE_getByType(ScrollView);
      fireEvent(scrollView, 'layout', {
        nativeEvent: { layout: { height: viewportHeight } },
      });
      fireEvent(scrollView, 'contentSizeChange', 0, contentHeight);
      await waitFor(() => expect(mockSetSpotlightArea).toHaveBeenCalled());
      return utils;
    };

    it('下の見出しにある行はテーマ設定の行の高さまで動かして切り抜く', async () => {
      mockCurrentStepId = 'settingsTts';
      await renderWithScrollSize(1200, 700);

      await waitFor(() =>
        expect(scrollToSpy).toHaveBeenLastCalledWith({
          y: 380,
          animated: false,
        })
      );
      expect(lastSpotlightArea()?.y).toBe(120);
    });

    it('スクロールできる量を超えては動かさない', async () => {
      mockCurrentStepId = 'settingsTts';
      await renderWithScrollSize(800, 700);

      await waitFor(() =>
        expect(scrollToSpy).toHaveBeenLastCalledWith({
          y: 100,
          animated: false,
        })
      );
      expect(lastSpotlightArea()?.y).toBe(400);
    });

    it('最初の行を案内するときはスクロールしない', async () => {
      mockCurrentStepId = 'settingsTheme';
      await renderWithScrollSize(1200, 700);

      await waitFor(() => expect(lastSpotlightArea()?.y).toBe(120));
      expect(scrollToSpy).not.toHaveBeenCalled();
    });
  });
});
