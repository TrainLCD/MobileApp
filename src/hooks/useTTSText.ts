import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '../constants';
import { APP_THEME, type AppTheme } from '../models/Theme';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { themeAtom } from '../store/atoms/theme';
import getIsPass from '../utils/isPass';
import { wrapPhoneme as ph } from '../utils/phoneme';
import {
  dedupeLinesByTtsName,
  formatFirstConnectedLineEnPhrase,
  formatJrWestStopsListEn,
  formatJrWestStopsListJa,
  formatLinesListEn,
  formatLinesListJa,
  formatStationsListJa,
  replaceJapaneseText,
  stripStationParensForTTS,
} from './tts/formatters';
import type { TemplateContext } from './tts/templateEngine';
import { EN_TEMPLATES, JA_TEMPLATES } from './tts/templates';
import { useAfterNextStation } from './useAfterNextStation';
import { useBounds } from './useBounds';
import { useConnectedLines } from './useConnectedLines';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useIsTerminus } from './useIsTerminus';
import { useLoopLine } from './useLoopLine';
import { useLoopLineBound } from './useLoopLineBound';
import { useSlicedStations } from './useSlicedStations';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';
import { useStoppingState } from './useStoppingState';
import { useTransferLines } from './useTransferLines';

export interface TTSTextResult {
  text: [string, string] | [];
  nextText: [string, string] | [];
}

const resolveTemplateTheme = (theme: AppTheme): AppTheme => {
  if (theme === APP_THEME.LED || theme === APP_THEME.ODAKYU)
    return APP_THEME.TOKYO_METRO;
  if (
    theme === APP_THEME.JO ||
    theme === APP_THEME.JL ||
    theme === APP_THEME.E231
  )
    return APP_THEME.YAMANOTE;
  return theme;
};

export const useTTSText = (
  firstSpeech = true,
  enabled = false,
  isBus = false
): TTSTextResult => {
  const theme = useAtomValue(themeAtom);

  const selectedBoundOrigin = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const stations = useAtomValue(stationsAtom);
  const station = useCurrentStation();
  const currentLineOrigin = useCurrentLine();

  const connectedLinesOrigin = useConnectedLines();
  const transferLinesOrigin = useTransferLines();
  // バスは直通・乗換・列車種別・駅ナンバリングを案内しない。
  // フックのルートで配列を空にしておけば、以降の dedupe / format / 番号計算は
  // すべて空入力に対する no-op となり、テンプレ側の hasTransferLines などの
  // 真偽フラグも自動で false になる。
  const connectedLines = isBus ? [] : connectedLinesOrigin;
  const transferLines = isBus ? [] : transferLinesOrigin;
  // 博多駅の鹿児島本線のように、データ上は方面別に同じ路線名が
  // 別レコードで登録されているケースがある。表示用には両方残したいが、
  // TTS では同じ路線名を続けて読み上げないように重複を除外する。
  const ttsTransferLines = useMemo(
    () => dedupeLinesByTtsName(transferLines),
    [transferLines]
  );
  const currentTrainTypeFromHook = useCurrentTrainType();
  const currentTrainTypeOrigin = isBus ? null : currentTrainTypeFromHook;
  const loopLineBoundJa = useLoopLineBound(false, 'JA');
  const loopLineBoundEn = useLoopLineBound(false, 'EN');
  const { directionalStops } = useBounds(stations);
  // まもなく表示時は現在地基準で実際に接近している駅を読み上げる
  const nextStationOrigin = useDisplayNextStation();
  const isNextStopTerminus = useIsTerminus(nextStationOrigin);
  const { isLoopLine, isPartiallyLoopLine, isYamanoteLine } = useLoopLine();
  const slicedStationsOrigin = useSlicedStations();
  const stoppingState = useStoppingState();
  const getStationNumberIndex = useStationNumberIndexFunc();

  const nextStationNumber = useMemo(() => {
    if (isBus) return;
    if (!nextStationOrigin) return;
    if (!nextStationOrigin.stationNumbers) return;

    const stationNumberIndex = getStationNumberIndex(nextStationOrigin);

    // Validate stationNumberIndex is a valid integer within array bounds
    if (
      !Number.isInteger(stationNumberIndex) ||
      stationNumberIndex < 0 ||
      stationNumberIndex >= nextStationOrigin.stationNumbers.length
    ) {
      return;
    }

    return nextStationOrigin.stationNumbers[stationNumberIndex];
  }, [getStationNumberIndex, nextStationOrigin, isBus]);

  const currentLine = currentLineOrigin ?? null;

  const selectedBound = useMemo(
    () => selectedBoundOrigin ?? null,
    [selectedBoundOrigin]
  );

  const currentTrainType = useMemo(
    () =>
      currentTrainTypeOrigin && {
        ...currentTrainTypeOrigin,
        nameRoman: currentTrainTypeOrigin.nameRoman?.replace(
          parenthesisRegexp,
          ''
        ),
        nameTtsSegments: currentTrainTypeOrigin.nameTtsSegments?.map((seg) => ({
          ...seg,
          surface: seg.surface?.replace(parenthesisRegexp, '') ?? null,
          fallbackText:
            seg.fallbackText?.replace(parenthesisRegexp, '') ?? null,
        })),
      },
    [currentTrainTypeOrigin]
  );

  const yamanoteTrainTypeJa = useMemo(() => {
    if (isBus || !isYamanoteLine || !selectedDirection) return null;
    return selectedDirection === 'INBOUND' ? '山手線内回り' : '山手線外回り';
  }, [isBus, isYamanoteLine, selectedDirection]);

  const yamanoteTrainTypeEn = !isBus && isYamanoteLine ? 'Yamanote Line' : null;

  // directionalStops のカッコ書きも TTS で読み上げないため、
  // boundForJa / boundForEn に渡す前に取り除く (issue #1175)。
  const directionalStopsForTTS = useMemo(
    () => directionalStops.map(stripStationParensForTTS),
    [directionalStops]
  );

  const boundForJa = useMemo(
    () =>
      isLoopLine
        ? // NOTE: メジャーな駅だからreplaceJapaneseTextは要らない...はず
          loopLineBoundJa?.boundFor?.replace(/・/g, '<break time="250ms"/>')
        : replaceJapaneseText(
            `${directionalStopsForTTS.map((s) => s?.name).join('・')}${
              isPartiallyLoopLine ? '方面' : ''
            }`,
            `${directionalStopsForTTS.map((s) => s?.nameKatakana).join('・')}${
              isPartiallyLoopLine ? 'ホウメン' : ''
            }`
          ),
    [
      directionalStopsForTTS,
      isLoopLine,
      isPartiallyLoopLine,
      loopLineBoundJa?.boundFor,
    ]
  );

  const boundForEn = useMemo(
    () =>
      isLoopLine
        ? (loopLineBoundEn?.boundFor?.replaceAll('&', ' and ') ?? '')
        : directionalStopsForTTS
            .map((s) => ph(s?.nameTtsSegments, s?.nameRoman))
            .join(' and '),
    [directionalStopsForTTS, isLoopLine, loopLineBoundEn?.boundFor]
  );

  const nextStationNumberText = useMemo(() => {
    if (!nextStationNumber) return '';
    if (!nextStationNumber?.stationNumber) return '';

    const split = nextStationNumber.stationNumber.split('-');

    if (!split.length) return '';
    if (split.length === 1) {
      return `${theme === APP_THEME.JR_WEST ? '' : 'Station Number '}<say-as interpret-as="cardinal">${Number(
        nextStationNumber.stationNumber
      )}</say-as>`;
    }

    const symbol = split[0]?.split('').join(' ');
    const num = split[2]
      ? `<say-as interpret-as="cardinal">${Number(split[1])}</say-as>-<say-as interpret-as="cardinal">${Number(split[2])}</say-as>`
      : `<say-as interpret-as="cardinal">${Number(split[1])}</say-as>`;

    return `${
      nextStationNumber.lineSymbol?.length || theme === APP_THEME.JR_WEST
        ? ''
        : 'Station Number '
    }${symbol} ${num}.`;
  }, [nextStationNumber, theme]);

  // 駅名に併記されたカッコ書き (命名権スポンサー名など) を TTS で読み上げないため、
  // context に渡す手前で name / nameKatakana / nameRoman / nameTtsSegments から
  // カッコと中身を落としておく (issue #1175)。表示用データには影響させない。
  const nextStation = useMemo(
    () =>
      nextStationOrigin ? stripStationParensForTTS(nextStationOrigin) : null,
    [nextStationOrigin]
  );

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は渋谷に止まります)
  // 以前は new Set + find のチェーンで毎レンダー O(n²) だった。
  // useTTSText 自体が StationState 全部の依存で頻繁に再評価されるため特に痛い。
  const slicedStations = useMemo<Station[]>(() => {
    const seen = new Set<number>();
    const result: Station[] = [];
    for (const s of slicedStationsOrigin) {
      if (s.groupId == null) continue;
      if (seen.has(s.groupId)) continue;
      seen.add(s.groupId);
      result.push(stripStationParensForTTS(s));
    }
    return result;
  }, [slicedStationsOrigin]);

  const afterNextStationOrigin = useAfterNextStation();
  const afterNextStation = useMemo(
    () =>
      afterNextStationOrigin
        ? stripStationParensForTTS(afterNextStationOrigin)
        : undefined,
    [afterNextStationOrigin]
  );

  const nextStationIndex = useMemo(
    () => slicedStations.findIndex((s) => s.groupId === nextStation?.groupId),
    [nextStation?.groupId, slicedStations]
  );
  const afterNextStationIndex = useMemo(
    () =>
      slicedStations.findIndex((s) => s.groupId === afterNextStation?.groupId),
    [afterNextStation?.groupId, slicedStations]
  );

  const betweenNextStation = useMemo(
    () =>
      nextStationIndex === -1 ||
      afterNextStationIndex === -1 ||
      afterNextStationIndex <= nextStationIndex
        ? []
        : slicedStations.slice(nextStationIndex + 1, afterNextStationIndex),
    [afterNextStationIndex, nextStationIndex, slicedStations]
  );

  const isAfterNextStopTerminus = useIsTerminus(afterNextStation);

  // 次駅のさらに先の駅。次駅が他社線直通の境界駅かどうかの判定に使う。
  const stationAfterNextStop = useMemo(
    () =>
      nextStationIndex >= 0 ? slicedStations[nextStationIndex + 1] : undefined,
    [nextStationIndex, slicedStations]
  );

  const allStops = useMemo(
    () =>
      slicedStations.filter((s) => {
        if (s.groupId === station?.groupId) return false;
        return !getIsPass(s);
      }),
    [slicedStations, station]
  );

  // JR西日本テーマ: 停車駅リストのバッチサイクル追跡
  // 進行方向上で現在の駅が何番目の停車駅かを求め、5駅ごとの境界で案内を出す
  // O(n²) だった重複除去 (Set→find ループ) を O(n) に短縮し、停車駅探索もインライン化。
  const currentStopIndex = useMemo(() => {
    if (!station) return -1;
    const isInbound = selectedDirection === 'INBOUND';
    const total = stations.length;
    const seen = new Set<number>();
    let stopCount = 0;
    for (let i = 0; i < total; i++) {
      const s = isInbound ? stations[i] : stations[total - 1 - i];
      if (!s || s.groupId == null) continue;
      if (seen.has(s.groupId)) continue;
      seen.add(s.groupId);
      if (getIsPass(s)) continue;
      if (s.groupId === station.groupId) return stopCount;
      stopCount++;
    }
    return -1;
  }, [stations, station, selectedDirection]);

  const shouldAnnounceJrWestStopList = useMemo(
    () =>
      allStops.length > 1 &&
      (firstSpeech || (currentStopIndex > 0 && currentStopIndex % 5 === 0)),
    [allStops.length, firstSpeech, currentStopIndex]
  );

  // JR西日本テーマ: 停車駅案内バッチの末尾駅（5駅区切りの最後）
  const lastAnnouncedStop = useMemo(
    () => allStops.slice(0, 5).filter(Boolean).at(-1),
    [allStops]
  );

  const viaStation = useMemo(() => {
    const sortedStops = allStops
      .slice()
      .sort((a, b) =>
        (a.lines?.length ?? 0) < (b.lines?.length ?? 0) ? 1 : -1
      );

    if (allStops[allStops.length - 1]?.id === sortedStops[0]?.id) {
      return; // 終着駅と同じ駅の場合undefinedを返す
    }
    return sortedStops[0];
  }, [allStops]);

  const context = useMemo<TemplateContext | null>(() => {
    // nextStation が未解決のまま context を組み立てると
    // `次は、各駅停車です` のような無関係案内が流れる可能性があるため
    // currentLine / selectedBound と同様に early return のゲートに含める (#5917)。
    if (!currentLine || !selectedBound || !nextStation) return null;

    const isBoundStop = (s: Station): boolean =>
      s.groupId === selectedBound?.groupId && !isLoopLine;

    // バスは元アナウンス上「列車種別」概念を持たないので、
    // テンプレ側の `{#if hasTrainType}` で 各駅停車/Local Service 等の挿入を抑止する。
    // 鉄道時は常に true (列車種別未設定でも `各駅停車` / `Local` にフォールバックする既存挙動を維持)。
    const hasTrainType = !isBus;
    // 鉄道は列車種別が無いと「次の停車駅」案内を出さない (各駅停車では自明)。
    // バスは元アナウンスが常に「次の停車駅」を案内するため、列車種別の有無を問わず
    // afterNextStation があれば announce する。
    const shouldAnnounceAfterNextStop = isBus
      ? !!afterNextStation
      : !!(currentTrainType && afterNextStation);

    const nextStationIsBound =
      nextStation?.groupId === selectedBound?.groupId && !isLoopLine;

    // 次駅が現在路線の最終駅で、その先が他路線へ直通する境界駅かどうか。
    // 公式放送では境界駅の手前で自社線利用への御礼と直通先の列車案内を行う
    // (東急・都営は実車放送、東京メトロは終点形と同一の御礼文言で確認)。
    const throughLine = stationAfterNextStop?.line;
    const isNextStopThroughBoundary =
      !isBus &&
      !isLoopLine &&
      !isNextStopTerminus &&
      !nextStationIsBound &&
      !!throughLine?.id &&
      throughLine.id !== currentLine.id;

    const currentLineJa = replaceJapaneseText(
      currentLine.nameShort,
      currentLine.nameKatakana,
      '',
      currentLine.nameIpa
    );
    const currentLineEn = ph(
      currentLine.nameTtsSegments,
      currentLine.nameRoman
    );
    const currentTrainTypeJa = currentTrainType
      ? replaceJapaneseText(
          currentTrainType.name,
          currentTrainType.nameKatakana,
          '',
          currentTrainType.nameIpa
        )
      : '';
    const currentTrainTypeEn = currentTrainType
      ? ph(currentTrainType.nameTtsSegments, currentTrainType.nameRoman)
      : '';

    return {
      // フラグ
      firstSpeech,
      isNextStopTerminus,
      isAfterNextStopTerminus,
      hasTransferLines: ttsTransferLines.length > 0,
      hasConnectedLines: connectedLines.length > 0,
      hasBetweenStations: betweenNextStation.length > 0,
      hasAfterNextStation: !!afterNextStation,
      hasTrainType,
      shouldAnnounceAfterNextStop,
      hasViaStation: !!viaStation,
      nextStationIsBound,
      isNextStopThroughBoundary,
      lastAnnouncedStopIsBound:
        lastAnnouncedStop?.groupId === selectedBound?.groupId,
      shouldAnnounceJrWestStopList,
      hasNextStationNumberLineSymbol: !!nextStationNumber?.lineSymbol?.length,
      hasNextStationNumberText: nextStationNumberText.length > 0,

      // 乗り物名 (アナウンスで `この電車` / `この列車` / `このバス` をテーマと
      // モードで切り替える)。JR_KYUSHU の鉄道のみ歴史的に `この列車` を使うため
      // 個別分岐させる。
      vehicleJa: isBus
        ? 'このバス'
        : theme === APP_THEME.JR_KYUSHU
          ? 'この列車'
          : 'この電車',
      vehicleEn: isBus ? 'bus' : 'train',
      // 「次の停車場」を表す語。バスアナウンスは慣習的に "stop" を用いる。
      // 鉄道は既存表記 "station" を維持。
      placeEn: isBus ? 'stop' : 'station',

      // 日本語
      nextStationJa: replaceJapaneseText(
        nextStation?.name,
        nextStation?.nameKatakana,
        '',
        nextStation?.nameIpa
      ),
      currentLineJa,
      currentLineShortJa: currentLine.nameShort ?? '',
      currentLineCompanyJa: replaceJapaneseText(
        currentLine.company?.nameShort,
        currentLine.company?.nameKatakana
      ),
      currentLineCompanyShortJa: currentLine.company?.nameShort ?? '',
      boundForJa: boundForJa ?? '',
      // TOKYO_METRO/TY/TOEI 用 (各駅停車 デフォルト)
      trainTypeJa: yamanoteTrainTypeJa ?? (currentTrainTypeJa || '各駅停車'),
      // JR_WEST 用 (各駅停車 デフォルト)。
      // 以前は replaceJapaneseText の暗黙フォールバックに依存していたが、
      // ヘルパは値欠落時に空文字を返すよう変更されたため、ここで明示する (#5917)。
      trainTypeJaPlain:
        yamanoteTrainTypeJa ?? (currentTrainTypeJa || '各駅停車'),
      // JR_KYUSHU 用 (普通 デフォルト)
      trainTypeJaKyushu: yamanoteTrainTypeJa ?? (currentTrainTypeJa || '普通'),
      // JR東日本 (YAMANOTE/SAIKYO) の列車案内
      // 「この電車は、◯◯線、(種別、)◯◯ゆきです。」に入る路線+種別の塊。
      // 山手線は公式が「山手線内回り/外回り」と読むため専用文言で置き換える。
      // 種別が無い普通列車は公式同様に路線名のみ (各駅停車とは読まない)。
      jrEastTrainDescJa:
        yamanoteTrainTypeJa ??
        [currentLineJa, currentTrainTypeJa].filter(Boolean).join('、'),
      transferLinesListJa: formatLinesListJa(ttsTransferLines),
      connectedLinesListJa: formatLinesListJa(connectedLines),
      betweenStationsListJa: formatStationsListJa(betweenNextStation),
      afterNextStationJa: afterNextStation
        ? replaceJapaneseText(
            afterNextStation.name,
            afterNextStation.nameKatakana,
            '',
            afterNextStation.nameIpa
          )
        : '',
      viaStationJa: viaStation
        ? replaceJapaneseText(
            viaStation.name,
            viaStation.nameKatakana,
            '',
            viaStation.nameIpa
          )
        : '',
      jrWestStopsListJa: formatJrWestStopsListJa(allStops, isBoundStop),
      lastAnnouncedStopJa: lastAnnouncedStop
        ? replaceJapaneseText(
            lastAnnouncedStop.name,
            lastAnnouncedStop.nameKatakana,
            '',
            lastAnnouncedStop.nameIpa
          )
        : '',
      // 直通境界駅で案内する直通先路線
      nextLineJa: isNextStopThroughBoundary
        ? replaceJapaneseText(
            throughLine?.nameShort,
            throughLine?.nameKatakana,
            '',
            throughLine?.nameIpa
          )
        : '',

      // 英語
      nextStationEn: ph(nextStation?.nameTtsSegments, nextStation?.nameRoman),
      currentLineEn,
      currentLineCompanyEn: currentLine.company?.nameEnglishShort ?? '',
      // "Thank you for using the X" に差し込む語。鉄道は路線名 (e.g. "Tokyo Metro Tozai Line")、
      // バスは路線レコードに英語名が無いケースが多いので会社名 (e.g. "Toei Bus") を使う。
      // 旧 useBusTTSText が `station.line.company.nameEnglishShort` を採用していた挙動に揃える。
      currentLineThanksEn: isBus
        ? (currentLine.company?.nameEnglishShort ?? '')
        : ph(currentLine.nameTtsSegments, currentLine.nameRoman),
      boundForEn,
      // 多くのテーマで使う共通形 (yamanote ?? phoneme || 'Local')
      trainTypeEn: yamanoteTrainTypeEn ?? (currentTrainTypeEn || 'Local'),
      // JR東日本 (YAMANOTE/SAIKYO) の列車案内 (路線名 + 種別)。
      // 公式: "This is the Yamanote Line train bound for ..." /
      // "This is a Chuo Line rapid service train for ..." 形。
      jrEastTrainDescEn:
        yamanoteTrainTypeEn ??
        `${currentLineEn}${currentTrainTypeEn ? ` ${currentTrainTypeEn} service` : ''}`,
      transferLinesEnList: formatLinesListEn(ttsTransferLines),
      connectedLineEnPhrase: formatFirstConnectedLineEnPhrase(connectedLines),
      afterNextStationEn: afterNextStation
        ? ph(afterNextStation.nameTtsSegments, afterNextStation.nameRoman)
        : '',
      viaStationEn: viaStation
        ? ph(viaStation.nameTtsSegments, viaStation.nameRoman)
        : '',
      jrWestStopsListEn: formatJrWestStopsListEn(allStops, isBoundStop),
      lastAnnouncedStopEn: lastAnnouncedStop
        ? ph(lastAnnouncedStop.nameTtsSegments, lastAnnouncedStop.nameRoman)
        : '',
      // 直通境界駅で案内する直通先路線
      nextLineEn: isNextStopThroughBoundary
        ? ph(throughLine?.nameTtsSegments, throughLine?.nameRoman)
        : '',
      nextStationNumberText,
      nextStationNumberTextNoPeriod: nextStationNumberText.replace(/\.$/, ''),
    };
  }, [
    afterNextStation,
    allStops,
    betweenNextStation,
    boundForEn,
    boundForJa,
    connectedLines,
    currentLine,
    currentTrainType,
    firstSpeech,
    isAfterNextStopTerminus,
    isBus,
    isLoopLine,
    isNextStopTerminus,
    lastAnnouncedStop,
    nextStation,
    nextStationNumber?.lineSymbol?.length,
    nextStationNumberText,
    selectedBound,
    shouldAnnounceJrWestStopList,
    stationAfterNextStop,
    theme,
    ttsTransferLines,
    viaStation,
    yamanoteTrainTypeEn,
    yamanoteTrainTypeJa,
  ]);

  const resolved = resolveTemplateTheme(theme);

  const jaText = useMemo(() => {
    if (!context) return '';
    if (stoppingState !== 'NEXT' && stoppingState !== 'ARRIVING') return '';
    return JA_TEMPLATES[resolved][stoppingState](context);
  }, [context, resolved, stoppingState]);

  const enText = useMemo(() => {
    if (!context) return '';
    if (stoppingState !== 'NEXT' && stoppingState !== 'ARRIVING') return '';
    return EN_TEMPLATES[resolved][stoppingState](context);
  }, [context, resolved, stoppingState]);

  const nextJaText = useMemo(
    () => (context ? JA_TEMPLATES[resolved].NEXT(context) : ''),
    [context, resolved]
  );

  const nextEnText = useMemo(
    () => (context ? EN_TEMPLATES[resolved].NEXT(context) : ''),
    [context, resolved]
  );

  if (!enabled) {
    return { text: [], nextText: [] };
  }

  return {
    text: [
      jaText.trim().replace(parenthesisRegexp, ''),
      enText.trim().replace(parenthesisRegexp, ''),
    ],
    nextText: [
      nextJaText.trim().replace(parenthesisRegexp, ''),
      nextEnText.trim().replace(parenthesisRegexp, ''),
    ],
  };
};
