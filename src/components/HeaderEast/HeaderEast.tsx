import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated as RNAnimated, StyleSheet, Text, View } from 'react-native';
import { MARK_SHAPE, STATION_NAME_FONT_SIZE } from '../../constants';
import {
  useHeaderAnimation,
  useLandscapeWindowDimensions,
  useStationNameContainerWidth,
  useStationNameScaleX,
} from '../../hooks';
import isTablet from '../../utils/isTablet';
import { RFValue } from '../../utils/rfValue';
import type { CommonHeaderProps } from '../Header.types';
import NumberingIcon from '../NumberingIcon';
import TrainTypeBox from '../TrainTypeBox';
import type { HeaderEastThemeConfig } from './config';

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
  },
  gradientRoot: {
    paddingTop: 14,
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
  },
  bottom: {
    height: isTablet ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  boundWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  boundTextContainer: {
    position: 'absolute',
  },
  firstTextWrapper: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 12,
    marginBottom: isTablet ? 8 : 4,
  },
  firstText: {
    position: 'absolute',
    fontSize: RFValue(24),
    fontWeight: 'bold',
    textAlign: 'right',
  },
  stateWrapper: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 12,
    marginBottom: isTablet ? 8 : 4,
  },
  state: {
    position: 'absolute',
    fontSize: RFValue(18),
    fontWeight: 'bold',
    textAlign: 'right',
  },
  stationNameWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stationNameContainer: {
    position: 'absolute',
    justifyContent: 'center',
  },
  stationName: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // 自然描画幅の計測専用 Text。position: 'absolute' でレイアウトから切り離し、
  // 画面外（top: -9999）に配置することで親 View の幅制約を受けずに自然な幅を
  // 計測し、その値で実際に圧縮が必要かどうかを判定する。
  stationNameMeasurer: {
    position: 'absolute',
    opacity: 0,
    top: -9999,
    left: 0,
    fontSize: STATION_NAME_FONT_SIZE,
    fontWeight: 'bold',
  },
  divider: {
    width: '100%',
    alignSelf: 'stretch',
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

type Props = CommonHeaderProps & {
  config: HeaderEastThemeConfig;
};

const HeaderEast: React.FC<Props> = ({ config, ...props }) => {
  const {
    currentLine,
    selectedBound,
    headerState,
    headerTransitionDelay,
    stationText,
    stateText,
    stateTextRight,
    boundText,
    currentStationNumber,
    threeLetterCode,
    numberingColor,
    trainType,
    firstStop,
    connectedLines,
    connectionText,
    isJapaneseState,
  } = props;

  const animation = useHeaderAnimation({
    selectedBound,
    headerState,
    headerTransitionDelay,
    stationText,
    stateText,
    stateTextRight,
    boundText,
    connectionText,
    isJapaneseState,
  });

  const dim = useLandscapeWindowDimensions();

  const [stationNameSlotWidth, onStationNameSlotLayout] =
    useStationNameContainerWidth();
  const { onTextLayout: onTopTextLayout, scaleX: topStationNameScaleX } =
    useStationNameScaleX(stationText, stationNameSlotWidth);
  const { onTextLayout: onBottomTextLayout, scaleX: bottomStationNameScaleX } =
    useStationNameScaleX(animation.prevStationText, stationNameSlotWidth);

  const stationNameColor = config.stationNameColor ?? config.textColor;

  const dividerBackgroundColor =
    config.divider.color === 'dynamic'
      ? (currentLine?.color ?? '#b5b5ac')
      : config.divider.color;

  const renderNumberingIcon = () => {
    if (config.numberingIcon.wrapped) {
      if (
        !currentStationNumber?.lineSymbolShape ||
        !currentStationNumber?.stationNumber
      ) {
        return null;
      }
      return (
        <View
          style={{
            bottom:
              currentStationNumber.lineSymbolShape === MARK_SHAPE.ROUND
                ? -8
                : 0,
          }}
        >
          <NumberingIcon
            shape={currentStationNumber.lineSymbolShape}
            lineColor={numberingColor}
            stationNumber={currentStationNumber.stationNumber}
            threeLetterCode={threeLetterCode}
            allowScaling
            transformOrigin={config.numberingIcon.transformOrigin}
          />
        </View>
      );
    }

    if (!currentStationNumber) {
      return null;
    }

    return (
      <NumberingIcon
        shape={currentStationNumber.lineSymbolShape || ''}
        lineColor={numberingColor}
        stationNumber={currentStationNumber.stationNumber || ''}
        threeLetterCode={threeLetterCode}
        allowScaling
        transformOrigin={config.numberingIcon.transformOrigin}
        withDarkTheme={config.numberingIcon.withDarkTheme}
      />
    );
  };

  return (
    <View style={[styles.root, config.rootStyle]}>
      <LinearGradient
        colors={config.gradientColors}
        locations={config.gradientLocations}
        style={[styles.gradientRoot, config.gradientRootExtraStyle]}
      >
        <View style={styles.headerTexts}>
          <TrainTypeBox
            localTypePrefix={config.trainTypeBox.localTypePrefix}
            nextTrainTypeColor={config.trainTypeBox.nextTrainTypeColor}
            darkenColor={config.trainTypeBox.darkenColor}
            fontSizeScale={config.trainTypeBox.fontSizeScale}
            trainType={trainType}
          />
          {selectedBound && !firstStop ? (
            <View style={styles.boundWrapper}>
              <RNAnimated.Text
                style={[
                  animation.boundTopAnimatedStyles,
                  styles.boundTextContainer,
                ]}
              >
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={{
                    color: config.textColor,
                    fontSize: RFValue(14),
                    fontWeight: 'bold',
                  }}
                >
                  {connectedLines?.length && isJapaneseState
                    ? `${connectionText}直通 `
                    : null}
                </Text>
                <Text
                  style={{
                    color: config.textColor,
                    fontWeight: 'bold',
                    fontSize: RFValue(18),
                  }}
                >
                  {boundText}
                </Text>
              </RNAnimated.Text>
              <RNAnimated.Text
                style={[
                  animation.boundBottomAnimatedStyles,
                  styles.boundTextContainer,
                ]}
              >
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={{
                    color: config.textColor,
                    fontSize: RFValue(14),
                    fontWeight: 'bold',
                  }}
                >
                  {connectedLines?.length && animation.prevIsJapaneseState
                    ? `${animation.prevConnectionText}直通 `
                    : null}
                </Text>
                <Text
                  style={{
                    color: config.textColor,
                    fontWeight: 'bold',
                    fontSize: RFValue(18),
                  }}
                >
                  {animation.prevBoundText}
                </Text>
              </RNAnimated.Text>
            </View>
          ) : null}
        </View>
        <View
          style={[styles.bottom, { paddingBottom: config.bottomPaddingBottom }]}
        >
          <View style={[styles.stateWrapper, { width: dim.width * 0.14 }]}>
            <RNAnimated.Text
              style={[
                animation.stateTopAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
                { color: stationNameColor },
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {stateText}
            </RNAnimated.Text>
            <RNAnimated.Text
              style={[
                animation.stateBottomAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
                { color: stationNameColor },
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {animation.prevStateText}
            </RNAnimated.Text>
          </View>

          {renderNumberingIcon()}

          <View
            style={styles.stationNameWrapper}
            onLayout={onStationNameSlotLayout}
          >
            <Text
              style={styles.stationNameMeasurer}
              numberOfLines={1}
              onTextLayout={onTopTextLayout}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {stationText}
            </Text>
            <Text
              style={styles.stationNameMeasurer}
              numberOfLines={1}
              onTextLayout={onBottomTextLayout}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {animation.prevStationText}
            </Text>
            <View
              style={[
                styles.stationNameContainer,
                config.stationNameContainerAlignItems
                  ? { alignItems: config.stationNameContainerAlignItems }
                  : undefined,
                // 文字サイズは縮めず、Text 自体は自然な幅で描画させ、
                // 折返し進入アニメーション（scaleY）と独立した横方向圧縮を
                // ラッパー View 側の transform で行う。
                { transform: [{ scaleX: topStationNameScaleX }] },
              ]}
            >
              <RNAnimated.Text
                numberOfLines={1}
                // scaleX が下限に達してなお収まらない場合の「…」表示を抑止する。
                ellipsizeMode="clip"
                style={[
                  styles.stationName,
                  animation.topNameAnimatedStyles,
                  animation.topNameAnimatedAnchorStyle,
                  {
                    fontSize: STATION_NAME_FONT_SIZE,
                    transformOrigin: 'top',
                    color: stationNameColor,
                  },
                ]}
              >
                {stationText}
              </RNAnimated.Text>
            </View>
            <View
              style={[
                styles.stationNameContainer,
                config.stationNameContainerAlignItems
                  ? { alignItems: config.stationNameContainerAlignItems }
                  : undefined,
                { transform: [{ scaleX: bottomStationNameScaleX }] },
              ]}
            >
              <RNAnimated.Text
                numberOfLines={1}
                ellipsizeMode="clip"
                style={[
                  styles.stationName,
                  animation.bottomNameAnimatedStyles,
                  animation.bottomNameAnimatedAnchorStyle,
                  {
                    fontSize: STATION_NAME_FONT_SIZE,
                    transformOrigin: 'bottom',
                    color: stationNameColor,
                  },
                ]}
              >
                {animation.prevStationText}
              </RNAnimated.Text>
            </View>
          </View>

          {selectedBound && firstStop ? (
            <View
              style={[styles.firstTextWrapper, { width: dim.width * 0.14 }]}
            >
              <RNAnimated.Text
                style={[
                  animation.stateTopAnimatedStylesRight,
                  styles.firstText,
                  { color: stationNameColor },
                ]}
              >
                {stateTextRight}
              </RNAnimated.Text>
              <RNAnimated.Text
                style={[
                  animation.stateBottomAnimatedStylesRight,
                  styles.firstText,
                  { color: stationNameColor },
                ]}
              >
                {animation.prevStateTextRight}
              </RNAnimated.Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
      <View
        style={[
          styles.divider,
          {
            height: config.divider.height,
            backgroundColor: dividerBackgroundColor,
          },
          config.divider.extraStyle,
        ]}
      />
      {config.secondaryDivider ? (
        <View
          style={[
            styles.divider,
            {
              height: config.secondaryDivider.height,
              backgroundColor: config.secondaryDivider.color,
            },
            config.secondaryDivider.extraStyle,
          ]}
        />
      ) : null}
    </View>
  );
};

export default React.memo(HeaderEast);
