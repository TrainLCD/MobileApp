import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  useEstimateArrivalTimes,
  useEstimatedMinutesByStationId,
  useLandscapeWindowDimensions,
  useTransferLines,
} from '~/hooks';
import {
  FONTS,
  LOW_POWER_BASE_HEIGHT,
  LOW_POWER_THEME_COLORS,
  parenthesisRegexp,
} from '../constants';
import { translate } from '../translation';
import type { CommonHeaderProps } from './Header.types';
import Typography from './Typography';

const { background, primary, secondary, muted, accent } =
  LOW_POWER_THEME_COLORS;

/** 乗換路線名を並べる上限。これを超えた分は「他N」に畳む */
const MAX_TRANSFER_LINE_NAMES = 3;

/**
 * 低消費電力テーマ(#3697)のヘッダー。
 *
 * 上段に路線・種別・行先、中段に次駅と到着予測を置く。アニメーションを
 * 一切持たないので、他テーマのような useHeaderAnimation は使わずに
 * 現在の値をそのまま描画する。寸法はすべて設計基準(720x360dp)からの
 * 拡大率で決まるため、Pixel 3 のような低解像度端末でも設計どおりに収まる。
 */
const HeaderLowPower: React.FC<CommonHeaderProps> = ({
  currentStation,
  currentLine,
  nextStation,
  selectedBound,
  headerState,
  stationText,
  stateText,
  boundText,
  currentStationNumber,
  trainType,
  isJapaneseState,
}) => {
  const dim = useLandscapeWindowDimensions();
  const transferLines = useTransferLines();
  const { route: estimatedRoute } = useEstimateArrivalTimes();
  const estimatedMinutesByStationId =
    useEstimatedMinutesByStationId(estimatedRoute);

  /** 設計基準(短辺360dp)に対する実機の拡大率 */
  const scale = dim.height / LOW_POWER_BASE_HEIGHT;

  // 行先未選択時は路線図側に出す情報がないため、ヘッダーの取り分を減らす
  const rootHeight = selectedBound ? (dim.height * 2) / 3 : dim.height / 3;

  const metrics = useMemo(() => {
    const gutter = 16 * scale;
    // 右カラムは基準幅を保ちつつ、4:3 のタブレットで広がりすぎないよう画面幅で頭打ちにする
    const sideColumnWidth = Math.min(dim.width * 0.3, 190 * scale);
    return {
      gutter,
      sideColumnWidth,
      hairline: Math.max(1, scale),
      topBarHeight: 40 * scale,
      nameAreaWidth:
        dim.width - gutter * 4 - Math.max(1, scale) - sideColumnWidth,
    };
  }, [dim.width, scale]);

  const stoppingState = headerState.split('_')[0];

  // ヘッダーが今どの駅を指しているか。ローマ字の併記もこの駅から引く
  const displayedStation =
    stoppingState === 'CURRENT' ? currentStation : nextStation;
  const subStationName = isJapaneseState
    ? displayedStation?.nameRoman
    : displayedStation?.name;

  const nameFontSize = useMemo(() => {
    const length = stationText.length || 1;
    // 全角はおよそ1em、ラテン文字はおよそ0.6em幅として器に収まる最大サイズを選ぶ。
    // 見積もりを超えた分は adjustsFontSizeToFit が縮めて吸収する
    const widthPerChar = isJapaneseState ? 1 : 0.6;
    const fitted = metrics.nameAreaWidth / (length * widthPerChar);
    return Math.max(20 * scale, Math.min(76 * scale, fitted));
  }, [isJapaneseState, metrics.nameAreaWidth, scale, stationText.length]);

  const trainTypeText = isJapaneseState
    ? (trainType?.name ?? translate('local'))
    : (trainType?.nameRoman ?? translate('localEn'));

  const lineText = (
    (isJapaneseState ? currentLine?.nameShort : currentLine?.nameRoman) ?? ''
  ).replace(parenthesisRegexp, '');

  const eta = useMemo(() => {
    const unit = isJapaneseState ? '分' : 'min.';
    if (stoppingState === 'CURRENT') {
      return {
        label: '',
        value: translate(isJapaneseState ? 'stopped' : 'stoppedEn'),
        unit: '',
        emphasized: false,
      };
    }
    if (stoppingState === 'ARRIVING') {
      return {
        label: '',
        value: translate(isJapaneseState ? 'soon' : 'soonEn'),
        unit: '',
        emphasized: false,
      };
    }
    const minutes =
      nextStation?.id != null
        ? estimatedMinutesByStationId.get(nextStation.id)
        : null;
    if (minutes == null) {
      return { label: '', value: '', unit: '', emphasized: false };
    }
    return {
      label: translate(isJapaneseState ? 'arrivingIn' : 'arrivingInEn'),
      value: String(Math.round(minutes)),
      unit,
      emphasized: true,
    };
  }, [
    estimatedMinutesByStationId,
    isJapaneseState,
    nextStation?.id,
    stoppingState,
  ]);

  const transferText = useMemo(() => {
    if (!transferLines.length) {
      return '';
    }
    const names = transferLines
      .slice(0, MAX_TRANSFER_LINE_NAMES)
      .map((line) =>
        ((isJapaneseState ? line.nameShort : line.nameRoman) ?? '').replace(
          parenthesisRegexp,
          ''
        )
      )
      .filter((name) => name.length);
    const rest = transferLines.length - names.length;
    const joined = names.join(isJapaneseState ? '・' : ', ');
    if (!rest) {
      return joined;
    }
    return isJapaneseState ? `${joined} 他${rest}` : `${joined} +${rest}`;
  }, [isJapaneseState, transferLines]);

  return (
    <View style={{ height: rootHeight, backgroundColor: background }}>
      <View
        style={{
          height: metrics.topBarHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10 * scale,
          paddingHorizontal: metrics.gutter,
          borderBottomWidth: metrics.hairline,
          borderBottomColor: muted,
        }}
      >
        <Typography
          numberOfLines={1}
          style={{
            borderWidth: metrics.hairline,
            borderColor: primary,
            color: primary,
            fontSize: 13 * scale,
            lineHeight: 16 * scale,
            fontWeight: 'bold',
            paddingHorizontal: 7 * scale,
            paddingVertical: 4 * scale,
          }}
        >
          {trainTypeText}
        </Typography>
        <Typography
          numberOfLines={1}
          style={{ color: secondary, fontSize: 15 * scale }}
        >
          {lineText}
        </Typography>
        <View style={{ flex: 1 }} />
        <Typography
          numberOfLines={1}
          style={{ color: primary, fontSize: 17 * scale, fontWeight: 'bold' }}
        >
          {boundText}
        </Typography>
      </View>

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          gap: metrics.gutter,
          paddingHorizontal: metrics.gutter,
          paddingVertical: 14 * scale,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', gap: 8 * scale }}>
          {stateText.length ? (
            <Typography
              numberOfLines={1}
              style={{
                color: accent,
                fontSize: 26 * scale,
                lineHeight: 30 * scale,
                fontWeight: 'bold',
                letterSpacing: 3 * scale,
              }}
            >
              {stateText.replaceAll('\n', ' ')}
            </Typography>
          ) : null}

          <Typography
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{
              color: primary,
              fontSize: nameFontSize,
              lineHeight: nameFontSize * 1.04,
              fontWeight: 'bold',
            }}
          >
            {stationText}
          </Typography>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10 * scale,
            }}
          >
            {currentStationNumber?.stationNumber ? (
              <Typography
                style={{
                  borderWidth: metrics.hairline,
                  borderColor: secondary,
                  color: secondary,
                  fontFamily: FONTS.RobotoBold,
                  fontSize: 15 * scale,
                  lineHeight: 18 * scale,
                  paddingHorizontal: 6 * scale,
                  paddingVertical: 3 * scale,
                }}
              >
                {currentStationNumber.stationNumber}
              </Typography>
            ) : null}
            {subStationName ? (
              <Typography
                numberOfLines={1}
                style={{ flex: 1, color: secondary, fontSize: 19 * scale }}
              >
                {subStationName}
              </Typography>
            ) : null}
          </View>
        </View>

        <View
          style={{ width: metrics.hairline, backgroundColor: muted }}
          testID="low-power-header-divider"
        />

        <View
          style={{
            width: metrics.sideColumnWidth,
            justifyContent: 'center',
            gap: 12 * scale,
          }}
        >
          {eta.value.length ? (
            <View style={{ gap: 2 * scale }}>
              {eta.label.length ? (
                <Typography
                  numberOfLines={1}
                  style={{ color: secondary, fontSize: 13 * scale }}
                >
                  {eta.label}
                </Typography>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 6 * scale,
                }}
              >
                <Typography
                  numberOfLines={1}
                  style={{
                    color: primary,
                    fontFamily: eta.emphasized ? FONTS.RobotoBold : undefined,
                    fontSize: (eta.emphasized ? 64 : 30) * scale,
                    lineHeight: (eta.emphasized ? 64 : 34) * scale,
                    fontWeight: 'bold',
                  }}
                >
                  {eta.value}
                </Typography>
                {eta.unit.length ? (
                  <Typography
                    style={{ color: secondary, fontSize: 19 * scale }}
                  >
                    {eta.unit}
                  </Typography>
                ) : null}
              </View>
            </View>
          ) : null}

          {transferText.length ? (
            <View style={{ gap: 3 * scale }}>
              <View
                style={{ height: metrics.hairline, backgroundColor: muted }}
              />
              <Typography style={{ color: secondary, fontSize: 12 * scale }}>
                {translate(
                  isJapaneseState ? 'transferShort' : 'transferShortEn'
                )}
              </Typography>
              <Typography
                numberOfLines={2}
                style={{
                  color: primary,
                  fontSize: 15 * scale,
                  lineHeight: 19 * scale,
                  fontWeight: 'bold',
                }}
              >
                {transferText}
              </Typography>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default React.memo(HeaderLowPower);
