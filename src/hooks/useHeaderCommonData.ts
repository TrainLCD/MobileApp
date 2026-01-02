import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { CommonHeaderProps } from '../components/Header.types';
import { parenthesisRegexp } from '../constants';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import { getNumberingColor } from '../utils/numbering';
import { useBoundText } from './useBoundText';
import { useConnectedLines } from './useConnectedLines';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useFirstStop } from './useFirstStop';
import { useHeaderLangState } from './useHeaderLangState';
import { useHeaderStateText } from './useHeaderStateText';
import { useHeaderStationText } from './useHeaderStationText';
import { useIsNextLastStop } from './useIsNextLastStop';
import { useNextStation } from './useNextStation';
import { useNumbering } from './useNumbering';

/**
 * Header子コンポーネントに渡す共通データを計算するhook
 * Header.tsxで使用し、各子コンポーネントにpropsとして渡す
 */
export const useHeaderCommonData = (): CommonHeaderProps | null => {
  // Atom values
  const { selectedBound, arrived } = useAtomValue(stationState);
  const { headerState } = useAtomValue(navigationState);
  const { headerTransitionDelay } = useAtomValue(tuningState);

  // 駅・路線データ
  const currentStation = useCurrentStation();
  const currentLine = useCurrentLine();
  const nextStation = useNextStation();

  // その他のhooks
  const trainType = useCurrentTrainType();
  const boundStationNameList = useBoundText();
  const isLast = useIsNextLastStop();
  const firstStop = useFirstStop();
  const connectedLines = useConnectedLines();
  const headerLangState = useHeaderLangState();

  // ナンバリング
  const [currentStationNumber, threeLetterCode] = useNumbering(
    false,
    firstStop
  );

  // 派生データ
  const boundText = useMemo(
    () => boundStationNameList[headerLangState],
    [boundStationNameList, headerLangState]
  );

  const stationText = useHeaderStationText({
    currentStation,
    nextStation,
    headerLangState,
    firstStop,
  });

  const { stateText, stateTextRight } = useHeaderStateText({
    isLast,
    headerLangState,
    firstStop,
  });

  const numberingColor = useMemo(
    () =>
      getNumberingColor(
        arrived,
        currentStationNumber,
        nextStation,
        currentLine
      ),
    [arrived, currentStationNumber, currentLine, nextStation]
  );

  const connectionText = useMemo(
    () =>
      connectedLines
        ?.map((l) => l.nameShort?.replace(parenthesisRegexp, ''))
        .slice(0, 2)
        .join('・') ?? '',
    [connectedLines]
  );

  const isJapaneseState = useMemo(
    () => headerLangState === 'JA' || headerLangState === 'KANA',
    [headerLangState]
  );

  // currentStationがない場合はnullを返す（現在のHeader.tsxの挙動に合わせる）
  if (!currentStation) {
    return null;
  }

  return {
    currentStation,
    currentLine,
    nextStation,
    selectedBound,
    arrived,
    headerState,
    headerTransitionDelay,
    headerLangState,
    stationText,
    stateText,
    stateTextRight,
    boundText,
    currentStationNumber,
    threeLetterCode,
    numberingColor,
    trainType,
    isLast,
    firstStop,
    connectedLines: connectedLines ?? [],
    connectionText,
    isJapaneseState,
  };
};
