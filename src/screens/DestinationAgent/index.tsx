import { useNavigation } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
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
import { showDialog } from '~/utils/dialogPresentation';
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
  /**
   * ストリーミング受信中の仮置きエントリか。delta を追記している間 true で、
   * done の確定値に置き換えた時点で false になる。
   */
  streaming?: boolean;
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
  // tool イベント受信中(駅検索の tool use ループ中)であることを示すフラグ。
  // 最初の delta が届くか応答が確定した時点で降ろす
  const [searching, setSearching] = useState(false);
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

  // 追従スクロールの発火キー。新規メッセージの追加だけでなく、
  // ストリーミング中に末尾エントリの本文が伸びたときも変化させる
  const scrollAnchor = `${entries.length}:${
    entries[entries.length - 1]?.content.length ?? 0
  }`;

  useEffect(() => {
    if (scrollAnchor.startsWith('0:')) {
      return;
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [scrollAnchor]);

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
      setSearching(false);
      setInputText('');
      const conversationGen = conversationGenRef.current;
      // 検索中文言の読み上げは 1 送信につき 1 回だけ(tool イベントは複数回届きうる)
      let searchingAnnounced = false;

      const userEntry: ChatEntry = {
        id: createEntryId(),
        role: 'user',
        content: text,
        includeInHistory: true,
      };
      // 送信開始時点で空の assistant エントリを仮置きし、delta で本文を伸ばす。
      // サーバへ送る履歴には含めないため nextEntries とは分けて持つ。
      const streamingEntry: ChatEntry = {
        id: createEntryId(),
        role: 'assistant',
        content: '',
        includeInHistory: true,
        streaming: true,
      };
      const nextEntries = [...entries, userEntry];
      setEntries([...nextEntries, streamingEntry]);

      // 会話リセット後に届いた delta / done は捨てる
      const isStale = () => conversationGenRef.current !== conversationGen;

      // sendMessages は reject しない設計だが、万一の例外でも送信フラグが
      // 立ったままにならないよう finally で解除する
      let res: Awaited<ReturnType<typeof sendMessages>>;
      try {
        res = await sendMessages(
          nextEntries
            .filter((entry) => entry.includeInHistory)
            .map((entry) => ({ role: entry.role, content: entry.content })),
          {
            onDelta: (delta) => {
              if (isStale()) {
                return;
              }
              // 本文が流れ始めたら検索中表示を畳む(以降はバブルが伸びていく)
              setSearching(false);
              setEntries((prev) =>
                prev.map((entry) =>
                  entry.id === streamingEntry.id
                    ? { ...entry, content: entry.content + delta }
                    : entry
                )
              );
            },
            // 駅検索の tool use ループは数秒かかるため、その間は
            // タイピングインジケータに検索中である旨を添える
            onToolStart: () => {
              if (isStale()) {
                return;
              }
              setSearching(true);
              if (!searchingAnnounced) {
                searchingAnnounced = true;
                AccessibilityInfo.announceForAccessibility(
                  translate('destinationAgentSearching')
                );
              }
            },
          }
        );
      } finally {
        sendingRef.current = false;
        setSending(false);
        setSearching(false);
      }

      // 応答待ちの間に会話がリセットされていたら結果を破棄する
      if (isStale()) {
        return;
      }

      if (res.ok) {
        // done が正。蓄積した delta を確定値で置き換える
        const { reply, suggestions } = res.data;
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === streamingEntry.id
              ? {
                  ...entry,
                  content: reply,
                  suggestions,
                  streaming: false,
                }
              : entry
          )
        );
        AccessibilityInfo.announceForAccessibility(reply);

        if (suggestions.length) {
          void resolveSuggestions(streamingEntry.id, suggestions);
        }
        return;
      }

      if (res.error === 'rateLimited') {
        setRateLimited(true);
        setEntries((prev) => [
          ...prev.filter((entry) => entry.id !== streamingEntry.id),
          {
            id: createEntryId(),
            role: 'assistant',
            content: translate('destinationAgentRateLimited'),
            includeInHistory: false,
          },
        ]);
        return;
      }

      // ネットワーク / 5xx / タイムアウト / ストリーム中断: 仮置きエントリと
      // 未応答のユーザ発話を履歴に残さない(受信途中の delta も破棄される)
      setEntries((prev) =>
        prev.filter(
          (entry) => entry.id !== userEntry.id && entry.id !== streamingEntry.id
        )
      );
      // 送信待ちの間にユーザが入力し直していた場合はその内容を優先する
      setInputText((prev) => (prev.length ? prev : text));
      showToast({
        type: 'error',
        text1: translate('errorTitle'),
        text2: translate('apiErrorText'),
      });
    },
    [entries, rateLimited, createEntryId, sendMessages, resolveSuggestions]
  );

  const handleReset = useCallback(() => {
    showDialog(
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
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.suggestions}
          >
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
          </Animated.View>
        );
      }

      if (state.status === 'error') {
        return (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.suggestionsError}
          >
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
          </Animated.View>
        );
      }

      return (
        <View style={styles.suggestions}>
          {state.stations.map((suggestedStation, index) => {
            const line = suggestedStation.line;
            if (!line) {
              return null;
            }
            return (
              // 提案順(モデルの優先順)が視線誘導として伝わるよう上から順に時差フェード
              <Animated.View
                key={`${entry.id}-${suggestedStation.id}`}
                entering={FadeInDown.delay(index * 60).duration(250)}
              >
                <CommonCard
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
              </Animated.View>
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
  // 最初の delta が届くまではタイピングインジケータで待たせる
  const streamingContent =
    entries.find((entry) => entry.streaming)?.content ?? '';

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
            // 出現側の段階フェードは AgentEmptyState 内で行い、初回送信時はふっと消す
            <Animated.View exiting={FadeOut.duration(150)}>
              <AgentEmptyState onSelectExample={handleSend} />
            </Animated.View>
          ) : (
            entries.map((entry, index) =>
              // 本文が空の仮置きエントリはバブルを出さない(タイピングインジケータが代わり)
              entry.streaming && !entry.content ? null : (
                // 並び替えは SelectLineScreen の路線リストと同じ既存イディオム(ui.md)。
                // 出現は下からのフェード、エラー時の巻き戻し・リセットはフェードアウトで消す
                <Animated.View
                  key={entry.id}
                  entering={FadeInDown.duration(250)}
                  exiting={FadeOut.duration(150)}
                  layout={LinearTransition.springify()}
                  style={
                    entries[index - 1]?.role === entry.role
                      ? styles.sameSpeakerSpacing
                      : undefined
                  }
                >
                  <AgentMessageBubble
                    role={entry.role}
                    content={entry.content}
                  />
                  {renderSuggestions(entry)}
                </Animated.View>
              )
            )
          )}
          {sending && !streamingContent && (
            // 応答待ちの合図なので唐突に出さず、バブルと同じ下からのフェードで馴染ませる
            <Animated.View
              entering={FadeInDown.duration(200)}
              exiting={FadeOut.duration(150)}
            >
              <AgentTypingIndicator
                label={
                  searching ? translate('destinationAgentSearching') : undefined
                }
              />
            </Animated.View>
          )}
        </ScrollView>

        {isEmpty && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
          >
            <Typography
              style={[
                styles.disclaimer,
                isLEDTheme ? styles.disclaimerLEDColor : styles.disclaimerColor,
              ]}
            >
              {translate('destinationAgentDisclaimer')}
            </Typography>
          </Animated.View>
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
