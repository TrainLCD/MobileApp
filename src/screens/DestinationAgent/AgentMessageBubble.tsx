import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Typography from '~/components/Typography';
import type { AgentMessageRole } from '~/hooks/useDestinationAgent';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
import { getAgentColors } from './agentColors';

// ユーザバブルは白文字とのコントラスト比 4.5:1 以上(WCAG AA)を満たす色を使う。
// 既存アクセント #008ffe は約 3.5:1 で AA を満たさないためバブル背景には使わない。
const USER_BUBBLE_COLOR = '#0071CE';

// AI 応答は Markdown の強調(**text**)を含むことがある。フル Markdown は
// 解釈せず、太字だけをインライン装飾として描画する(閉じない ** は文字どおり残す)
const BOLD_SEGMENT_REGEX = /\*\*([^*][\s\S]*?)\*\*/;

export type BubbleSegment = { text: string; bold: boolean };

export const parseBoldSegments = (content: string): BubbleSegment[] =>
  content
    .split(BOLD_SEGMENT_REGEX)
    // split の捕捉グループにより奇数インデックスが太字部分になる
    .map((text, index) => ({ text, bold: index % 2 === 1 }))
    .filter((segment) => segment.text.length > 0);

// URL として扱うのは http(s) だけ。AI 応答を開く先に任意スキームを許さない。
// 日本語の本文では URL の直後に空白を置かずに「をご確認」「）」が続くため、
// URL の構成文字は ASCII に限る
const URL_REGEX = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g;
// 文末の句読点や閉じ括弧は URL に含めない
const URL_TRAILING_PUNCTUATION_REGEX = /[.,:;!?'*]+$/;

const trimUrl = (candidate: string): string => {
  let url = candidate.replace(URL_TRAILING_PUNCTUATION_REGEX, '');
  // 「(https://example.com)」の閉じ括弧は URL の外側。URL 内で対応の取れた
  // 括弧(Wikipedia の記事名など)だけを残す
  while (
    url.endsWith(')') &&
    (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0)
  ) {
    url = url.slice(0, -1).replace(URL_TRAILING_PUNCTUATION_REGEX, '');
  }
  return url;
};

export type TextPart = { text: string; url?: string };

export const splitUrls = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const url = trimUrl(match[0]);
    // スキームだけで終わる文字列はリンクにしない
    if (url.length <= match[0].indexOf('//') + 2) {
      continue;
    }
    const start = match.index;
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start) });
    }
    parts.push({ text: url, url });
    cursor = start + url.length;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor) });
  }
  return parts;
};

const styles = StyleSheet.create({
  root: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: USER_BUBBLE_COLOR,
  },
  assistant: {
    alignSelf: 'flex-start',
  },
  radius: {
    borderRadius: 12,
  },
  shadow: {
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
  },
  ledBorder: {
    borderColor: '#fff',
    borderWidth: 1,
  },
  ledUser: {
    backgroundColor: '#333',
  },
  ledAssistant: {
    backgroundColor: '#212121',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  boldText: {
    fontWeight: 'bold',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  userText: {
    color: '#fff',
  },
});

type Props = {
  role: AgentMessageRole;
  content: string;
};

export const AgentMessageBubble = ({ role, content }: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const isUser = role === 'user';
  const onColoredBubble = isUser || isLEDTheme;

  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url).catch((error) => {
      console.error('Failed to open link in agent message', error);
      showDialog(translate('errorTitle'), translate('failedToOpenLink'));
    });
  }, []);

  const renderParts = (text: string, bold: boolean, segmentIndex: number) =>
    splitUrls(text).map((part, partIndex) => {
      const key = `${segmentIndex}-${partIndex}-${part.text}`;
      if (part.url) {
        const url = part.url;
        return (
          <Typography
            // 並び順以外に安定な識別子がない静的リスト
            key={key}
            accessibilityRole="link"
            onPress={() => handleLinkPress(url)}
            style={[
              styles.text,
              bold && styles.boldText,
              styles.linkText,
              // 色付きバブルでは背景と同系色のリンク色が埋もれるため、白文字の下線で示す
              onColoredBubble
                ? styles.userText
                : { color: getAgentColors(colors.isDark).linkText },
            ]}
          >
            {part.text}
          </Typography>
        );
      }
      if (bold) {
        return (
          <Typography
            key={key}
            style={[
              styles.text,
              styles.boldText,
              onColoredBubble && styles.userText,
            ]}
          >
            {part.text}
          </Typography>
        );
      }
      return part.text;
    });

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.root,
        isUser
          ? styles.user
          : [styles.assistant, { backgroundColor: colors.card }],
        isLEDTheme
          ? [styles.ledBorder, isUser ? styles.ledUser : styles.ledAssistant]
          : [styles.radius, !isUser && styles.shadow],
      ]}
    >
      <Typography style={[styles.text, onColoredBubble && styles.userText]}>
        {parseBoldSegments(content).flatMap((segment, index) =>
          renderParts(segment.text, segment.bold, index)
        )}
      </Typography>
    </View>
  );
};
