import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { FONTS } from '~/constants';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';

/** 電光掲示板風テーマで背景から一段浮かせる面の色 */
const LED_SURFACE_COLOR = '#333';
/** 電光掲示板風テーマの黒地でも読めるプレースホルダーの色 */
const LED_PLACEHOLDER_COLOR = '#9AA0A6';

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    height: 48,
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 8 : 16,
    includeFontPadding: false,
  },
  bg: {
    borderRadius: 8,
  },
  ledBg: {
    backgroundColor: LED_SURFACE_COLOR,
  },
  button: {
    width: 48,
    height: 48,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 32,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

type Props = {
  /** 検索の実行。送信キーと検索ボタンの両方から呼ばれる */
  onSearch?: (text: string) => void;
  nameSearch?: boolean;
  /**
   * 入力値を親で持つときに渡す。渡すと制御コンポーネントとして振る舞い、
   * 1 文字ごとに絞り込むような用途に使える。
   */
  value?: string;
  onChangeText?: (text: string) => void;
  /**
   * 初期表示だけ親から与えたいときに渡す。以降は入力欄が自分で値を持つので、
   * 1 文字ごとの書き戻しが起きない（iOS の変換候補が壊れない）
   */
  defaultValue?: string;
  /** 既定の翻訳文以外を出したいときだけ渡す */
  placeholder?: string;
  /** 入力があるときに入力欄内のクリアボタンを出す */
  clearable?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  /**
   * 日本語入力の変換候補を確実に出したい呼び出し元だけが true を明示する。
   * ここで既定値を持たせてはいけない理由は下の TextInput のコメントを参照。
   */
  autoCorrect?: TextInputProps['autoCorrect'];
  testID?: string;
  clearButtonTestID?: string;
};

export const SearchBar = ({
  onSearch,
  nameSearch,
  value,
  onChangeText,
  defaultValue,
  placeholder,
  clearable,
  autoCapitalize,
  autoCorrect,
  testID,
  clearButtonTestID,
}: Props) => {
  const [internalText, setInternalText] = useState(defaultValue ?? '');
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

  // value を渡さない従来の使い方では、これまで通り自前で入力値を持つ
  const searchText = value ?? internalText;

  const fontFamily = useMemo(() => {
    if (isLEDTheme) {
      return FONTS.JFDotJiskan24h;
    }
    return FONTS.RobotoRegular;
  }, [isLEDTheme]);

  const handleChangeText = useCallback(
    (text: string) => {
      if (value === undefined) {
        setInternalText(text);
      }
      onChangeText?.(text);
    },
    [value, onChangeText]
  );

  const handleClear = useCallback(
    () => handleChangeText(''),
    [handleChangeText]
  );

  const handleSearch = useCallback(
    () => onSearch?.(searchText),
    [onSearch, searchText]
  );

  return (
    <View
      style={[
        styles.root,
        isLEDTheme
          ? styles.ledBg
          : [styles.bg, { backgroundColor: colors.subtleSurface }],
      ]}
    >
      <TextInput
        testID={testID}
        style={[
          styles.textInput,
          {
            color: isLEDTheme || colors.isDark ? 'white' : 'black',
            fontFamily,
          },
        ]}
        placeholderTextColor={
          isLEDTheme
            ? LED_PLACEHOLDER_COLOR
            : colors.isDark
              ? colors.secondaryText
              : undefined
        }
        value={searchText}
        onChangeText={handleChangeText}
        onSubmitEditing={handleSearch}
        placeholder={
          placeholder ??
          translate(
            nameSearch
              ? 'stationNameSearchPlaceholder'
              : 'routeSearchPlaceholder'
          )
        }
        autoCapitalize={autoCapitalize}
        // autoCorrect は呼び出し元から受け取るだけで、ここで既定値を持たせない。
        //
        // New Architecture の RCTTextInputComponentView は autoCorrect が前回
        // props から変化したときしか autocorrectionType を代入せず、
        // prepareForRecycle でも autocorrectionType を戻さない
        // (react-native/React/Fabric/Mounting/ComponentViews/TextInput/
        //  RCTTextInputComponentView.mm)。
        //
        // このコンポーネント自身が true を固定すると、変換候補のために true を
        // 明示している種別絞り込みと署名が一致し、再利用ビューでは true → true で
        // 代入自体が起きず、残っていた .no を引き継いで変換候補が出なくなる。
        // 既定を std::nullopt のままにしておくことで、明示した呼び出し元の true が
        // 必ず「変化あり」と判定される。
        autoCorrect={autoCorrect}
        returnKeyType="search"
      />
      {clearable && searchText.length ? (
        <TouchableOpacity
          accessibilityRole="button"
          // アイコンだけのボタンは読み上げ名がフォールバックの記号名になり
          // 操作の目的が伝わらないため、名前を明示する
          accessibilityLabel={translate('searchBarClear')}
          testID={clearButtonTestID}
          style={styles.clearButton}
          onPress={handleClear}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={isLEDTheme ? LED_PLACEHOLDER_COLOR : colors.secondaryText}
          />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={translate('search')}
        style={[
          styles.button,
          isLEDTheme
            ? undefined
            : { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
        ]}
        onPress={handleSearch}
      >
        <Ionicons name="search" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};
