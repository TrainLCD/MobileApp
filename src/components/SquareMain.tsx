import { useAtomValue } from 'jotai';
import { memo, type ReactNode, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Line, Station } from '~/@types/graphql';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '~/constants';
import {
  useCurrentStation,
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
import { translate } from '~/translation';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import getIsPass from '~/utils/isPass';
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

const SquareMain = ({
  onTransferPress,
}: {
  onTransferPress?: (station?: Station) => void;
}) => {
  const data = useHeaderCommonData();
  const colors = useAtomValue(resolvedAppColorsAtom);
  const disabled = useAtomValue(untouchableModeEnabledAtom);
  const allStations = useAtomValue(stationsAtom);
  const direction = useAtomValue(selectedDirectionAtom);
  const { isLoopLine } = useLoopLine();
  const currentStation = useCurrentStation();
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
  const lang = data.headerLangState;
  const copy = labels[lang === 'KANA' ? 'JA' : lang];
  const targetName = squareName(target, lang);
  const transferHeading =
    lang === 'EN'
      ? `${copy.transfer}${targetName}`
      : `${targetName}${copy.transfer}`;
  const trainTypeColor = normalizeTrainTypeColor(
    data.trainType?.color ?? undefined
  );
  const lineColor = data.currentLine?.color || '#888888';
  const currentIndex = ordered.findIndex((s) => s.id === currentStation?.id);
  const start = Math.max(0, currentIndex - (data.arrived ? 1 : 0));
  // 環状線の配列末尾でも次の駅を表示する。途中終着は既存の駅データを使う。
  const visible = isLoopLine
    ? [...ordered.slice(start), ...ordered.slice(0, start)]
    : ordered.slice(start);
  // 列の有無も各行と同じ対象で判定し、通過駅だけのETAで「--」を並べない。
  const isEtaTarget = (station: Station, index: number) =>
    index > currentIndex - start && !getIsPass(station);
  const hasEta = visible.some(
    (station, index) =>
      isEtaTarget(station, index) &&
      station.id != null &&
      minutesByStation.get(station.id) != null
  );
  const numbering = data.currentStationNumber;

  return (
    <SquareMainView
      dark={colors.isDark}
      disabled={disabled}
      insets={insets}
      lineName={squareName(data.currentLine, lang)}
      lineColor={lineColor}
      boundText={data.boundText}
      trainTypeName={squareName(data.trainType, lang)}
      trainTypeColor={trainTypeColor}
      trainTypeTextColor={getTrainTypeTextColor(trainTypeColor)}
      stateText={data.stateText}
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
      transferLabel={copy.shortTransfer}
      noTransfersText={copy.empty}
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
          name: squareName(line, lang),
          stationName:
            line.station && line.station.groupId !== target?.groupId
              ? squareName(line.station, lang)
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
      stops={visible.map((station, index) => {
        const focusStation = data.headerState.startsWith('CURRENT')
          ? data.currentStation
          : target;
        const focused = station.id === focusStation?.id;
        const passed =
          !focused &&
          (station.id === currentStation?.id || index < currentIndex - start);
        const pass = getIsPass(station);
        const number = station.stationNumbers?.[getNumberIndex(station)];
        return {
          key: `${station.id}-${index}`,
          name: focused ? data.stationText : squareName(station, lang),
          number: number?.stationNumber ?? '',
          color: station.line?.color || lineColor,
          focused,
          passed,
          label: pass ? copy.pass : '',
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
