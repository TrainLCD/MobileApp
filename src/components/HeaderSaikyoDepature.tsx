import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { withAnchorPoint } from 'react-native-anchor-point';
import Animated, {
  EasingNode,
  sub,
  timing,
  useValue,
} from 'react-native-reanimated';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import {
  HEADER_CONTENT_TRANSITION_DELAY,
  STATION_NAME_FONT_SIZE,
} from '../constants';
import { parenthesisRegexp } from '../constants/regexp';
import useValueRef from '../hooks/useValueRef';
import { HeaderTransitionState } from '../models/HeaderTransitionState';
import { APITrainType } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getStationNameScale from '../utils/getStationNameScale';
import getTrainType from '../utils/getTrainType';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import Clock from './Clock';
import CommonHeaderProps from './CommonHeaderProps';
import TrainTypeBox from './TrainTypeBoxSaikyo';
import VisitorsPanel from './VisitorsPanel';

const styles = StyleSheet.create({
  root: {
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  bottom: {
    height: isTablet ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingBottom: 8,
  },
  boundForTextRightText: {
    fontWeight: 'bold',
    fontSize: RFValue(32),
    color: '#fff',
  },
  boundForTextTopText: {
    color: '#fff',
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
  stateWrapper: {
    width: Dimensions.get('window').width / 5,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  state: {
    position: 'absolute',
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  stationNameWrapper: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  boundContainer: {
    position: 'absolute',
    flexDirection: 'column',
  },
  stationNameContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'baseline',
    marginLeft: 128,
  },
  stationName: {
    fontWeight: 'bold',
    color: '#fff',
  },
  stationNameBoundRight: {
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clockOverride: {
    position: 'absolute',
    bottom: 0,
  },
  colorBar: {
    width: 48,
    height: isTablet
      ? Dimensions.get('window').height / 6
      : Dimensions.get('window').height / 4,
    position: 'absolute',
    bottom: -8,
    marginLeft: 32,
  },
});

const { width: windowWidth } = Dimensions.get('window');

type HeaderBarProps = {
  lineColor?: string;
  height: number;
};

const headerBarStyles = StyleSheet.create({
  root: {
    width: '100%',
  },
  gradient: {
    flex: 1,
  },
  divider: {
    backgroundColor: 'white',
    height: 2,
  },
});

const HeaderBar: React.FC<HeaderBarProps> = ({
  lineColor,
  height,
}: HeaderBarProps) => {
  if (!lineColor) {
    return <View style={[headerBarStyles.root, { height }]} />;
  }
  return (
    <View style={[headerBarStyles.root, { height }]}>
      <LinearGradient
        style={headerBarStyles.gradient}
        colors={[
          '#fcfcfc',
          `${lineColor}bb`,
          `${lineColor}bb`,
          `${lineColor}bb`,
          '#fcfcfc',
        ]}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={[0, 0]}
        end={[1, 1]}
      />
    </View>
  );
};

HeaderBar.defaultProps = {
  lineColor: undefined,
};

const HeaderSaikyoDepature: React.FC<CommonHeaderProps> = ({
  station,
  boundStation,
  line,
  state,
  lineDirection,
}: CommonHeaderProps) => {
  const [prevState, setPrevState] = useState<HeaderTransitionState>(
    isJapanese ? 'CURRENT' : 'CURRENT_EN'
  );
  const [lineNameText, setLineNameText] = useState('');
  const { selectedBound } = useRecoilValue(stationState);
  const [boundText, setBoundText] = useState(selectedBound?.name);
  const [boundTextScale, setBoundTextScale] = useState(
    getStationNameScale(isJapanese ? station.name : station.nameR, !isJapanese)
  );
  const prevBoundTextScale = useValueRef(boundTextScale).current;
  const prevBoundText = useValueRef(boundText).current;
  const prevLineNameText = useValueRef(lineNameText).current;
  const { trainType } = useRecoilValue(navigationState);

  const currentTrainType = useMemo(
    () =>
      (trainType as APITrainType)?.allTrainTypes.find(
        (tt) => tt.line.id === line?.id
      ) || trainType,
    [line?.id, trainType]
  );

  const nameFadeAnim = useValue<number>(1);
  const topNameScaleYAnim = useValue<number>(0);
  const stateOpacityAnim = useValue<number>(0);
  const boundOpacityAnim = useValue<number>(0);
  const bottomNameScaleYAnim = useValue<number>(1);

  const { top: safeAreaTop, right: safeAreaRight } = useSafeAreaInsets();

  const adjustScale = useCallback((stationName: string, en?: boolean): void => {
    setBoundTextScale(getStationNameScale(stationName, en));
  }, []);

  const prevLineNameTextIsDifferent = useMemo(
    () => prevLineNameText !== lineNameText,
    [lineNameText, prevLineNameText]
  );

  const boundForText = useMemo(() => {
    switch (state) {
      case 'CURRENT':
        return '行';
      case 'CURRENT_KANA':
        return 'ゆき';
      case 'CURRENT_EN':
        return 'for';
      case 'CURRENT_ZH':
        return '开往';
      case 'CURRENT_KO':
        return '행';
      default:
        return '';
    }
  }, [state]);
  const boundForTextPosition = useMemo((): 'top' | 'right' => {
    switch (state) {
      case 'CURRENT':
        return 'right';
      case 'CURRENT_KANA':
        return 'right';
      case 'CURRENT_EN':
        return 'top';
      case 'CURRENT_ZH':
        return 'top';
      case 'CURRENT_KO':
        return 'right';
      default:
        return 'top';
    }
  }, [state]);

  const prevBoundForText = useValueRef(boundForText).current;
  const prevBoundForTextPosition = useValueRef(boundForTextPosition).current;

  const fadeIn = useCallback((): void => {
    timing(topNameScaleYAnim, {
      toValue: 0,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: EasingNode.linear,
    }).start();
    timing(nameFadeAnim, {
      toValue: 1,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: EasingNode.linear,
    }).start();
    timing(bottomNameScaleYAnim, {
      toValue: 1,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: EasingNode.linear,
    }).start();
    if (prevLineNameTextIsDifferent) {
      timing(stateOpacityAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: EasingNode.linear,
      }).start();
    }
  }, [
    bottomNameScaleYAnim,
    prevLineNameTextIsDifferent,
    topNameScaleYAnim,
    stateOpacityAnim,
    nameFadeAnim,
  ]);

  const fadeOut = useCallback((): void => {
    nameFadeAnim.setValue(0);
    topNameScaleYAnim.setValue(1);
    stateOpacityAnim.setValue(1);
    boundOpacityAnim.setValue(1);
    bottomNameScaleYAnim.setValue(0);
  }, [
    bottomNameScaleYAnim,
    boundOpacityAnim,
    topNameScaleYAnim,
    stateOpacityAnim,
    nameFadeAnim,
  ]);

  useEffect(() => {
    switch (state) {
      case 'CURRENT':
        if (prevState !== 'CURRENT') {
          fadeOut();
        }
        setLineNameText(line?.name?.replace(parenthesisRegexp, '') || '');
        setBoundText(selectedBound?.name?.replace(parenthesisRegexp, '') || '');
        adjustScale(selectedBound?.name?.replace(parenthesisRegexp, '') || '');
        fadeIn();
        break;
      case 'CURRENT_KANA':
        if (prevState !== 'CURRENT_KANA') {
          fadeOut();
        }
        setLineNameText(line?.name?.replace(parenthesisRegexp, '') || '');
        setBoundText(
          katakanaToHiragana(
            selectedBound?.nameK?.replace(parenthesisRegexp, '') || ''
          )
        );
        adjustScale(
          katakanaToHiragana(
            selectedBound?.nameK?.replace(parenthesisRegexp, '') || ''
          )
        );
        fadeIn();
        break;
      case 'CURRENT_EN':
        if (prevState !== 'CURRENT_EN') {
          fadeOut();
        }
        setLineNameText(line?.nameR?.replace(parenthesisRegexp, '') || '');
        setBoundText(
          selectedBound?.nameR?.replace(parenthesisRegexp, '') || '' || ''
        );
        adjustScale(
          selectedBound?.nameR?.replace(parenthesisRegexp, '') || '',
          true
        );
        fadeIn();
        break;
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break;
        }

        if (prevState !== 'CURRENT_ZH') {
          fadeOut();
        }
        setLineNameText('');
        setBoundText(
          selectedBound?.nameZh?.replace(parenthesisRegexp, '') || ''
        );
        adjustScale(
          selectedBound?.nameZh?.replace(parenthesisRegexp, '') || ''
        );
        fadeIn();
        break;
      case 'CURRENT_KO':
        if (!station.nameKo) {
          break;
        }

        if (prevState !== 'CURRENT_KO') {
          fadeOut();
        }
        setLineNameText('');
        setBoundText(
          selectedBound?.nameKo?.replace(parenthesisRegexp, '') || ''
        );
        adjustScale(
          selectedBound?.nameKo?.replace(parenthesisRegexp, '') || ''
        );
        fadeIn();
        break;
      default:
        break;
    }

    setPrevState(state);
  }, [
    adjustScale,
    fadeIn,
    fadeOut,
    prevState,
    selectedBound?.name,
    selectedBound?.nameK,
    selectedBound?.nameKo,
    selectedBound?.nameR,
    selectedBound?.nameZh,
    line?.name,
    line?.nameK,
    line?.nameR,
    state,
    station.nameKo,
    station.nameZh,
  ]);

  const stateTopAnimatedStyles = {
    opacity: sub(1, stateOpacityAnim),
  };

  const stateBottomAnimatedStyles = {
    opacity: stateOpacityAnim,
  };

  const getTopNameAnimatedStyles = () => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }) as unknown as number,
        },
      ],
    };

    return withAnchorPoint(
      transform,
      { x: 0, y: 0 },
      {
        width: windowWidth,
        height: STATION_NAME_FONT_SIZE,
      }
    );
  };
  const getBottomNameAnimatedStyles = () => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim as unknown as number,
        },
      ],
    };
    return withAnchorPoint(
      transform,
      { x: 0, y: 1 },
      {
        width: windowWidth,
        height: STATION_NAME_FONT_SIZE,
      }
    );
  };
  return (
    <View>
      <VisitorsPanel />
      <HeaderBar
        height={15}
        lineColor={line ? `#${line?.lineColorC}` : '#00ac9a'}
      />
      <View style={{ backgroundColor: 'white', height: 2, opacity: 0.5 }} />
      <View style={styles.root}>
        <View
          style={{
            ...styles.headerTexts,
            marginTop: Platform.OS === 'ios' ? safeAreaTop : 0,
          }}
        >
          <TrainTypeBox
            lineColor={line ? `#${line?.lineColorC}` : '#00ac9a'}
            trainType={
              currentTrainType ?? getTrainType(line, station, lineDirection)
            }
          />
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <Animated.Text style={[stateTopAnimatedStyles, styles.state]}>
              {lineNameText}
            </Animated.Text>
            {boundStation && (
              <Animated.Text style={[stateBottomAnimatedStyles, styles.state]}>
                {prevLineNameText}
              </Animated.Text>
            )}
          </View>

          <View>
            <View
              style={{
                ...styles.colorBar,
                backgroundColor: `#${line ? line.lineColorC : 'aaa'}`,
              }}
            />
            <View
              style={[styles.stationNameWrapper, { width: windowWidth * 0.8 }]}
            >
              <View
                style={{
                  ...styles.boundContainer,
                  transform: [{ scaleX: boundTextScale }],
                }}
              >
                <Animated.View style={getTopNameAnimatedStyles()}>
                  <View style={styles.stationNameContainer}>
                    {boundText?.split('').map((c, i) => (
                      <Animated.Text
                        key={i.toString()}
                        style={[
                          styles.stationName,
                          {
                            opacity: nameFadeAnim,
                            minHeight: STATION_NAME_FONT_SIZE,
                            fontSize: STATION_NAME_FONT_SIZE,
                          },
                        ]}
                      >
                        {boundForTextPosition === 'top' && i === 0 ? (
                          <Text style={styles.boundForTextTopText}>
                            {`${boundForText}\n`}
                          </Text>
                        ) : null}
                        {c}
                      </Animated.Text>
                    ))}
                    {boundForTextPosition === 'right' &&
                      ` ${boundForText}`?.split('').map((c, i) => (
                        <Animated.Text
                          key={i.toString()}
                          style={[
                            styles.boundForTextRightText,
                            {
                              opacity: nameFadeAnim,
                              minHeight: STATION_NAME_FONT_SIZE / 2,
                              fontSize: STATION_NAME_FONT_SIZE / 2,
                            },
                          ]}
                        >
                          {c}
                        </Animated.Text>
                      ))}
                  </View>
                </Animated.View>
              </View>

              <View
                style={{
                  ...styles.stationNameContainer,
                  transform: [{ scaleX: prevBoundTextScale }],
                }}
              >
                {` ${[prevBoundText]}`?.split('').map((c, i) => (
                  <Animated.Text
                    key={i.toString()}
                    style={[
                      styles.stationName,
                      getBottomNameAnimatedStyles(),
                      {
                        opacity: nameFadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0],
                        }),
                        fontSize: STATION_NAME_FONT_SIZE,
                      },
                    ]}
                  >
                    {prevBoundForTextPosition === 'top' &&
                    boundForTextPosition !== prevBoundForTextPosition &&
                    i === 0 ? (
                      <Text style={styles.boundForTextTopText}>
                        {` ${prevBoundForText}\n`}
                      </Text>
                    ) : null}
                    {c}
                  </Animated.Text>
                ))}
              </View>
            </View>
          </View>
        </View>
        <Clock
          bold
          white
          style={{ ...styles.clockOverride, right: 8 + safeAreaRight }}
        />
      </View>
      <HeaderBar height={5} lineColor="transparent" />
    </View>
  );
};

export default React.memo(HeaderSaikyoDepature);
