import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import truncateTrainType from '../constants/truncateTrainType'
import { StopCondition } from '../gen/stationapi_pb'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useCurrentTrainType from '../hooks/useCurrentTrainType'
import useNextLine from '../hooks/useNextLine'
import useNextTrainType from '../hooks/useNextTrainType'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import isTablet from '../utils/isTablet'
import { getIsLocal } from '../utils/trainTypeString'
import BarTerminalEast from './BarTerminalEast'
import BarTerminalSaikyo from './BarTerminalSaikyo'
import Typography from './Typography'

const { width: windowWidth } = Dimensions.get('window')
const edgeOffset = isTablet ? 100 : 70
const barWidth = windowWidth / 2 - edgeOffset

const barTerminalSize = isTablet ? 64 : 40

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headingJa: {
    fontSize: isTablet ? RFValue(24) : RFValue(21),
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#212121',
    flexWrap: 'wrap',
  },
  trainTypeText: {
    fontWeight: 'bold',
  },
  headingEn: {
    fontSize: isTablet ? RFValue(16) : RFValue(12),
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#212121',
  },
  bottom: { flex: 1.5 },
  linesContainer: {
    position: 'relative',
    justifyContent: 'center',
    width: windowWidth,
  },
  bar: {
    position: 'absolute',
    height: isTablet ? 64 : 40,
    top: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  barTerminal: {
    width: barTerminalSize,
    height: barTerminalSize,
    bottom: isTablet ? -64 : -40,
    position: 'absolute',
    right: edgeOffset + 5,
  },
  joBar: {
    position: 'absolute',
    height: 32,
  },
  centerCircle: {
    position: 'absolute',
    width: isTablet ? 50 : 30,
    height: isTablet ? 50 : 30,
    backgroundColor: 'white',
    alignSelf: 'center',
    top: 5,
    borderRadius: isTablet ? 25 : 15,
    zIndex: 9999,
  },

  trainTypeLeft: {
    width: 128,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isTablet ? 4 : -4,
    left: edgeOffset * 2,
  },
  trainTypeRight: {
    width: 128,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isTablet ? 4 : -4,
    right: edgeOffset * 2 + barTerminalSize / 2,
  },
  trainTypeBoxGradient: {
    width: isTablet ? 200 : 128,
    height: isTablet ? 80 : 48,
    position: 'absolute',
    borderRadius: 4,
  },
  textWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    shadowOpacity: 0.25,
    shadowColor: '#000',
    shadowRadius: 1,
    elevation: 5,
    fontSize: RFValue(18),
  },
  textEn: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    shadowOpacity: 0.25,
    shadowColor: '#000',
    shadowRadius: 1,
    elevation: 5,
    fontSize: RFValue(12),
  },
  lineText: {
    width: isTablet ? 200 : 128,
    textAlign: 'center',
    fontWeight: 'bold',
    position: 'absolute',
    top: isTablet ? 70 : 55,
    fontSize: RFValue(12),
  },
})

const MetroBars: React.FC = () => {
  const trainType = useCurrentTrainType()
  const nextTrainType = useNextTrainType()
  const currentLine = useCurrentLine()
  const nextLine = useNextLine()

  const leftNumberOfLines = useMemo(
    () => ((trainType?.name.replace('\n', '').length ?? 0) <= 10 ? 1 : 2),
    [trainType?.name]
  )
  const rightNumberOfLines = useMemo(
    () => ((nextTrainType?.name.replace('\n', '').length ?? 0) <= 10 ? 1 : 2),
    [nextTrainType?.name]
  )

  if (!trainType || !nextTrainType) {
    return null
  }

  return (
    <View style={styles.linesContainer}>
      {/* Current line */}
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
        }}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
        }}
      />
      <LinearGradient
        colors={[
          `${currentLine?.color ?? '#000000'}ff`,
          `${currentLine?.color ?? '#000000'}bb`,
        ]}
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
        }}
      />

      <View style={styles.centerCircle} />

      {/* Next line */}
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
        }}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
        }}
      />
      <LinearGradient
        colors={[
          `${nextLine?.color ?? '#000000'}ff`,
          `${nextLine?.color ?? '#000000'}bb`,
        ]}
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
        }}
      />
      <BarTerminalEast
        style={styles.barTerminal}
        lineColor={nextLine?.color ?? '#000000'}
        hasTerminus={false}
      />

      <View style={styles.trainTypeLeft}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={styles.trainTypeBoxGradient}
        />
        <LinearGradient
          colors={[`${trainType.color}ee`, `${trainType.color}aa`]}
          style={styles.trainTypeBoxGradient}
        />

        <View style={styles.textWrapper}>
          <Typography
            style={styles.text}
            adjustsFontSizeToFit
            numberOfLines={leftNumberOfLines}
          >
            {trainType.name.replace('\n', '')}
          </Typography>
          <Typography adjustsFontSizeToFit style={styles.textEn}>
            {truncateTrainType(trainType.nameRoman?.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              color: currentLine?.color ?? '#000000',
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {currentLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {currentLine?.nameRoman?.replace(parenthesisRegexp, '')}
        </Typography>
      </View>
      <View style={styles.trainTypeRight}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={styles.trainTypeBoxGradient}
        />
        <LinearGradient
          colors={[`${nextTrainType.color}ee`, `${nextTrainType.color}aa`]}
          style={styles.trainTypeBoxGradient}
        />

        <View style={styles.textWrapper}>
          <Typography
            style={styles.text}
            adjustsFontSizeToFit
            numberOfLines={rightNumberOfLines}
          >
            {nextTrainType.name.replace('\n', '')}
          </Typography>
          <Typography adjustsFontSizeToFit style={styles.textEn}>
            {truncateTrainType(nextTrainType.nameRoman?.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              color: nextLine?.color ?? '#000000',
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {nextLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {nextLine?.nameRoman?.replace(parenthesisRegexp, '')}
        </Typography>
      </View>
    </View>
  )
}

const SaikyoBars: React.FC = () => {
  const currentLine = useCurrentLine()
  const nextLine = useNextLine()
  const trainType = useCurrentTrainType()
  const nextTrainType = useNextTrainType()

  const leftNumberOfLines = useMemo(
    () => ((trainType?.name.replace('\n', '').length ?? 0) <= 10 ? 1 : 2),
    [trainType?.name]
  )
  const rightNumberOfLines = useMemo(
    () => ((nextTrainType?.name.replace('\n', '').length ?? 0) <= 10 ? 1 : 2),
    [nextTrainType?.name]
  )

  if (!trainType || !nextTrainType) {
    return null
  }

  return (
    <View style={styles.linesContainer}>
      {/* Current line */}
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
        }}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
        }}
      />
      <LinearGradient
        colors={[
          `${currentLine?.color || '#000000'}ff`,
          `${currentLine?.color || '#000000'}bb`,
        ]}
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
        }}
      />
      <View style={styles.centerCircle} />
      {/* Next line */}
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
        }}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
        }}
      />
      <LinearGradient
        colors={[
          `${nextLine?.color || '#000000'}ff`,
          `${nextLine?.color || '#000000'}bb`,
        ]}
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
        }}
      />
      <BarTerminalSaikyo
        style={styles.barTerminal}
        lineColor={nextLine?.color ?? '#000000'}
        hasTerminus={false}
      />

      <View style={styles.trainTypeLeft}>
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.trainTypeBoxGradient}
        />
        <LinearGradient
          colors={[`${trainType.color}ee`, `${trainType.color}aa`]}
          style={styles.trainTypeBoxGradient}
        />

        <View style={styles.textWrapper}>
          <Typography
            adjustsFontSizeToFit
            numberOfLines={leftNumberOfLines}
            style={styles.text}
          >
            {trainType.name.replace('\n', '')}
          </Typography>
          <Typography adjustsFontSizeToFit style={styles.textEn}>
            {truncateTrainType(trainType.nameRoman?.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              color: currentLine?.color ?? '#000000',
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {currentLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {currentLine?.nameRoman?.replace(parenthesisRegexp, '')}
        </Typography>
      </View>
      <View style={styles.trainTypeRight}>
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.trainTypeBoxGradient}
        />
        <LinearGradient
          colors={[`${nextTrainType.color}ee`, `${nextTrainType.color}aa`]}
          style={styles.trainTypeBoxGradient}
        />

        <View style={styles.textWrapper}>
          <Typography
            numberOfLines={rightNumberOfLines}
            adjustsFontSizeToFit
            style={styles.text}
          >
            {nextTrainType.name.replace('\n', '')}
          </Typography>
          <Typography adjustsFontSizeToFit style={styles.textEn}>
            {truncateTrainType(nextTrainType.nameRoman?.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              color: nextLine?.color ?? '#000000',
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {nextLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {nextLine?.nameRoman?.replace(parenthesisRegexp, '')}
        </Typography>
      </View>
    </View>
  )
}

const JOBars: React.FC = () => {
  const currentLine = useCurrentLine()
  const nextLine = useNextLine()
  const trainType = useCurrentTrainType()
  const nextTrainType = useNextTrainType()

  const leftNumberOfLines = useMemo(
    () => ((trainType?.name.replace('\n', '').length ?? 0) <= 10 ? 1 : 2),
    [trainType?.name]
  )
  const rightNumberOfLines = useMemo(
    () => ((nextTrainType?.name.replace('\n', '').length ?? 0) <= 10 ? 1 : 2),
    [nextTrainType?.name]
  )

  if (!trainType || !nextTrainType) {
    return null
  }

  return (
    <View style={styles.linesContainer}>
      {/* Current line */}
      <View
        style={{
          ...styles.bar,
          left: edgeOffset,
          width: barWidth,
          backgroundColor: currentLine?.color,
        }}
      />
      <View style={styles.centerCircle} />
      {/* Next line */}
      <View
        style={{
          ...styles.bar,
          right: edgeOffset + barTerminalSize,
          width: barWidth - barTerminalSize,
          backgroundColor: nextLine?.color,
        }}
      />

      <View
        style={{
          top: isTablet ? 16 : 10,
          right: isTablet ? edgeOffset + 16 : edgeOffset + 10,
          position: 'absolute',
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          borderStyle: 'solid',
          borderLeftWidth: isTablet ? 32 : 20,
          borderRightWidth: isTablet ? 32 : 20,
          borderBottomWidth: isTablet ? 32 : 20,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          transform: [{ rotate: '90deg' }],
          borderWidth: 0,
          borderBottomColor: nextLine?.color,
        }}
      />

      <View
        style={{
          ...styles.trainTypeLeft,
          backgroundColor: trainType.color,
          width: isTablet ? 200 : 128,
          height: isTablet ? 80 : 48,
          borderRadius: 4,
          top: isTablet ? -8 : -5,
        }}
      >
        <View style={styles.textWrapper}>
          <Typography
            adjustsFontSizeToFit
            numberOfLines={leftNumberOfLines}
            style={[styles.text, { shadowOpacity: 0 }]}
          >
            {trainType.name.replace('\n', '')}
          </Typography>
          <Typography
            adjustsFontSizeToFit
            style={[styles.textEn, { shadowOpacity: 0 }]}
          >
            {truncateTrainType(trainType.nameRoman?.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              color: currentLine?.color ?? '#000000',
              top: isTablet ? 90 : 55,
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {currentLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {currentLine?.nameRoman?.replace(parenthesisRegexp, '')}
        </Typography>
      </View>

      <View
        style={{
          ...styles.trainTypeRight,
          backgroundColor: nextTrainType.color,
          width: isTablet ? 200 : 128,
          height: isTablet ? 80 : 48,
          borderRadius: 4,
          top: isTablet ? -8 : -5,
        }}
      >
        <View style={styles.textWrapper}>
          <Typography
            numberOfLines={rightNumberOfLines}
            adjustsFontSizeToFit
            style={[styles.text, { shadowOpacity: 0 }]}
          >
            {nextTrainType.name.replace('\n', '')}
          </Typography>
          <Typography
            adjustsFontSizeToFit
            style={[styles.textEn, { shadowOpacity: 0 }]}
          >
            {truncateTrainType(nextTrainType.nameRoman?.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              color: nextLine?.color ?? '#000000',
              top: isTablet ? 90 : 55,
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {nextLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {nextLine?.nameRoman?.replace(parenthesisRegexp, '')}
        </Typography>
      </View>
    </View>
  )
}
const TypeChangeNotify: React.FC = () => {
  const { selectedDirection, stations, selectedBound, station } =
    useRecoilValue(stationState)
  const { theme } = useRecoilValue(themeState)
  const currentLine = useCurrentLine()
  const nextLine = useNextLine()
  const trainType = useCurrentTrainType()
  const nextTrainType = useNextTrainType()

  const currentLineStations = stations.filter(
    (s) => s.line?.id === currentLine?.id
  )

  const reversedStations = stations.slice().reverse()
  const reversedFinalPassedStationIndex = reversedStations.findIndex(
    (s) => s.stopCondition === StopCondition.NOT
  )
  const reversedCurrentStationIndex = reversedStations.findIndex(
    (s) => s.groupId === station?.groupId
  )
  const afterAllStopLastStation =
    reversedStations[reversedFinalPassedStationIndex - 2]
  // 「~から先は各駅に止まります」を表示するフラグ
  const isNextTypeIsLocal =
    nextTrainType &&
    // 次の路線の種別が各停・普通
    getIsLocal(nextTrainType) &&
    // 現在の種別が各停・普通の場合は表示しない
    !getIsLocal(trainType) &&
    // 最後に各駅に停まる駅の路線が次の路線の種別と同じ
    afterAllStopLastStation?.line?.id === nextLine?.id &&
    // 次の停車駅パターン変更駅が現在の駅より前の駅ではない
    reversedCurrentStationIndex > reversedFinalPassedStationIndex
  const currentLineLastStation = useMemo(() => {
    if (
      isNextTypeIsLocal &&
      // 現在の路線内から各駅に停まる時は表示しない
      currentLine?.id !==
        reversedStations[reversedFinalPassedStationIndex - 2]?.line?.id
    ) {
      return afterAllStopLastStation
    }

    if (selectedDirection === 'INBOUND') {
      return currentLineStations[currentLineStations.length - 1]
    }
    return currentLineStations[0]
  }, [
    afterAllStopLastStation,
    currentLine?.id,
    currentLineStations,
    isNextTypeIsLocal,
    reversedFinalPassedStationIndex,
    reversedStations,
    selectedDirection,
  ])

  const aOrAn = useMemo(() => {
    if (!nextTrainType) {
      return ''
    }
    const first = nextTrainType?.nameRoman?.[0].toLowerCase()
    switch (first) {
      case 'a':
      case 'e':
      case 'i':
      case 'o':
      case 'u':
        return 'an'
      default:
        return 'a'
    }
  }, [nextTrainType])

  const headingTexts = useMemo((): {
    jaPrefix: string
    enPrefix: string
    jaSuffix?: string
    enSuffix?: string
  } | null => {
    if (!currentLineLastStation) {
      return null
    }

    if (
      isNextTypeIsLocal &&
      // 現在の路線内から各駅に停まる時は表示しない
      currentLine?.id !==
        reversedStations[reversedFinalPassedStationIndex - 2]?.line?.id
    ) {
      return {
        jaPrefix: `${afterAllStopLastStation?.name}から先は各駅にとまります`,
        enPrefix: `The train stops at all stations after ${afterAllStopLastStation?.nameRoman}.`,
      }
    }

    if (!selectedBound) {
      return null
    }

    return {
      jaPrefix: `${currentLineLastStation.name}から`,
      enPrefix: `From ${currentLineLastStation.nameRoman} station, this train become ${aOrAn}`,
      jaSuffix: `${selectedBound.name}ゆき となります`,
      enSuffix: `train bound for ${selectedBound.nameRoman}.`,
    }
  }, [
    aOrAn,
    afterAllStopLastStation?.name,
    afterAllStopLastStation?.nameRoman,
    currentLine?.id,
    currentLineLastStation,
    isNextTypeIsLocal,
    reversedFinalPassedStationIndex,
    reversedStations,
    selectedBound,
  ])

  const HeadingJa = () => {
    if (!headingTexts) {
      return null
    }

    if (headingTexts.jaSuffix) {
      return (
        <Typography numberOfLines={2} style={styles.headingJa}>
          {`${headingTexts.jaPrefix} `}
          <Typography
            style={[
              { color: nextTrainType?.color || '#212121' },
              styles.trainTypeText,
            ]}
          >
            {nextTrainType?.name.replace('\n', '')}
          </Typography>
          {` ${headingTexts.jaSuffix}`}
        </Typography>
      )
    }
    return (
      <Typography style={styles.headingJa}>{headingTexts.jaPrefix}</Typography>
    )
  }
  const HeadingEn = () => {
    if (!headingTexts) {
      return null
    }

    if (headingTexts.enSuffix) {
      return (
        <Typography style={styles.headingEn}>
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {headingTexts.enPrefix}{' '}
          <Typography
            style={[
              { color: nextTrainType?.color || '#212121' },
              styles.trainTypeText,
            ]}
          >
            {nextTrainType?.nameRoman?.replace('\n', '')}
          </Typography>
          {` ${headingTexts.enSuffix}`}
        </Typography>
      )
    }

    return (
      <Typography style={styles.headingEn}>{headingTexts.enPrefix}</Typography>
    )
  }

  const BarsComponent = useCallback(() => {
    switch (theme) {
      case 'SAIKYO':
        return <SaikyoBars />
      case 'YAMANOTE':
      case 'JO':
        return <JOBars />
      default:
        return <MetroBars />
    }
  }, [theme])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <HeadingJa />
        <HeadingEn />
      </View>
      <View style={styles.bottom}>
        <Typography style={styles.headingJa}>
          {currentLineLastStation?.name}
        </Typography>
        <Typography style={styles.headingEn}>
          {currentLineLastStation?.nameRoman}
        </Typography>
        <BarsComponent />
      </View>
    </SafeAreaView>
  )
}

export default TypeChangeNotify
