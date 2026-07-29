import { useAtomValue } from 'jotai';
import { StyleSheet, View } from 'react-native';
import Typography from '~/components/Typography';
import type { AgentMessageRole } from '~/hooks/useDestinationAgent';
import { isLEDThemeAtom } from '~/store/atoms/theme';

// ユーザバブルは白文字とのコントラスト比 4.5:1 以上(WCAG AA)を満たす色を使う。
// 既存アクセント #008ffe は約 3.5:1 で AA を満たさないためバブル背景には使わない。
const USER_BUBBLE_COLOR = '#0071CE';

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
    backgroundColor: '#fff',
  },
  radius: {
    borderRadius: 12,
  },
  shadow: {
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
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
  const isUser = role === 'user';

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.root,
        isUser ? styles.user : styles.assistant,
        isLEDTheme
          ? [styles.ledBorder, isUser ? styles.ledUser : styles.ledAssistant]
          : [styles.radius, !isUser && styles.shadow],
      ]}
    >
      <Typography
        style={[styles.text, (isUser || isLEDTheme) && styles.userText]}
      >
        {content}
      </Typography>
    </View>
  );
};
