import { useAtomValue } from 'jotai';
import { memo, type ReactNode, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Line, Station } from '~/@types/graphql';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '~/constants';
import {
  useBoundText,
  useCurrentStation,
  useDisplayCurrentStation,
  useEstimateArrivalTimesAllStops,
  useEstimatedMinutesByStationId,
  useGetLineMark,
  useHeaderCommonData,
  useLoopLine,
  useStationNumberIndexFunc,
  useTransferLines,
  useTransferTargetStation,
} from '~/hooks';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import { useRunningSettings } from '~/providers/RunningSettingsContext';
import { resolvedAppColorsAtom } from '~/store/atoms/colorScheme';
import { selectedDirectionAtom, stationsAtom } from '~/store/atoms/station';
import { untouchableModeEnabledAtom } from '~/store/atoms/tuning';
import { isJapanese, translate } from '~/translation';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import getIsPass from '~/utils/isPass';
import { resolveRunningStateText } from '~/utils/resolveRunningStateText';
import { accentColorFor } from '~/utils/stopListAccentColor';
import {
  getTrainTypeTextColor,
  normalizeTrainTypeColor,
} from '~/utils/trainTypeTextColor';
import NumberingIcon from './NumberingIcon';
import { SquareMainView } from './SquareMainView';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';

// APIが指定した記号を、形状・3文字コードを維持したまま枠へ収める。
const FitMark = ({ children, size }: { children: ReactNode; size: number }) => {
  const [scale, setScale] = useState(1);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        onLayout={({ nativeEvent: { layout } }) => {
          if (layout.width > 0 && layout.height > 0)
            setScale(Math.min(size / layout.width, size / layout.height, 1));
        }}
        style={{ alignItems: 'center', flexShrink: 0, transform: [{ scale }] }}
      >
        {children}
      </View>
    </View>
  );
};

type Named = {
  name?: string | null;
  nameShort?: string | null;
  nameRoman?: string | null;
  nameChinese?: string | null;
  nameKorean?: string | null;
};
export const squareName = (
  value: Named | null | undefined,
  lang: HeaderLangState
): string => {
  if (!value) return '';
  const ja = value.nameShort ?? value.name ?? '';
  const name =
    lang === 'EN'
      ? value.nameRoman
      : lang === 'ZH'
        ? value.nameChinese
        : lang === 'KO'
          ? value.nameKorean
          : ja;
  return (name || ja).replace(parenthesisRegexp, '');
};
const labels = {
  JA: {
    transfer: 'での乗換',
    shortTransfer: 'のりかえ',
    empty: '乗換路線はありません',
    pass: '通過',
    toggle: '駅一覧と乗換案内を切り替える',
  },
  EN: {
    transfer: 'Transfers at ',
    shortTransfer: 'Transfers',
    empty: 'No transfers',
    pass: 'Pass',
    toggle: 'Switch between stops and transfers',
  },
  ZH: {
    transfer: '换乘',
    shortTransfer: '换乘',
    empty: '无换乘线路',
    pass: '通过',
    toggle: '切换车站与换乘信息',
  },
  KO: {
    transfer: ' 환승',
    shortTransfer: '환승',
    empty: '환승 노선 없음',
    pass: '통과',
    toggle: '역 목록과 환승 안내 전환',
  },
};

// 直通の接続駅は路線ごとにIDが異なるため、駅グループで同じ駅を照合する。
// グループが欠ける場合だけ駅IDを使い、未取得同士を一致させない。
const isSameStation = (station: Station, target: Station | undefined) =>
  station.groupId != null && target?.groupId != null
    ? station.groupId === target.groupId
    : station.id != null && target?.id != null && station.id === target.id;

const SquareMain = ({
  onTransferPress,
}: {
  onTransferPress?: (station?: Station) => void;
}) => {
  const [showStops, setShowStops] = useState(false);
  const data = useHeaderCommonData();
  const boundTextMap = useBoundText();
  const colors = useAtomValue(resolvedAppColorsAtom);
  const disabled = useAtomValue(untouchableModeEnabledAtom);
  const allStations = useAtomValue(stationsAtom);
  const direction = useAtomValue(selectedDirectionAtom);
  const { isLoopLine } = useLoopLine();
  const currentStation = useCurrentStation();
  const displayCurrentStation = useDisplayCurrentStation();
  const target = useTransferTargetStation();
  const transfers = useTransferLines();
  const getMark = useGetLineMark();
  const getNumberIndex = useStationNumberIndexFunc();
  const openSettings = useRunningSettings();
  const insets = useSafeAreaInsets();
  const { route } = useEstimateArrivalTimesAllStops();
  const minutesByStation = useEstimatedMinutesByStationId(route);
  const ordered = useMemo(() => {
    const list = dropEitherJunctionStation(
      allStations.filter((s): s is Station => !!s),
      direction
    );
    return (isLoopLine ? direction === 'INBOUND' : direction === 'OUTBOUND')
      ? [...list].reverse()
      : list;
  }, [allStations, direction, isLoopLine]);

  if (!data)
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  const lang = showStops ? (isJapanese ? 'JA' : 'EN') : data.headerLangState;
  const copy = labels[lang === 'KANA' ? 'JA' : lang];
  const transferLang = isJapanese ? 'JA' : 'EN';
  const transferCopy = labels[transferLang];
  const targetName = squareName(target, transferLang);
  const transferHeading =
    transferLang === 'EN'
      ? `${transferCopy.transfer}${targetName}`
      : `${targetName}${transferCopy.transfer}`;
  const trainTypeColor = normalizeTrainTypeColor(
    data.trainType?.color ?? undefined
  );
  const lineColor = data.currentLine?.color || '#888888';
  const currentIndex = ordered.findIndex((s) =>
    isSameStation(s, currentStation)
  );
  // ポートレートと同じく全駅を進行方向順に保持し、現在位置へはスクロールで追従する。
  const displayCurrentIndex = ordered.findIndex((station) =>
    isSameStation(station, displayCurrentStation)
  );
  const etaStartIndex =
    displayCurrentIndex >= 0 ? displayCurrentIndex : currentIndex;
  const progressStation =
    displayCurrentIndex >= 0 ? displayCurrentStation : currentStation;
  // 列の有無も各行と同じ対象で判定し、通過駅だけのETAで「--」を並べない。
  const isEtaTarget = (station: Station, index: number) =>
    index > etaStartIndex && !getIsPass(station);
  const hasEta = ordered.some(
    (station, index) =>
      isEtaTarget(station, index) &&
      station.id != null &&
      minutesByStation.get(station.id) != null
  );
  // 乗換対象は次の停車駅だが、一覧では通過駅も順に追う。
  // 通過駅が現在駅の間は、停車駅向けのヘッダー状態にかかわらずその駅を示す。
  const passing = !!currentStation && getIsPass(currentStation);
  const nextIndex = currentIndex + 1;
  const immediateNext =
    currentIndex < 0
      ? undefined
      : (ordered[nextIndex] ?? (isLoopLine ? ordered[0] : undefined));
  const upcomingPass = immediateNext && getIsPass(immediateNext);
  const focusStation = passing
    ? currentStation
    : data.headerState.startsWith('CURRENT')
      ? data.currentStation
      : upcomingPass
        ? immediateNext
        : target;
  // B案の状態も駅名と同じ環境言語に固定し、C案の言語タイマーには追従しない。
  const stopStateKeys = isJapanese
    ? {
        CURRENT: 'nowStoppingAt',
        NEXT: data.isLast ? 'nextLast' : 'next',
        ARRIVING: data.isLast ? 'soonLast' : 'soon',
      }
    : {
        CURRENT: 'nowStoppingAtEn',
        NEXT: data.isLast ? 'nextEnLast' : 'nextEn',
        ARRIVING: data.isLast ? 'soonEnLast' : 'soonEn',
      };
  const stoppingState = data.headerState.split(
    '_'
  )[0] as keyof typeof stopStateKeys;
  // 通過駅の案内は、現在駅になる前後もフォーカス対象に合わせて統一する。
  const stopStateText = getIsPass(focusStation)
    ? isJapanese
      ? '通過中'
      : 'Passing'
    : stopStateKeys[stoppingState]
      ? translate(stopStateKeys[stoppingState], {
          locale: isJapanese ? 'ja' : 'en',
        }).replaceAll('\n', ' ')
      : '';
  const numbering = data.currentStationNumber;

  return (
    <SquareMainView
      showStops={showStops}
      onShowStopsChange={setShowStops}
      dark={colors.isDark}
      disabled={disabled}
      insets={insets}
      lineName={squareName(data.currentLine, transferLang)}
      lineColor={lineColor}
      boundText={boundTextMap[transferLang]}
      trainTypeName={squareName(data.trainType, transferLang)}
      trainTypeColor={trainTypeColor}
      trainTypeTextColor={getTrainTypeTextColor(trainTypeColor)}
      stateText={resolveRunningStateText(data.stateText, data.headerState)}
      stationText={data.stationText}
      numbering={
        numbering ? (
          <FitMark size={52}>
            <NumberingIcon
              shape={numbering.lineSymbolShape || ''}
              lineColor={data.numberingColor}
              stationNumber={numbering.stationNumber || ''}
              threeLetterCode={data.threeLetterCode}
            />
          </FitMark>
        ) : null
      }
      transferHeading={transferHeading}
      transferLabel={transferCopy.shortTransfer}
      noTransfersText={transferCopy.empty}
      settingsLabel={translate('settings')}
      toggleLabel={copy.toggle}
      etaUnit={translate('portraitEtaUnit', {
        locale: lang === 'JA' || lang === 'KANA' ? 'ja' : 'en',
      })}
      etaSoon={translate('portraitEtaSoon', {
        locale: lang === 'JA' || lang === 'KANA' ? 'ja' : 'en',
      })}
      onSettings={openSettings ?? undefined}
      transfers={transfers.map((line: Line, index) => {
        const mark = getMark({
          line,
          stationNumbers: line.station?.stationNumbers ?? [],
        });
        return {
          key: `${line.id}-${index}`,
          name: squareName(line, transferLang),
          stationName:
            line.station && line.station.groupId !== target?.groupId
              ? squareName(line.station, transferLang)
              : undefined,
          mark: (
            <FitMark size={30}>
              {mark ? (
                <TransferLineMark
                  line={line}
                  mark={mark}
                  size={NUMBERING_ICON_SIZE.MEDIUM}
                />
              ) : (
                <TransferLineDot line={line} />
              )}
            </FitMark>
          ),
          onPress: line.station
            ? () =>
                onTransferPress?.({
                  ...line.station,
                  line,
                  lines: transfers,
                } as Station)
            : undefined,
        };
      })}
      stops={ordered.map((station, index) => {
        const focused = isSameStation(station, focusStation);
        const passed =
          !focused &&
          (isSameStation(station, progressStation) || index < etaStartIndex);
        const pass = getIsPass(station);
        const number = station.stationNumbers?.[getNumberIndex(station)];
        return {
          key: `${station.id}-${index}`,
          name: squareName(station, isJapanese ? 'JA' : 'EN'),
          number: number?.stationNumber ?? '',
          color: station.line?.color || lineColor,
          focused,
          passed,
          label: pass ? copy.pass : '',
          stateText: focused ? stopStateText : undefined,
          numberColor: focused
            ? accentColorFor(station.line?.color || lineColor, colors.isDark)
            : pass
              ? colors.isDark
                ? colors.strongBorder
                : '#C2C2C2'
              : colors.secondaryText,
          showEta: hasEta && isEtaTarget(station, index),
          estimatedMinutes:
            station.id != null ? minutesByStation.get(station.id) : null,
        };
      })}
    />
  );
};
export default memo(SquareMain);
