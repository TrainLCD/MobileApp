import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  useEstimateArrivalTimes,
  useEstimatedMinutesByStationId,
  useLowPowerLayout,
  useTransferLines,
} from '~/hooks';
import { FONTS, LOW_POWER_THEME_COLORS, parenthesisRegexp } from '../constants';
import { translate } from '../translation';
import type { CommonHeaderProps } from './Header.types';
import Typography from './Typography';

const { background, primary, secondary, muted, accent } =
  LOW_POWER_THEME_COLORS;

/** 乗換路線名に割ける行数。ヘッダー右カラムの取り分がこれで決まる */
const TRANSFER_TEXT_LINES = 2;
/** 乗換路線名のフォントサイズ(拡大率を掛ける前)。表示と文字数見積もりで共有する */
const TRANSFER_TEXT_FONT_SIZE = 15;

/**
 * 全角1文字ぶんを1カラムとして数える。ASCII は半角なので 0.5 で見積もる。
 * 行送りを実測せずに「何件まで並べられるか」を決めるための近似で、
 * 日本語は任意位置で折り返せるため合計カラム数がそのまま行数の目安になる。
 */
const measureColumns = (text: string): number => {
  let columns = 0;
  for (const char of text) {
    columns += (char.codePointAt(0) ?? 0) < 0x100 ? 0.5 : 1;
  }
  return columns;
};

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
  // 寸法はセーフエリアを除いた実効領域から起こす。ノッチやホームインジケータへ
  // 文字が潜り込まないよう、外周の余白として insets をそのまま足し込む
  const { width, height, scale, insets } = useLowPowerLayout();
  const transferLines = useTransferLines();
  const { route: estimatedRoute } = useEstimateArrivalTimes();
  const estimatedMinutesByStationId =
    useEstimatedMinutesByStationId(estimatedRoute);

  // 行先未選択時は路線図側に出す情報がないため、ヘッダーの取り分を減らす
  const rootHeight =
    insets.top + (selectedBound ? (height * 2) / 3 : height / 3);

  const metrics = useMemo(() => {
    const gutter = 16 * scale;
    // 右カラムは基準幅を保ちつつ、4:3 のタブレットで広がりすぎないよう画面幅で頭打ちにする
    const sideColumnWidth = Math.min(width * 0.3, 190 * scale);
    return {
      gutter,
      sideColumnWidth,
      hairline: Math.max(1, scale),
      topBarHeight: 40 * scale,
      nameAreaWidth: width - gutter * 4 - Math.max(1, scale) - sideColumnWidth,
    };
  }, [width, scale]);

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
      .map((line) =>
        ((isJapaneseState ? line.nameShort : line.nameRoman) ?? '').replace(
          parenthesisRegexp,
          ''
        )
      )
      .filter((name) => name.length);
    if (!names.length) {
      return '';
    }

    const separator = isJapaneseState ? '・' : ', ';
    const buildText = (count: number) => {
      const joined = names.slice(0, count).join(separator);
      const rest = names.length - count;
      if (!rest) {
        return joined;
      }
      return isJapaneseState ? `${joined} 他${rest}線` : `${joined} +${rest}`;
    };

    // 並べる件数は固定せず、右カラム2行に収まる文字数から決める。あふれた分は
    // 必ず「他N線」へ畳まれるので、末尾が三点リーダーで切れることがない
    const budget =
      (metrics.sideColumnWidth / (TRANSFER_TEXT_FONT_SIZE * scale)) *
      TRANSFER_TEXT_LINES;
    for (let count = names.length; count > 1; count--) {
      const text = buildText(count);
      if (measureColumns(text) <= budget) {
        return text;
      }
    }
    // 1件でも溢れる駅はこれ以上畳みようがないので、そのまま返して省略に委ねる
    return buildText(1);
  }, [isJapaneseState, metrics.sideColumnWidth, scale, transferLines]);

  return (
    <View
      testID="low-power-header-root"
      style={{
        height: rootHeight,
        paddingTop: insets.top,
        backgroundColor: background,
      }}
    >
      <View
        testID="low-power-header-top-bar"
        style={{
          height: metrics.topBarHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10 * scale,
          paddingLeft: metrics.gutter + insets.left,
          paddingRight: metrics.gutter + insets.right,
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
          paddingLeft: metrics.gutter + insets.left,
          paddingRight: metrics.gutter + insets.right,
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
                numberOfLines={TRANSFER_TEXT_LINES}
                style={{
                  color: primary,
                  fontSize: TRANSFER_TEXT_FONT_SIZE * scale,
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
