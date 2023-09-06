import { LinearGradient } from 'expo-linear-gradient'
import React, { useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { hasNotch } from 'react-native-device-info'
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
import { heightScale, widthScale } from '../utils/scale'
import { getIsLocal } from '../utils/trainTypeString'
import BarTerminalEast from './BarTerminalEast'
import BarTerminalSaikyo from './BarTerminalSaikyo'
import Typography from './Typography'

const { width: windowWidth } = Dimensions.get('window')
const barLeft = widthScale(33)
const barRightSP = hasNotch() ? widthScale(35) : widthScale(38)
const barRight = isTablet ? widthScale(32 + 4) : barRightSP
const barLeftWidth = widthScale(155)
const barRightWidthSP = hasNotch() ? widthScale(153) : widthScale(150)
const barRightWidth = isTablet ? widthScale(151) : barRightWidthSP

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
  bottom: {
    flex: isTablet ? 1.5 : 1,
  },
  linesContainer: {
    position: 'relative',
    width: windowWidth,
  },
  bar: {
    position: 'absolute',
    height: isTablet ? heightScale(48) : 32,
  },
  barTerminal: {
    width: isTablet ? widthScale(49) : 33.7,
    height: isTablet ? heightScale(49) : 32,
    position: 'absolute',
  },
  centerCircle: {
    position: 'absolute',
    width: isTablet ? widthScale(16) : widthScale(12),
    height: isTablet ? widthScale(16) : widthScale(12),
    backgroundColor: 'white',
    alignSelf: 'center',
    top: heightScale(4),
    borderRadius: isTablet ? widthScale(8) : widthScale(6),
    zIndex: 9999,
  },
  trainTypeLeft: {
    width: isTablet ? 256 : 128,
    height: isTablet ? 72 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isTablet ? heightScale(-8) : heightScale(-16),
  },
  trainTypeRight: {
    width: isTablet ? 360 : 128,
    height: isTablet ? 72 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isTablet ? heightScale(-8) : heightScale(-16),
  },
  gradient: {
    width: isTablet ? widthScale(64) : 128,
    height: isTablet ? heightScale(64) : 48,
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
    width: isTablet ? widthScale(64) : 128,
    textAlign: 'center',
    fontWeight: 'bold',
    position: 'absolute',
  },
})

const MetroBars: React.FC = () => {
  const trainType = useCurrentTrainType()
  const nextTrainType = useNextTrainType()
  const currentLine = useCurrentLine()
  const nextLine = useNextLine()

  const trainTypeLeftVal = useMemo(() => {
    if (isTablet) {
      return widthScale(barRight - 64)
    }
    return widthScale(barRight)
  }, [])

  const trainTypeRightVal = useMemo(() => {
    if (isTablet) {
      return widthScale(barRight - 84)
    }
    return widthScale(barRight)
  }, [])

  const lineTextTopVal = useMemo(() => {
    if (isTablet) {
      return heightScale(72)
    }
    return heightScale(barRight + 8)
  }, [])

  const barTerminalRight = useMemo((): number => {
    if (isTablet) {
      return barRight - widthScale(32)
    }
    return barRight - 30
  }, [])

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
          left: barLeft,
          width: barLeftWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={{
          ...styles.bar,
          left: barLeft,
          width: barLeftWidth,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: barLeft,
          width: barLeftWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={[
          `${currentLine?.color ?? '#000000'}ff`,
          `${currentLine?.color ?? '#000000'}bb`,
        ]}
        style={{
          ...styles.bar,
          left: barLeft,
          width: barLeftWidth,
        }}
      />

      <View style={styles.centerCircle} />
      {/* Next line */}
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          right: barRight,
          width: barRightWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={{
          ...styles.bar,
          right: barRight,
          width: barRightWidth,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          right: barRight,
          width: barRightWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={[
          `${nextLine?.color ?? '#000000'}ff`,
          `${nextLine?.color ?? '#000000'}bb`,
        ]}
        style={{
          ...styles.bar,
          right: barRight,
          width: barRightWidth,
        }}
      />
      <BarTerminalEast
        style={[styles.barTerminal, { right: barTerminalRight }]}
        lineColor={nextLine?.color ?? '#000000'}
        hasTerminus={false}
      />

      <View style={[styles.trainTypeLeft, { left: trainTypeLeftVal }]}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${trainType.color}ee`, `${trainType.color}aa`]}
          style={styles.gradient}
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
            {truncateTrainType(trainType.nameRoman.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              top: lineTextTopVal,
              color: currentLine?.color ?? '#000000',
              fontSize: RFValue(12),
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {currentLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {currentLine?.nameRoman.replace(parenthesisRegexp, '')}
        </Typography>
      </View>
      <View style={[styles.trainTypeRight, { right: trainTypeRightVal }]}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${nextTrainType.color}ee`, `${nextTrainType.color}aa`]}
          style={styles.gradient}
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
            {truncateTrainType(nextTrainType.nameRoman.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              top: lineTextTopVal,
              color: nextLine?.color ?? '#000000',
              fontSize: RFValue(12),
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {nextLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {nextLine?.nameRoman.replace(parenthesisRegexp, '')}
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

  const trainTypeLeftVal = useMemo(() => {
    if (isTablet) {
      return widthScale(barRight - 64)
    }
    return widthScale(barRight)
  }, [])

  const trainTypeRightVal = useMemo(() => {
    if (isTablet) {
      return widthScale(barRight - 84)
    }
    return widthScale(barRight)
  }, [])

  const lineTextTopVal = useMemo(() => {
    if (isTablet) {
      return heightScale(72)
    }
    return heightScale(barRight + 8)
  }, [])

  const barTerminalRight = useMemo((): number => {
    if (isTablet) {
      return barRight - widthScale(32)
    }
    return barRight - 30
  }, [])

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
          left: barLeft,
          width: barLeftWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={{
          ...styles.bar,
          left: barLeft,
          width: barLeftWidth,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: barLeft,
          width: barLeftWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={[
          `${currentLine?.color || '#000000'}ff`,
          `${currentLine?.color || '#000000'}bb`,
        ]}
        style={{
          ...styles.bar,
          left: barLeft,
          width: barLeftWidth,
        }}
      />
      <View style={styles.centerCircle} />
      {/* Next line */}
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={{
          ...styles.bar,
          right: barRight,
          width: barRightWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={{
          ...styles.bar,
          right: barRight,
          width: barRightWidth,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={{
          ...styles.bar,
          right: barRight,
          width: barRightWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={[
          `${nextLine?.color || '#000000'}ff`,
          `${nextLine?.color || '#000000'}bb`,
        ]}
        style={{
          ...styles.bar,
          right: barRight,
          width: barRightWidth,
        }}
      />
      <BarTerminalSaikyo
        style={[styles.barTerminal, { right: barTerminalRight }]}
        lineColor={nextLine?.color ?? '#000000'}
        hasTerminus={false}
      />

      <View style={[styles.trainTypeLeft, { left: trainTypeLeftVal }]}>
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${trainType.color}ee`, `${trainType.color}aa`]}
          style={styles.gradient}
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
            {truncateTrainType(trainType.nameRoman.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              top: lineTextTopVal,
              color: currentLine?.color ?? '#000000',
              fontSize: RFValue(12),
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {currentLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {currentLine?.nameRoman.replace(parenthesisRegexp, '')}
        </Typography>
      </View>
      <View style={[styles.trainTypeRight, { right: trainTypeRightVal }]}>
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${nextTrainType.color}ee`, `${nextTrainType.color}aa`]}
          style={styles.gradient}
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
            {truncateTrainType(nextTrainType.nameRoman.replace('\n', ''))}
          </Typography>
        </View>
        <Typography
          style={[
            {
              ...styles.lineText,
              top: lineTextTopVal,
              color: nextLine?.color ?? '#000000',
              fontSize: RFValue(12),
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {nextLine?.nameShort.replace(parenthesisRegexp, '')}{' '}
          {nextLine?.nameRoman.replace(parenthesisRegexp, '')}
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
    const first = nextTrainType.nameRoman[0].toLowerCase()
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
        {theme !== 'SAIKYO' ? <MetroBars /> : <SaikyoBars />}
      </View>
    </SafeAreaView>
  )
}

export default TypeChangeNotify
