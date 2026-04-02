import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CustomModal } from '~/components/CustomModal';
import {
  useRouteEstimation,
  useRouteEstimationControl,
} from '~/hooks/useRouteEstimation';
import { isJapanese } from '~/translation';
import type { RouteCandidate } from '~/utils/routeEstimation/types';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === 'ready'
      ? '#34C759'
      : status === 'estimating'
        ? '#FF9500'
        : status === 'collecting'
          ? '#007AFF'
          : '#8E8E93';

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
    </View>
  );
};

const CandidateRow: React.FC<{
  candidate: RouteCandidate;
  onSelect: (candidate: RouteCandidate) => void;
}> = ({ candidate, onSelect }) => {
  const lineName = isJapanese
    ? (candidate.line.nameShort ?? candidate.line.nameFull ?? '不明')
    : (candidate.line.nameRoman ?? candidate.line.nameFull ?? 'Unknown');

  const boundName = isJapanese
    ? (candidate.boundStation.name ?? '不明')
    : (candidate.boundStation.nameRoman ?? 'Unknown');

  const handlePress = useCallback(
    () => onSelect(candidate),
    [candidate, onSelect]
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.candidateRow,
        pressed && styles.candidateRowPressed,
      ]}
      onPress={handlePress}
    >
      <View style={styles.candidateHeader}>
        <View
          style={[
            styles.lineColorDot,
            { backgroundColor: candidate.line.color ?? '#999' },
          ]}
        />
        <Text style={styles.candidateLineName} numberOfLines={1}>
          {lineName}
        </Text>
        <Text style={styles.candidateDirection}>
          {candidate.direction === 'INBOUND' ? '▶' : '◀'}
        </Text>
      </View>
      <Text style={styles.candidateBound}>→ {boundName}</Text>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>
          Score: {candidate.score.toFixed(3)}
        </Text>
        <Text style={styles.scoreLabel}>
          Conf: {candidate.confidence.toFixed(3)}
        </Text>
      </View>
      <Text style={styles.scoreDetail}>
        fit={candidate.scoreBreakdown.routeFitScore.toFixed(2)} order=
        {candidate.scoreBreakdown.orderScore.toFixed(2)} speed=
        {candidate.scoreBreakdown.speedScore.toFixed(2)}
      </Text>
    </Pressable>
  );
};

const RouteEstimationDebugModal: React.FC<Props> = ({ visible, onClose }) => {
  const { status, candidates, selectCandidate, reset, bufferInfo } =
    useRouteEstimation();
  const { isEstimating, startEstimation, stopEstimation } =
    useRouteEstimationControl();

  const handleSelect = useCallback(
    (candidate: RouteCandidate) => {
      selectCandidate(candidate);
      onClose();
    },
    [selectCandidate, onClose]
  );

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      testID="route-estimation-debug-modal"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Route Estimation Debug</Text>
          <StatusBadge status={status} />
        </View>

        {/* バッファ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buffer Info</Text>
          <Text style={styles.infoText}>
            Points: {bufferInfo.pointCount} | Dist:{' '}
            {bufferInfo.totalDistance.toFixed(0)}m
          </Text>
          <Text style={styles.infoText}>
            Avg Speed: {bufferInfo.avgSpeed.toFixed(1)} m/s | Moving:{' '}
            {bufferInfo.isMoving ? 'Yes' : 'No'}
          </Text>
        </View>

        {/* 操作ボタン */}
        <View style={styles.buttonRow}>
          {isEstimating ? (
            <Pressable
              style={[styles.button, styles.stopButton]}
              onPress={stopEstimation}
            >
              <Text style={styles.buttonText}>停止</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.button, styles.startButton]}
              onPress={startEstimation}
            >
              <Text style={styles.buttonText}>推定開始</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.button, styles.resetButton]}
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>リセット</Text>
          </Pressable>
        </View>

        {/* 候補リスト */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Candidates ({candidates.length})
          </Text>
        </View>
        <ScrollView style={styles.candidateList}>
          {candidates.length === 0 ? (
            <Text style={styles.emptyText}>
              {isEstimating ? '推定中...' : '推定を開始してください'}
            </Text>
          ) : (
            candidates.map((c, i) => (
              <CandidateRow
                // biome-ignore lint/suspicious/noArrayIndexKey: 候補リストは再評価ごとに全置換されるためindex keyで問題なし
                key={i}
                candidate={c}
                onSelect={handleSelect}
              />
            ))
          )}
        </ScrollView>
      </View>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#3A3A3C',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  resetButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  candidateList: {
    maxHeight: 250,
  },
  candidateRow: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  candidateRowPressed: {
    backgroundColor: '#E5E5EA',
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  candidateLineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  candidateDirection: {
    fontSize: 12,
    color: '#8E8E93',
  },
  candidateBound: {
    fontSize: 13,
    color: '#3A3A3C',
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  scoreDetail: {
    fontSize: 10,
    color: '#AEAEB2',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default React.memo(RouteEstimationDebugModal);
