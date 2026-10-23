import { Image } from 'expo-image';
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FONTS } from '~/constants';

export type SquareTransfer = {
  key: string;
  name: string;
  stationName?: string;
  mark: ReactNode;
  onPress?: () => void;
};
export type SquareStop = {
  key: string;
  name: string;
  number: string;
  color: string;
  junction?: { key: string; color: string; number: string }[];
  focused: boolean;
  passed: boolean;
  pass?: boolean;
  label: string;
  stateText?: string;
  numberColor?: string;
  showEta?: boolean;
  estimatedMinutes?: number | null;
};
export type SquareMainViewProps = {
  showStops?: boolean;
  scrollPhase?: 'CURRENT' | 'NEXT' | 'ARRIVING';
  onShowStopsChange?: (show: boolean) => void;
  etaUnit?: string;
  etaSoon?: string;
  dark: boolean;
  lineName: string;
  lineColor: string;
  boundText: string;
  trainTypeName: string;
  trainTypeColor: string;
  trainTypeTextColor: string;
  stateText: string;
  stationText: string;
  numbering: ReactNode;
  transferHeading: string;
  transferLabel: string;
  noTransfersText: string;
  settingsLabel: string;
  toggleLabel: string;
  transfers: SquareTransfer[];
  stops: SquareStop[];
  disabled: boolean;
  onSettings?: () => void;
  insets: { top: number; bottom: number; left: number; right: number };
};

// Figmaの正方形用配色。路線・種別・ナンバリングの色はデータをそのまま使う。
const PALETTE = {
  light: {
    background: '#FFFFFF',
    text: '#202124',
    secondary: '#60656D',
    panel: '#F2F3F4',
  },
  dark: {
    background: '#202124',
    text: '#F6F7F8',
    secondary: '#B6BAC0',
    panel: '#2B2D31',
  },
};

export const SquareMainView = memo((props: SquareMainViewProps) => {
  const [localShowStops, setLocalShowStops] = useState(false);
  const showStops = props.showStops ?? localShowStops;
  const dragged = useRef(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const rowYs = useRef(new Map<string, number>());
  const lastScroll = useRef<{
    key: string;
    y: number;
    phase: SquareMainViewProps['scrollPhase'];
  } | null>(null);
  const reduceMotion = useRef(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        changed = true;
        reduceMotion.current = enabled;
      }
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active && !changed) reduceMotion.current = enabled;
      })
      .catch(() => {
        /* 取得できない場合はアニメーションを抑えたままにする。 */
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  const focusedKey = props.stops.find((stop) => stop.focused)?.key;
  const scrollPhase = props.scrollPhase;
  const scrollToFocused = useCallback(
    (key: string | undefined) => {
      const rowY = key == null ? undefined : rowYs.current.get(key);
      if (key == null || rowY == null || !scrollRef.current) return;
      // ポートレートと同じく、1駅前が見える余白を残す。
      const y = Math.max(0, rowY - 54);
      // 同じ駅でも接近・停車時には追従し、言語更新だけでは戻さない。
      if (
        lastScroll.current?.key === key &&
        lastScroll.current.y === y &&
        lastScroll.current.phase === scrollPhase
      )
        return;
      scrollRef.current.scrollTo({ y, animated: !reduceMotion.current });
      lastScroll.current = { key, y, phase: scrollPhase };
    },
    [scrollPhase]
  );
  const attachScroll = useCallback((node: ScrollViewInstance | null) => {
    scrollRef.current = node;
    rowYs.current.clear();
    lastScroll.current = null;
  }, []);
  useEffect(() => {
    if (showStops) scrollToFocused(focusedKey);
  }, [focusedKey, showStops, scrollToFocused]);
  const colors = PALETTE[props.dark ? 'dark' : 'light'];
  const toggle = () => {
    if (!props.disabled && !dragged.current) {
      setLocalShowStops(!showStops);
      props.onShowStopsChange?.(!showStops);
    }
  };
  const textStyle = { color: colors.text };
  const secondaryStyle = { color: colors.secondary };

  return (
    <View
      testID="square-root"
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: props.insets.top,
          paddingBottom: props.insets.bottom,
          paddingLeft: props.insets.left,
          paddingRight: props.insets.right,
        },
      ]}
      onTouchStart={() => {
        dragged.current = false;
      }}
    >
      <View style={styles.header}>
        <View style={[styles.lineBar, { backgroundColor: props.lineColor }]} />
        <Pressable
          testID="square-header-tap"
          style={styles.headerText}
          onPress={toggle}
          disabled={props.disabled}
          accessibilityLabel={props.toggleLabel}
          accessibilityRole="button"
        >
          <View style={styles.lineRow}>
            <Text numberOfLines={1} style={[styles.lineName, textStyle]}>
              {props.lineName}
            </Text>
            {!!props.trainTypeName && (
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: props.trainTypeColor },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.typeText, { color: props.trainTypeTextColor }]}
                >
                  {props.trainTypeName}
                </Text>
              </View>
            )}
          </View>
          <Text numberOfLines={1} style={[styles.bound, secondaryStyle]}>
            {props.boundText}
          </Text>
        </Pressable>
        <Pressable
          testID="square-settings"
          style={styles.settings}
          disabled={props.disabled || !props.onSettings}
          onPress={props.onSettings}
          accessibilityRole="button"
          accessibilityLabel={props.settingsLabel}
        >
          <Image
            source={require('../../assets/icons/square-settings.svg')}
            style={styles.settingsIcon}
            tintColor={colors.text}
          />
        </Pressable>
      </View>
      {showStops ? (
        <>
          <ScrollView
            key={props.stops[0]?.key}
            ref={attachScroll}
            testID="square-stops"
            style={styles.flex}
            onScrollBeginDrag={() => {
              dragged.current = true;
            }}
          >
            <Pressable
              testID="square-stops-tap"
              onPress={toggle}
              disabled={props.disabled}
              style={styles.stopList}
              accessibilityRole="button"
              accessibilityLabel={props.toggleLabel}
            >
              {props.stops.map((stop) => (
                <View
                  key={stop.key}
                  testID={`square-stop-${stop.key}`}
                  onLayout={({ nativeEvent: { layout } }) => {
                    rowYs.current.set(stop.key, layout.y);
                    if (stop.key === focusedKey) scrollToFocused(focusedKey);
                  }}
                  style={[
                    styles.stopRow,
                    stop.focused && styles.focusRow,
                    stop.focused && { backgroundColor: colors.panel },
                  ]}
                >
                  <View
                    testID={`square-stop-bar-${stop.key}`}
                    style={[
                      styles.stopBar,
                      {
                        backgroundColor: stop.junction ? undefined : stop.color,
                        opacity: stop.passed || stop.pass ? 0.4 : 1,
                      },
                    ]}
                  >
                    {stop.junction?.map((side, index) => (
                      <View
                        key={side.key}
                        testID={`square-stop-bar-${stop.key}-${index}`}
                        style={{ flex: 1, backgroundColor: side.color }}
                      />
                    ))}
                  </View>
                  <View style={styles.stopNameColumn}>
                    {stop.focused && !!stop.stateText && (
                      <Text
                        testID={`square-stop-state-${stop.key}`}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                        style={[styles.stopState, secondaryStyle]}
                      >
                        {stop.stateText}
                      </Text>
                    )}
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.35}
                      style={[
                        styles.stopName,
                        {
                          color:
                            stop.passed || stop.pass
                              ? colors.secondary
                              : colors.text,
                        },
                        stop.focused && styles.focusName,
                      ]}
                    >
                      {stop.name}
                    </Text>
                  </View>
                  {stop.junction ? (
                    <View style={styles.stopNumbers}>
                      {stop.junction.map((side, index) =>
                        side.number &&
                        stop.junction?.findIndex(
                          (entry) => entry.number === side.number
                        ) === index ? (
                          <Text
                            key={side.key}
                            testID={`square-number-${stop.key}-${index}`}
                            style={[
                              styles.stopNumber,
                              {
                                color: side.color,
                                opacity: stop.passed || stop.pass ? 0.4 : 1,
                              },
                            ]}
                          >
                            {side.number}
                          </Text>
                        ) : null
                      )}
                    </View>
                  ) : (
                    !!stop.number && (
                      <Text
                        testID={`square-number-${stop.key}`}
                        style={[
                          styles.stopNumber,
                          {
                            color: stop.numberColor ?? colors.secondary,
                            opacity: stop.passed || stop.pass ? 0.4 : 1,
                          },
                        ]}
                      >
                        {stop.number}
                      </Text>
                    )
                  )}
                  {stop.showEta && (
                    <View
                      testID={`square-eta-${stop.key}`}
                      style={styles.etaColumn}
                    >
                      <Text
                        style={[
                          styles.etaValue,
                          stop.focused && styles.etaFocused,
                          stop.estimatedMinutes != null &&
                            Math.round(stop.estimatedMinutes) < 1 &&
                            styles.etaSoon,
                          { color: stop.numberColor ?? colors.secondary },
                        ]}
                      >
                        {stop.estimatedMinutes == null
                          ? '--'
                          : Math.round(stop.estimatedMinutes) < 1
                            ? props.etaSoon
                            : Math.round(stop.estimatedMinutes)}
                      </Text>
                      {stop.estimatedMinutes != null &&
                        Math.round(stop.estimatedMinutes) >= 1 && (
                          <Text
                            style={[
                              styles.etaUnit,
                              { color: stop.numberColor ?? colors.secondary },
                            ]}
                          >
                            {props.etaUnit}
                          </Text>
                        )}
                    </View>
                  )}
                  {!!stop.label && (
                    <Text
                      numberOfLines={2}
                      style={[styles.stopLabel, secondaryStyle]}
                    >
                      {stop.label}
                    </Text>
                  )}
                </View>
              ))}
            </Pressable>
          </ScrollView>
          <Pressable
            testID="square-transfer-marks"
            onPress={toggle}
            disabled={props.disabled}
            accessibilityRole="button"
            accessibilityLabel={props.transferHeading}
            style={[styles.marksFooter, { backgroundColor: colors.panel }]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              onScrollBeginDrag={() => {
                dragged.current = true;
              }}
              contentContainerStyle={styles.marks}
            >
              {!!props.transfers.length && (
                <Text style={[styles.caption, secondaryStyle]}>
                  {props.transferLabel}
                </Text>
              )}
              {props.transfers.map((line) => (
                <View key={line.key} accessibilityLabel={line.name}>
                  {line.mark}
                </View>
              ))}
              {!props.transfers.length && (
                <Text style={[styles.caption, secondaryStyle]}>
                  {props.noTransfersText}
                </Text>
              )}
            </ScrollView>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            testID="square-station-tap"
            onPress={toggle}
            disabled={props.disabled}
            style={styles.station}
            accessibilityRole="button"
            accessibilityLabel={props.toggleLabel}
          >
            {props.numbering}
            <View style={styles.stationText}>
              <Text
                testID="square-state"
                numberOfLines={2}
                adjustsFontSizeToFit
                style={[styles.state, secondaryStyle]}
              >
                {props.stateText.replaceAll('\n', ' ')}
              </Text>
              <Text
                testID="square-station-name"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.3}
                style={[styles.stationName, textStyle]}
              >
                {props.stationText}
              </Text>
            </View>
          </Pressable>
          <View
            testID="square-line-rule"
            style={[styles.rule, { backgroundColor: props.lineColor }]}
          />
          <View
            testID="square-transfers"
            style={[styles.transfers, { backgroundColor: colors.panel }]}
          >
            <Pressable
              testID="square-transfer-heading"
              onPress={toggle}
              disabled={props.disabled}
              accessibilityRole="button"
              accessibilityLabel={props.toggleLabel}
            >
              <Text numberOfLines={1} style={[styles.caption, secondaryStyle]}>
                {props.transferHeading}
              </Text>
            </Pressable>
            <ScrollView
              onScrollBeginDrag={() => {
                dragged.current = true;
              }}
              contentContainerStyle={styles.transferList}
            >
              {props.transfers.map((line) => (
                <Pressable
                  testID={`square-transfer-${line.key}`}
                  key={line.key}
                  style={styles.transferRow}
                  disabled={props.disabled || !line.onPress}
                  accessibilityRole="button"
                  onPress={() => {
                    if (!dragged.current) line.onPress?.();
                  }}
                >
                  {line.mark}
                  <View style={styles.flex}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.transferName, textStyle]}
                    >
                      {line.name}
                    </Text>
                    {!!line.stationName && (
                      <Text style={[styles.caption, secondaryStyle]}>
                        {line.stationName}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
              {!props.transfers.length && (
                <Pressable
                  testID="square-empty-transfers"
                  style={styles.empty}
                  onPress={toggle}
                  disabled={props.disabled}
                >
                  <Text style={[styles.caption, secondaryStyle]}>
                    {props.noTransfersText}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  lineBar: { width: 4, height: 32, borderRadius: 2 },
  headerText: { flex: 1, minWidth: 0 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineName: {
    fontFamily: FONTS.RobotoBold,
    fontWeight: 'bold',
    fontSize: 15,
    flexShrink: 1,
  },
  bound: { fontFamily: FONTS.RobotoRegular, fontSize: 12, marginTop: 2 },
  typeBadge: {
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    maxWidth: '45%',
  },
  typeText: { fontFamily: FONTS.RobotoBold, fontWeight: 'bold', fontSize: 10 },
  settings: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: { width: 22, height: 22 },
  station: {
    minHeight: 96,
    height: 112,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  stationText: { flex: 1, minWidth: 0 },
  state: {
    fontFamily: FONTS.RobotoBold,
    fontWeight: 'bold',
    fontSize: 18,
    lineHeight: 24,
  },
  stationName: {
    fontFamily: FONTS.RobotoBold,
    fontWeight: 'bold',
    fontSize: 37,
    lineHeight: 49,
    textAlign: 'left',
  },
  rule: { height: 4 },
  transfers: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  caption: {
    fontFamily: FONTS.RobotoBold,
    fontWeight: 'bold',
    fontSize: 12,
    lineHeight: 16,
  },
  transferList: { paddingTop: 8, paddingBottom: 12, gap: 4, flexGrow: 1 },
  transferRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transferName: {
    fontFamily: FONTS.RobotoBold,
    fontWeight: 'bold',
    fontSize: 16,
  },
  empty: { flex: 1, minHeight: 44 },
  stopList: { paddingHorizontal: 16, flexGrow: 1 },
  stopRow: {
    minHeight: 54,
    padding: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  focusRow: { minHeight: 90 },
  stopBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stopNumbers: { gap: 4, alignItems: 'center' },
  stopNumber: { fontFamily: FONTS.RobotoBold, fontSize: 10 },
  etaColumn: {
    minWidth: 46,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 2,
  },
  etaValue: { fontFamily: FONTS.RobotoBold, fontSize: 13 },
  etaFocused: { fontSize: 15 },
  etaSoon: { fontSize: 10 },
  etaUnit: { fontFamily: FONTS.RobotoBold, fontSize: 9 },
  stopNameColumn: { flex: 1, gap: 2, justifyContent: 'center' },
  stopState: { fontFamily: FONTS.RobotoBold, fontSize: 18, lineHeight: 23 },
  stopName: {
    fontFamily: FONTS.RobotoBold,
    fontWeight: 'bold',
    fontSize: 23,
  },
  focusName: { fontSize: 34 },
  stopLabel: { fontFamily: FONTS.RobotoRegular, fontSize: 11, maxWidth: 62 },
  marksFooter: { height: 44, paddingHorizontal: 16 },
  marks: { alignItems: 'center', gap: 12, flexGrow: 1 },
});
