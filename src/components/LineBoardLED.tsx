import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StopCondition } from '~/@types/graphql';
import { FONTS, parenthesisRegexp, STATION_NAME_FONT_SIZE } from '../constants';
import {
  useAfterNextStation,
  useBounds,
  useCurrentLine,
  useCurrentTrainType,
  useLoopLine,
  useNextStation,
  useNumbering,
  useTransferLines,
} from '../hooks';
import type { HeaderStoppingState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import Marquee from './Marquee';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flex: 1,
    gap: 16,
  },
  text: {
    fontSize: STATION_NAME_FONT_SIZE,
    fontFamily: FONTS.JFDotJiskan24h,
    color: 'white',
  },
  green: { color: 'green' },
  orange: { color: 'orange' },
  crimson: { color: 'crimson' },
});

const GreenText = ({ children }: { children: React.ReactNode }) => (
  <Text style={[styles.text, styles.green]}>{children}</Text>
);
const OrangeText = ({ children }: { children: React.ReactNode }) => (
  <Text style={[styles.text, styles.orange]}>{children}</Text>
);
const CrimsonText = ({ children }: { children: React.ReactNode }) => (
  <Text style={[styles.text, styles.crimson]}>{children}</Text>
);

// Helper component for arriving state content
const ArrivingContent = ({
  nextStation,
  afterNextStation,
  transferLines,
  nextStationNumber,
}: {
  nextStation: ReturnType<typeof useNextStation>;
  afterNextStation: ReturnType<typeof useAfterNextStation>;
  transferLines: ReturnType<typeof useTransferLines>;
  nextStationNumber: ReturnType<typeof useNumbering>[0];
}) => (
  <>
    <GreenText>まもなく</GreenText>
    <OrangeText>{nextStation?.name}</OrangeText>
    <GreenText>です。</GreenText>
    {afterNextStation ? (
      <>
        <OrangeText>{nextStation?.name}</OrangeText>
        <GreenText>の次は</GreenText>
        <OrangeText>{afterNextStation?.name}</OrangeText>
        <GreenText>に停車いたします。</GreenText>
        {nextStation?.stopCondition !== StopCondition.All && (
          <>
            <CrimsonText>
              {nextStation?.name}
              は一部列車は通過いたします。
            </CrimsonText>
            <OrangeText>ご注意ください。</OrangeText>
          </>
        )}
      </>
    ) : null}

    {transferLines.length > 0 ? (
      <>
        <OrangeText>
          {transferLines.map((l) => l.nameShort).join('、')}
        </OrangeText>
        <GreenText>はお乗り換えです。</GreenText>
      </>
    ) : null}

    <GreenText>The next stop is</GreenText>
    <Text>
      <OrangeText>
        {nextStation?.nameRoman}
        {nextStationNumber ? `(${nextStationNumber.stationNumber})` : ''}
      </OrangeText>
      <GreenText>.</GreenText>
    </Text>

    {afterNextStation ? (
      <>
        <GreenText>The stop after</GreenText>
        <Text>
          <OrangeText>
            {nextStation?.nameRoman}
            {nextStationNumber ? `(${nextStationNumber.stationNumber})` : ''}
          </OrangeText>
          <GreenText>,</GreenText>
        </Text>

        <GreenText>will be</GreenText>

        <Text>
          <OrangeText>
            {afterNextStation?.nameRoman}
            {afterNextStation?.stationNumbers?.[0]
              ? `(${afterNextStation?.stationNumbers?.[0]?.stationNumber})`
              : ''}
          </OrangeText>
          <GreenText>.</GreenText>
        </Text>
      </>
    ) : null}
    {transferLines.length > 0 ? (
      <>
        <GreenText>Please change here for</GreenText>

        <Text>
          <OrangeText>
            {transferLines
              .map((l) => l.nameRoman)
              .map((name, idx, arr) => {
                if (!idx) {
                  return name;
                }
                return idx === arr.length - 1 && arr.length > 1
                  ? ` and ${name}`
                  : `, ${name}`;
              })
              .join('')}
          </OrangeText>
          <GreenText>.</GreenText>
        </Text>
      </>
    ) : null}
  </>
);

// Helper component for current state content
const CurrentContent = ({
  line,
  trainTypeTexts,
  boundTexts,
}: {
  line: ReturnType<typeof useCurrentLine>;
  trainTypeTexts: [string, string];
  boundTexts: [string, string];
}) => (
  <>
    <GreenText>
      この電車は、{line?.nameShort?.replace(parenthesisRegexp, '')}
    </GreenText>
    <OrangeText>
      {trainTypeTexts[0]} {boundTexts[0]}行き
    </OrangeText>
    <GreenText>です。</GreenText>
    <GreenText>
      This is the {line?.nameRoman?.replace(parenthesisRegexp, '')}
    </GreenText>
    <OrangeText>{trainTypeTexts[1]}</OrangeText>
    <GreenText>train for</GreenText>
    <Text>
      <OrangeText>{boundTexts[1]}</OrangeText>
      <GreenText>.</GreenText>
    </Text>
  </>
);

// Helper component for next stop content
const NextStopContent = ({
  nextStation,
  afterNextStation,
  transferLines,
  nextStationNumber,
}: {
  nextStation: ReturnType<typeof useNextStation>;
  afterNextStation: ReturnType<typeof useAfterNextStation>;
  transferLines: ReturnType<typeof useTransferLines>;
  nextStationNumber: ReturnType<typeof useNumbering>[0];
}) => (
  <>
    <GreenText>次は</GreenText>
    <OrangeText>{nextStation?.name}</OrangeText>
    <GreenText>です。</GreenText>
    {afterNextStation ? (
      <>
        <OrangeText>{nextStation?.name}</OrangeText>
        <GreenText>の次は</GreenText>
        <OrangeText>{afterNextStation?.name}</OrangeText>
        <GreenText>に停車いたします。</GreenText>
        {nextStation?.stopCondition !== StopCondition.All && (
          <>
            <CrimsonText>
              {nextStation?.name}
              は一部列車は通過いたします。
            </CrimsonText>
            <OrangeText>ご注意ください。</OrangeText>
          </>
        )}
      </>
    ) : null}
    {transferLines.length > 0 ? (
      <>
        <OrangeText>
          {transferLines.map((l) => l.nameShort).join('、')}
        </OrangeText>
        <GreenText>はお乗り換えです。</GreenText>
      </>
    ) : null}
    <GreenText>The next stop is</GreenText>
    <Text>
      <OrangeText>
        {nextStation?.nameRoman}
        {nextStationNumber ? `(${nextStationNumber.stationNumber})` : ''}
      </OrangeText>
      <GreenText>.</GreenText>
    </Text>
    {afterNextStation ? (
      <>
        <GreenText>The stop after</GreenText>
        <Text>
          <OrangeText>
            {nextStation?.nameRoman}
            {nextStationNumber ? `(${nextStationNumber.stationNumber})` : ''}
          </OrangeText>
          <GreenText>,</GreenText>
        </Text>

        <GreenText>will be</GreenText>
        <Text>
          <OrangeText>
            {afterNextStation?.nameRoman}
            {afterNextStation?.stationNumbers?.[0]
              ? `(${afterNextStation?.stationNumbers?.[0]?.stationNumber})`
              : ''}
          </OrangeText>
          <GreenText>.</GreenText>
        </Text>
      </>
    ) : null}
    {transferLines.length > 0 ? (
      <>
        <GreenText>Please change here for</GreenText>
        <Text>
          <OrangeText>
            {transferLines
              .map((l) => l.nameRoman)
              .map((name, idx, arr) => {
                if (!idx) {
                  return name;
                }
                return idx === arr.length - 1 && arr.length > 1
                  ? ` and ${name}`
                  : `, ${name}`;
              })
              .join('')}
          </OrangeText>
          <GreenText>.</GreenText>
        </Text>
      </>
    ) : null}
  </>
);

const LineBoardLED = () => {
  const { selectedDirection, stations } = useAtomValue(stationState);
  const { headerState } = useAtomValue(navigationState);
  const line = useCurrentLine();

  const stoppingState = useMemo(
    () => headerState.split('_')[0] as HeaderStoppingState,
    [headerState]
  );

  const nextStation = useNextStation();
  const trainType = useCurrentTrainType();
  const { directionalStops } = useBounds(stations);
  const transferLines = useTransferLines();
  const [nextStationNumber] = useNumbering();
  const afterNextStation = useAfterNextStation();
  const {
    isLoopLine,
    isPartiallyLoopLine,
    isMeijoLine,
    isOsakaLoopLine,
    isYamanoteLine,
  } = useLoopLine();

  const trainTypeTexts = useMemo(() => {
    if (!line) {
      return ['', ''] as [string, string];
    }

    if (isMeijoLine) {
      return [
        selectedDirection === 'INBOUND' ? '左回り' : '右回り',
        selectedDirection === 'INBOUND' ? 'Counterclockwise' : 'Clockwise',
      ] as [string, string];
    }

    if ((isYamanoteLine || isOsakaLoopLine) && selectedDirection) {
      return [
        selectedDirection === 'INBOUND' ? '内回り' : '外回り',
        selectedDirection === 'INBOUND' ? 'Counterclockwise' : 'Clockwise',
      ] as [string, string];
    }

    return [
      trainType?.name?.replace(parenthesisRegexp, '') ?? '',
      trainType?.nameRoman?.replace(parenthesisRegexp, '') ?? '',
    ] as [string, string];
  }, [
    isMeijoLine,
    isOsakaLoopLine,
    isYamanoteLine,
    line,
    selectedDirection,
    trainType?.name,
    trainType?.nameRoman,
  ]);

  const boundTexts = useMemo(() => {
    const jaText = directionalStops
      .filter(Boolean)
      .map((station) => station.name?.replace(parenthesisRegexp, ''))
      .join('・');
    const enText = directionalStops
      .filter(Boolean)
      .map(
        (station) =>
          `${station?.nameRoman?.replace(parenthesisRegexp, '')}${
            station.stationNumbers?.[0]?.stationNumber
              ? `(${station.stationNumbers?.[0]?.stationNumber})`
              : ''
          }`
      )
      .join(' and ');
    return [
      `${jaText}${isLoopLine || isPartiallyLoopLine ? '方面' : ''}`,
      enText,
    ] as [string, string];
  }, [directionalStops, isLoopLine, isPartiallyLoopLine]);

  if (stoppingState === 'ARRIVING') {
    return (
      <Marquee>
        <View style={styles.container}>
          <ArrivingContent
            nextStation={nextStation}
            afterNextStation={afterNextStation}
            transferLines={transferLines}
            nextStationNumber={nextStationNumber}
          />
        </View>
      </Marquee>
    );
  }

  if (stoppingState === 'CURRENT') {
    return (
      <Marquee>
        <View style={styles.container}>
          <CurrentContent
            line={line}
            trainTypeTexts={trainTypeTexts}
            boundTexts={boundTexts}
          />
        </View>
      </Marquee>
    );
  }

  return (
    <Marquee>
      <View style={styles.container}>
        <NextStopContent
          nextStation={nextStation}
          afterNextStation={afterNextStation}
          transferLines={transferLines}
          nextStationNumber={nextStationNumber}
        />
      </View>
    </Marquee>
  );
};

export default React.memo(LineBoardLED);
