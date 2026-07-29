import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { type RefObject, useMemo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Typography from '~/components/Typography';
import { FONTS } from '~/constants';
import { AGENT_MAX_MESSAGE_LENGTH } from '~/hooks/useDestinationAgent';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';

// 行高を明示しないと日本語フォールバックフォントの行高(約32pt)で1行時の高さが
// 送信ボタン(48pt)を超え、ボタン上に白い隙間が出る。1行 = 24 + 12*2 = 48pt に固定する
const INPUT_LINE_HEIGHT = 24;
const INPUT_VERTICAL_PADDING = 12;
// 入力が伸びても 4 行までに抑え、それ以上は内部スクロールさせる
const MAX_INPUT_HEIGHT = 4 * INPUT_LINE_HEIGHT + INPUT_VERTICAL_PADDING * 2;
// 残量が見えないと困る領域に入ってから出す(500 - 50)
const COUNTER_VISIBLE_THRESHOLD = 450;

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 48,
    // SearchBar と同じ影値
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  bg: {
    backgroundColor: '#fcfcfc',
    borderRadius: 8,
  },
  ledBg: {
    backgroundColor: '#333',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: INPUT_LINE_HEIGHT,
    minHeight: 48,
    maxHeight: MAX_INPUT_HEIGHT,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: INPUT_VERTICAL_PADDING,
    includeFontPadding: false,
  },
  button: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  counter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** 送信中。多重送信を防ぐため送信ボタンを無効化する */
  sending: boolean;
  /** 429(日次上限)到達。入力自体を受け付けない */
  rateLimited: boolean;
  inputRef?: RefObject<TextInput | null>;
};

export const AgentInputBar = ({
  value,
  onChangeText,
  onSend,
  sending,
  rateLimited,
  inputRef,
}: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const fontFamily = useMemo(
    () => (isLEDTheme ? FONTS.JFDotJiskan24h : FONTS.RobotoRegular),
    [isLEDTheme]
  );

  const canSend = !sending && !rateLimited && value.trim().length > 0;

  return (
    <View>
      <View style={[styles.root, isLEDTheme ? styles.ledBg : styles.bg]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            { color: isLEDTheme ? '#fff' : '#000', fontFamily },
          ]}
          value={value}
          onChangeText={onChangeText}
          editable={!rateLimited}
          multiline
          maxLength={AGENT_MAX_MESSAGE_LENGTH}
          placeholder={translate(
            rateLimited
              ? 'destinationAgentRateLimited'
              : 'destinationAgentPlaceholder'
          )}
          placeholderTextColor={isLEDTheme ? '#ababab' : '#8c8c8c'}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={translate('destinationAgentSend')}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          style={[
            styles.button,
            !canSend && styles.buttonDisabled,
            {
              backgroundColor: isLEDTheme ? '#000' : '#212121',
              borderTopRightRadius: isLEDTheme ? 0 : 8,
              borderBottomRightRadius: isLEDTheme ? 0 : 8,
            },
          ]}
        >
          <Ionicons name="arrow-up" size={21} color="#fff" />
        </TouchableOpacity>
      </View>
      {value.length > COUNTER_VISIBLE_THRESHOLD && (
        <Typography style={styles.counter}>
          {`${value.length}/${AGENT_MAX_MESSAGE_LENGTH}`}
        </Typography>
      )}
    </View>
  );
};
