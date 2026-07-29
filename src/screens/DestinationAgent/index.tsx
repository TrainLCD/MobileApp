import { useNavigation } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Station } from '~/@types/graphql';
import { CommonCard } from '~/components/CommonCard';
import { SelectBoundModal } from '~/components/SelectBoundModal';
import { TrainTypeListModal } from '~/components/TrainTypeListModal';
import Typography from '~/components/Typography';
import {
  type AgentMessageRole,
  type AgentSuggestion,
  useDestinationAgent,
} from '~/hooks/useDestinationAgent';
import { useDestinationSelection } from '~/hooks/useDestinationSelection';
import { useLazyGraphQLQuery } from '~/hooks/useLazyGraphQLQuery';
import { GET_STATIONS_BY_IDS } from '~/lib/graphql/queries';
import { stationAtom } from '~/store/atoms/station';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { showToast } from '~/utils/toast';
import { AgentEmptyState } from './AgentEmptyState';
import { AgentHeader } from './AgentHeader';
import { AgentInputBar } from './AgentInputBar';
import { AgentMessageBubble } from './AgentMessageBubble';
import { AgentTypingIndicator } from './AgentTypingIndicator';

type GetStationsByIdsData = {
  stations: Station[];
};

type GetStationsByIdsVariables = {
  ids: number[];
};

type ChatEntry = {
  id: string;
  role: AgentMessageRole;
  content: string;
  suggestions?: AgentSuggestion[];
  /**
   * サーバへ送る messages に含めるか。429 の定型文はクライアント生成の
   * 疑似発話なので会話履歴を汚さないよう false にする。
   */
  includeInHistory: boolean;
};

type SuggestionState = {
  status: 'loading' | 'loaded' | 'error';
  stations: Station[];
};

// タブレットでバブルが横に伸びすぎると可読性が落ちるため中央寄せの最大幅を設ける
const TABLET_CONTENT_MAX_WIDTH = 700;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bg: {
    backgroundColor: '#FAFAFA',
  },
  ledBg: {
    backgroundColor: '#212121',
  },
  flex: {
    flex: 1,
  },
  contentWidth: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: isTablet ? TABLET_CONTENT_MAX_WIDTH : undefined,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  emptyContent: {
    justifyContent: 'center',
  },
  // 同一話者が連続する場合の間隔(既定の 12 から詰める)
  sameSpeakerSpacing: {
    marginTop: -8,
  },
  // バブル直下の提案カード群。バブルとの間隔・カード同士の間隔とも Figma 指定の 12
  suggestions: {
    marginTop: 12,
    gap: 12,
  },
  suggestionsError: {
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  errorText: {
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    color: '#008ffe',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  disclaimerColor: {
    color: '#737373',
  },
  disclaimerLEDColor: {
    color: '#ccc',
  },
  inputBarContainer: {
    paddingHorizontal: 24,
  },
});

const SUGGESTION_SKELETON_HEIGHT = 72;

const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

const DestinationAgentScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const station = useAtomValue(stationAtom);

  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [suggestionStates, setSuggestionStates] = useState<
    Record<string, SuggestionState>
  >({});

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const entryIdRef = useRef(0);
  // 多重送信の最終防衛線。state 更新の非同期性に依存しないよう ref でも持つ
  const sendingRef = useRef(false);
  // 会話の世代。リセット時にインクリメントし、リセット前に送った
  // リクエストの遅延応答が新しい(空の)会話へ紛れ込むのを防ぐ
  const conversationGenRef = useRef(0);

  const { sendMessages } = useDestinationAgent();
  const {
    handleDestinationSelected,
    handleTrainTypeSelected,
    selectBoundModalVisible,
    trainTypeListModalVisible,
    selectedDestination,
    wantedDestination,
    trainTypeModalLine,
    modalLoading,
    modalError,
    handleCloseSelectBoundModal,
    handleSelectBoundModalCloseAnimationEnd,
    handleBoundSelected,
    handleCloseTrainTypeListModal,
  } = useDestinationSelection();

  const [fetchStationsByIds] = useLazyGraphQLQuery<
    GetStationsByIdsData,
    GetStationsByIdsVariables
  >(GET_STATIONS_BY_IDS);

  const createEntryId = useCallback(() => {
    entryIdRef.current += 1;
    return `agent-entry-${entryIdRef.current}`;
  }, []);

  // 新規メッセージが積まれたら最下部へスクロールする
  useEffect(() => {
    if (!entries.length) {
      return;
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [entries.length]);

  // 提案は軽量情報(stationId 等)しか持たないため、CommonCard が必要とする
  // Line オブジェクトを得るために Station 完全体を一括再取得する。
  const resolveSuggestions = useCallback(
    async (entryId: string, suggestions: AgentSuggestion[]) => {
      const ids = suggestions
        .map((suggestion) => suggestion.stationId)
        .filter((id) => Number.isFinite(id));

      if (!ids.length) {
        return;
      }

      setSuggestionStates((prev) => ({
        ...prev,
        [entryId]: { status: 'loading', stations: [] },
      }));

      const res = await fetchStationsByIds({ variables: { ids } });
      const fetched = res.data?.stations ?? [];

      if (res.error || !fetched.length) {
        setSuggestionStates((prev) => ({
          ...prev,
          [entryId]: { status: 'error', stations: [] },
        }));
        return;
      }

      const byId = new Map(fetched.map((s) => [s.id, s]));
      // 提案順(モデルが提示した優先順)を保つ
      const ordered = ids
        .map((id) => byId.get(id))
        .filter((s): s is Station => s != null);

      setSuggestionStates((prev) => ({
        ...prev,
        [entryId]: { status: 'loaded', stations: ordered },
      }));
    },
    [fetchStationsByIds]
  );

  const handleSend = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || sendingRef.current || rateLimited) {
        return;
      }

      sendingRef.current = true;
      setSending(true);
      setInputText('');
      const conversationGen = conversationGenRef.current;

      const userEntry: ChatEntry = {
        id: createEntryId(),
        role: 'user',
        content: text,
        includeInHistory: true,
      };
      const nextEntries = [...entries, userEntry];
      setEntries(nextEntries);

      // sendMessages は reject しない設計だが、万一の例外でも送信フラグが
      // 立ったままにならないよう finally で解除する
      let res: Awaited<ReturnType<typeof sendMessages>>;
      try {
        res = await sendMessages(
          nextEntries
            .filter((entry) => entry.includeInHistory)
            .map((entry) => ({ role: entry.role, content: entry.content }))
        );
      } finally {
        sendingRef.current = false;
        setSending(false);
      }

      // 応答待ちの間に会話がリセットされていたら結果を破棄する
      if (conversationGenRef.current !== conversationGen) {
        return;
      }

      if (res.ok) {
        const assistantEntry: ChatEntry = {
          id: createEntryId(),
          role: 'assistant',
          content: res.data.reply,
          suggestions: res.data.suggestions,
          includeInHistory: true,
        };
        setEntries((prev) => [...prev, assistantEntry]);
        AccessibilityInfo.announceForAccessibility(res.data.reply);

        if (res.data.suggestions.length) {
          void resolveSuggestions(assistantEntry.id, res.data.suggestions);
        }
        return;
      }

      if (res.error === 'rateLimited') {
        setRateLimited(true);
        setEntries((prev) => [
          ...prev,
          {
            id: createEntryId(),
            role: 'assistant',
            content: translate('destinationAgentRateLimited'),
            includeInHistory: false,
          },
        ]);
        return;
      }

      // ネットワーク / 5xx / タイムアウト: 未応答のユーザ発話を履歴に残さない
      setEntries((prev) => prev.filter((entry) => entry.id !== userEntry.id));
      setInputText(text);
      showToast({
        type: 'error',
        text1: translate('errorTitle'),
        text2: translate('apiErrorText'),
      });
    },
    [entries, rateLimited, createEntryId, sendMessages, resolveSuggestions]
  );

  const handleReset = useCallback(() => {
    // ユーザ起点の onPress なので Alert.alert を直接呼んでよい(CLAUDE.md の StrictMode 規約)
    Alert.alert(
      translate('destinationAgentReset'),
      translate('destinationAgentResetConfirm'),
      [
        { text: translate('cancel'), style: 'cancel' },
        {
          text: 'OK',
          style: 'destructive',
          onPress: () => {
            conversationGenRef.current += 1;
            setEntries([]);
            setSuggestionStates({});
            setInputText('');
            setRateLimited(false);
          },
        },
      ]
    );
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderSuggestions = useCallback(
    (entry: ChatEntry) => {
      if (!entry.suggestions?.length) {
        return null;
      }
      const state = suggestionStates[entry.id];

      if (!state || state.status === 'loading') {
        return (
          <View style={styles.suggestions}>
            {entry.suggestions.map((suggestion) => (
              <SkeletonPlaceholder
                key={`${entry.id}-${suggestion.stationId}`}
                borderRadius={isLEDTheme ? 0 : 8}
                speed={1500}
              >
                <SkeletonPlaceholder.Item
                  width="100%"
                  height={SUGGESTION_SKELETON_HEIGHT}
                />
              </SkeletonPlaceholder>
            ))}
          </View>
        );
      }

      if (state.status === 'error') {
        return (
          <View style={styles.suggestionsError}>
            <Typography style={styles.errorText}>
              {translate('destinationAgentSuggestionsError')}
            </Typography>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={translate('destinationAgentRetry')}
              onPress={() => {
                if (entry.suggestions) {
                  void resolveSuggestions(entry.id, entry.suggestions);
                }
              }}
            >
              <Typography style={styles.retryText}>
                {translate('destinationAgentRetry')}
              </Typography>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.suggestions}>
          {state.stations.map((suggestedStation) => {
            const line = suggestedStation.line;
            if (!line) {
              return null;
            }
            return (
              <CommonCard
                key={`${entry.id}-${suggestedStation.id}`}
                targetStation={suggestedStation}
                line={line}
                title={
                  isJapanese
                    ? suggestedStation.name || undefined
                    : suggestedStation.nameRoman || undefined
                }
                subtitle={
                  isJapanese
                    ? line.nameShort || undefined
                    : line.nameRoman || undefined
                }
                onPress={() => handleDestinationSelected(suggestedStation)}
              />
            );
          })}
        </View>
      );
    },
    [
      suggestionStates,
      isLEDTheme,
      resolveSuggestions,
      handleDestinationSelected,
    ]
  );

  const isEmpty = entries.length === 0;

  return (
    <SafeAreaView
      style={[styles.root, isLEDTheme ? styles.ledBg : styles.bg]}
      // 下端は入力バー側で insets.bottom を確保するため除外する
      edges={SAFE_AREA_EDGES}
    >
      <AgentHeader
        showReset={!isEmpty}
        onBack={handleBack}
        onReset={handleReset}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.contentWidth,
            styles.listContent,
            isEmpty && styles.emptyContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {isEmpty ? (
            <AgentEmptyState onSelectExample={handleSend} />
          ) : (
            entries.map((entry, index) => (
              // 出現アニメーションは SelectLineScreen の路線リストと同じ既存イディオム(ui.md)
              <Animated.View
                key={entry.id}
                layout={LinearTransition.springify()}
                style={
                  entries[index - 1]?.role === entry.role
                    ? styles.sameSpeakerSpacing
                    : undefined
                }
              >
                <AgentMessageBubble role={entry.role} content={entry.content} />
                {renderSuggestions(entry)}
              </Animated.View>
            ))
          )}
          {sending && <AgentTypingIndicator />}
        </ScrollView>

        {isEmpty && (
          <Typography
            style={[
              styles.disclaimer,
              isLEDTheme ? styles.disclaimerLEDColor : styles.disclaimerColor,
            ]}
          >
            {translate('destinationAgentDisclaimer')}
          </Typography>
        )}

        <View
          style={[
            styles.contentWidth,
            styles.inputBarContainer,
            { paddingBottom: insets.bottom + 8 },
          ]}
        >
          <AgentInputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={() => handleSend(inputText)}
            sending={sending}
            rateLimited={rateLimited}
            inputRef={inputRef}
          />
        </View>
      </KeyboardAvoidingView>

      <SelectBoundModal
        visible={selectBoundModalVisible}
        onClose={handleCloseSelectBoundModal}
        onCloseAnimationEnd={handleSelectBoundModalCloseAnimationEnd}
        onBoundSelect={handleBoundSelected}
        loading={modalLoading}
        error={modalError}
        onTrainTypeSelect={handleTrainTypeSelected}
        targetDestination={selectedDestination}
      />
      <TrainTypeListModal
        visible={trainTypeListModalVisible}
        line={trainTypeModalLine}
        destination={wantedDestination}
        boardingStation={station}
        onClose={handleCloseTrainTypeListModal}
        onSelect={handleTrainTypeSelected}
        loading={modalLoading}
      />
    </SafeAreaView>
  );
};

export default React.memo(DestinationAgentScreen);
