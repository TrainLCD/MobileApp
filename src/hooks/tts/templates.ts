import { APP_THEME, type AppTheme } from '../../models/Theme';
import { compile, type TemplateRenderer } from './templateEngine';

/** 複数行文字列を結合して compile に渡す。空白を一切挿入しないので、テンプレ内の空白は自前で書く。 */
const t = (...parts: string[]): TemplateRenderer => compile(parts.join(''));

type ThemeTemplate = { NEXT: TemplateRenderer; ARRIVING: TemplateRenderer };

// 文言の出典: 東京メトロ銀座線 車内自動放送 (現行)。
// - 始発挨拶は会社名 (「東京メトロをご利用くださいまして」) で行うのが公式。
// - 到着前放送は乗換案内を含まない (乗換案内は発車後放送のみ)。
// - 終点到着前は忘れ物注意と御礼が入る。
// - 他社線直通の境界駅では直通先の列車案内と御礼を放送する。
const TOKYO_METRO: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    '{currentLineCompanyJa}をご利用くださいまして、ありがとうございます。',
    '{vehicleJa}は{#if hasConnectedLines}{connectedLinesListJa}直通、{/if}',
    '{#if hasTrainType}{trainTypeJa}、{/if}{boundForJa}ゆきです。',
    '{/if}',
    '次は{nextStationJa}{#if isNextStopTerminus}、終点{/if}です。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    '{#if shouldAnnounceAfterNextStop}',
    '{nextStationJa}の次は{#if isAfterNextStopTerminus}、終点{/if}、{afterNextStationJa}にとまります。',
    '{/if}',
    '{#if hasBetweenStations}{betweenStationsListJa}へおいでのお客様はお乗り換えです。{/if}',
    '{#if isNextStopThroughBoundary}',
    '{vehicleJa}は、{nextLineJa}直通、{#if hasTrainType}{trainTypeJa}、{/if}{boundForJa}ゆきです。',
    '{/if}'
  ),
  ARRIVING: t(
    'まもなく{nextStationJa}{#if isNextStopTerminus}、終点{/if}です。',
    '{#if isNextStopTerminus}お忘れ物なさいませんよう、ご注意ください。{currentLineCompanyJa}をご利用くださいまして、ありがとうございました。{/if}',
    '{#if isNextStopThroughBoundary}{currentLineCompanyJa}をご利用くださいまして、ありがとうございました。{/if}'
  ),
};

// 文言の出典: 東急東横線 (w0s.jp 東急電車資料室)・東急多摩川線 (現行) 車内自動放送。
// - 駅名は「次は◯◯、◯◯です」と2回読みが公式 (終点時は「次は◯◯、終点です」)。
// - 乗換案内は「◯◯線ご利用のお客様はお乗り換えです」(「を」は入らない)。
// - 他社線直通の境界駅では「この電車は◯◯線直通、…ゆきです。」+ 自社線への御礼を放送する。
const TY: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    '本日も{currentLineJa}をご利用くださいまして、ありがとうございます。',
    '{vehicleJa}は{#if hasConnectedLines}{connectedLinesListJa}直通、{/if}',
    '{#if hasTrainType}{trainTypeJa}{/if}{boundForJa}ゆきです。',
    '{/if}',
    '次は{nextStationJa}、{#if isNextStopTerminus}終点{:else}{nextStationJa}{/if}です。',
    '{#if hasTransferLines}{transferLinesListJa}ご利用のお客様はお乗り換えです。{/if}',
    '{#if isNextStopThroughBoundary}',
    '{vehicleJa}は{nextLineJa}直通、{#if hasTrainType}{trainTypeJa}{/if}{boundForJa}ゆきです。',
    '{currentLineJa}をご利用くださいまして、ありがとうございました。',
    '{/if}'
  ),
  ARRIVING: t(
    'まもなく{nextStationJa}{#if isNextStopTerminus}、終点{/if}です。',
    '{#if hasTransferLines}{transferLinesListJa}ご利用のお客様はお乗り換えです。{/if}',
    '{#if isNextStopTerminus}本日も{currentLineJa}をご利用くださいまして、ありがとうございました。{/if}',
    '{#if isNextStopThroughBoundary}',
    '{vehicleJa}は{nextLineJa}直通、{#if hasTrainType}{trainTypeJa}{/if}{boundForJa}ゆきです。',
    '{currentLineJa}をご利用くださいまして、ありがとうございました。',
    '{/if}'
  ),
};

// 文言の出典: JR東日本 通勤型車両 (E233系/E235系) 自動放送 (ydn.jp・山手線書き起こし)。
// - 始発時は挨拶なしで列車案内のみ (「この電車は、◯◯線、◯◯ゆきです。」) が公式。
//   御礼は終点到着前のみ (「今日も、JR東日本をご利用くださいまして、ありがとうございました。」)。
// - 通過駅がある場合は「◯◯へおいでのお客様と、◯◯線は、お乗り換えです。」と
//   「◯◯の次は、◯◯に止まります。」(到着前) が入る。
// - YAMANOTE / SAIKYO 共通形。JO / JL / E231 テーマもこのテンプレートを流用する。
const JR_EAST: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}{vehicleJa}は、{jrEastTrainDescJa}、{boundForJa}ゆきです。{/if}',
    '次は、{#if isNextStopTerminus}終点、{/if}{nextStationJa}、{nextStationJa}。',
    '{#if hasTransferLines}',
    '{#if hasBetweenStations}{betweenStationsListJa}へおいでのお客様と、{/if}',
    '{transferLinesListJa}は、お乗り換えです。',
    '{:else}',
    '{#if hasBetweenStations}{betweenStationsListJa}へおいでのお客様は、お乗り換えです。{/if}',
    '{/if}'
  ),
  ARRIVING: t(
    'まもなく、{#if isNextStopTerminus}終点、{/if}{nextStationJa}、{nextStationJa}。',
    '{#if hasTransferLines}',
    '{#if hasBetweenStations}{betweenStationsListJa}へおいでのお客様と、{/if}',
    '{transferLinesListJa}は、お乗り換えです。',
    '{:else}',
    '{#if hasBetweenStations}{betweenStationsListJa}へおいでのお客様は、お乗り換えです。{/if}',
    '{/if}',
    '{#if shouldAnnounceAfterNextStop}{nextStationJa}の次は、{#if isAfterNextStopTerminus}終点、{/if}{afterNextStationJa}に止まります。{/if}',
    '{#if isNextStopTerminus}今日も、{currentLineCompanyJa}をご利用くださいまして、ありがとうございました。{/if}'
  ),
};

// 文言の出典: JR西日本 近郊型車両 (223系/225系) 自動放送 (みやこ路快速書き起こし)。
// - 乗換案内は到着前放送のみ (発車後の次駅案内には含まれない)。
// - 終点到着前は「ご乗車ありがとうございました。まもなく終点・◯◯、◯◯です。…
//   今日もJR西日本をご利用くださいまして、ありがとうございました。◯◯、◯◯です。」の構成。
const JR_WEST: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    '今日も{currentLineCompanyJa}をご利用くださいまして、ありがとうございます。',
    '{vehicleJa}は{#if hasTrainType}{trainTypeJaPlain}、{/if}',
    '{#if hasViaStation}{viaStationJa}方面、{/if}',
    '{boundForJa}ゆきです。',
    '{/if}',
    '{#if shouldAnnounceJrWestStopList}',
    '{jrWestStopsListJa}の順にとまります。',
    '{#if lastAnnouncedStopIsBound}{:else}{lastAnnouncedStopJa}から先は、後ほどご案内いたします。{/if}',
    '{/if}',
    '次は{#if nextStationIsBound}終点・{/if}{nextStationJa}、{nextStationJa}です。',
    '{#if shouldAnnounceAfterNextStop}{nextStationJa}を出ますと、次は{afterNextStationJa}にとまります。{/if}'
  ),
  ARRIVING: t(
    '{#if nextStationIsBound}',
    'ご乗車ありがとうございました。まもなく終点・{nextStationJa}、{nextStationJa}です。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    '今日も{currentLineCompanyJa}をご利用くださいまして、ありがとうございました。',
    '{nextStationJa}、{nextStationJa}です。',
    '{:else}',
    'まもなく{nextStationJa}、{nextStationJa}です。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    '{#if shouldAnnounceAfterNextStop}{nextStationJa}を出ますと、次は{afterNextStationJa}にとまります。{/if}',
    '{/if}'
  ),
};

// 文言の出典: 東京都交通局「新宿線10-300形車両 自動放送内容リスト」(公式PDF)。
// - 駅名は「次は、◯◯、◯◯です」と2回読み。乗換案内は「◯◯は、お乗り換えです。」。
// - 列車案内 (「この電車は、各駅停車、◯◯行きです。」) は始発時のみ。
// - 終点の一駅手前では「(会社名)をご利用くださいまして、ありがとうございました。…
//   この電車は、◯◯止まりです。お忘れ物のないよう、ご注意ください。」。
// - 他社線直通の境界駅では御礼の後に「この電車は、◯◯線直通、…行きです。」を放送する。
// - 通過駅の案内は「◯◯の次は、◯◯にとまります。」「通過する、◯◯においでの方は、
//   お乗り換えです。」(到着前放送のみ)。
const TOEI: ThemeTemplate = {
  NEXT: t(
    '{#if isNextStopTerminus}{currentLineCompanyJa}をご利用くださいまして、ありがとうございました。{/if}',
    '{#if isNextStopThroughBoundary}{currentLineCompanyJa}をご利用くださいまして、ありがとうございました。{/if}',
    '{#if firstSpeech}',
    '{currentLineJa}をご利用くださいまして、ありがとうございます。',
    '{vehicleJa}は、{#if hasTrainType}{trainTypeJa}、{/if}{boundForJa}行きです。',
    '{/if}',
    '次は、{nextStationJa}、{nextStationJa}です。',
    '{#if hasTransferLines}{transferLinesListJa}は、お乗り換えです。{/if}',
    '{#if isNextStopTerminus}{vehicleJa}は、{nextStationJa}止まりです。お忘れ物のないよう、ご注意ください。{/if}',
    '{#if isNextStopThroughBoundary}',
    '{vehicleJa}は、{nextLineJa}直通、{#if hasTrainType}{trainTypeJa}、{/if}{boundForJa}行きです。',
    '{/if}'
  ),
  ARRIVING: t(
    'まもなく、{nextStationJa}、{nextStationJa}です。',
    '{#if shouldAnnounceAfterNextStop}{nextStationJa}の次は、{#if isAfterNextStopTerminus}終点、{/if}{afterNextStationJa}にとまります。{/if}',
    '{#if hasBetweenStations}通過する、{betweenStationsListJa}においでの方は、お乗り換えです。{/if}',
    '{#if isNextStopTerminus}{vehicleJa}は、{nextStationJa}止まりです。お忘れ物のないよう、ご注意ください。{/if}'
  ),
};

const JR_KYUSHU: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}{vehicleJa}は{#if hasTrainType}{trainTypeJaKyushu}、{/if}{boundForJa}行きです。{/if}',
    '次は{#if nextStationIsBound}終点、{/if}{nextStationJa}、{nextStationJa}。',
    '{#if hasTransferLines}{nextStationJa}では、{transferLinesListJa}にお乗り換えいただけます。{/if}'
  ),
  ARRIVING: t(
    'まもなく、{#if nextStationIsBound}終点、{/if}{nextStationJa}、{nextStationJa}。',
    '{#if hasTransferLines}{transferLinesListJa}にお乗り換えいただけます。{/if}',
    '{#if nextStationIsBound}{currentLineShortJa}をご利用くださいまして、ありがとうございました。{/if}'
  ),
};

const TOKYO_METRO_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    'Thank you for using the {currentLineCompanyEn}. ',
    'This {vehicleEn} is bound for {boundForEn}. ',
    '{/if}',
    'The next stop is {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}{#if isNextStopTerminus}, the last stop{/if}.',
    '{#if hasTransferLines} Please change here for {transferLinesEnList}.{/if}'
  ),
  ARRIVING: t(
    'Arriving at {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}{#if isNextStopTerminus}, the last stop{/if}.'
  ),
};

const TY_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    'Thank you for using the {currentLineThanksEn}. ',
    '{#if hasConnectedLines}This {vehicleEn} will merge and continue traveling {connectedLineEnPhrase} to {boundForEn}. ',
    '{:else}This {vehicleEn} is bound for {boundForEn}. {/if}',
    '{/if}',
    'The next {placeEn} is {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}{#if isNextStopTerminus}, this is the last stop of this line{/if}.',
    '{#if hasTransferLines} Passengers changing to {transferLinesEnList}, please transfer at this station.{/if}',
    '{#if isNextStopThroughBoundary} This {vehicleEn} will merge and continue traveling on the {nextLineEn} to {boundForEn}. Thank you for using the {currentLineThanksEn}.{/if}'
  ),
  ARRIVING: t(
    '{#if isNextStopTerminus}',
    'We will soon be arriving at {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}.',
    '{#if hasTransferLines} Passengers changing to {transferLinesEnList}, please transfer at this station.{/if}',
    ' Thank you for using the {currentLineThanksEn}.',
    '{:else}',
    'We will soon make a brief stop at {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}.',
    '{#if hasTransferLines} Passengers changing to {transferLinesEnList}, please transfer at this station.{/if}',
    '{#if isNextStopThroughBoundary} This {vehicleEn} will merge and continue traveling on the {nextLineEn} to {boundForEn}. Thank you for using the {currentLineThanksEn}.{/if}',
    '{/if}'
  ),
};

const JR_EAST_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}This is the {jrEastTrainDescEn} {vehicleEn} bound for {boundForEn}. {/if}',
    'The next {placeEn} is {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}{#if isNextStopTerminus} terminal{/if}.',
    '{#if hasTransferLines} Please change here for {transferLinesEnList}.{/if}'
  ),
  ARRIVING: t(
    'The next {placeEn} is {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}{#if isNextStopTerminus} terminal{/if}.',
    '{#if hasTransferLines} Please change here for {transferLinesEnList}.{/if}',
    '{#if shouldAnnounceAfterNextStop} The stop after {nextStationEn} will be {afterNextStationEn}.{/if}',
    '{#if isNextStopTerminus} Thank you for traveling with us. And we look forward to serving you again.{/if}'
  ),
};

const JR_WEST_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    'Thank you for using {currentLineCompanyEn}. ',
    '{#if hasTrainType}This is the {trainTypeEn} Service{:else}This {vehicleEn} is{/if} bound for {boundForEn}',
    '{#if hasViaStation} via {viaStationEn}{/if}. ',
    '{/if}',
    '{#if shouldAnnounceJrWestStopList}',
    'We will be stopping at {jrWestStopsListEn}. ',
    '{#if lastAnnouncedStopIsBound}{:else}Stops after {lastAnnouncedStopEn} will be announced later. {/if}',
    '{/if}',
    'The next stop is {nextStationEn}{#if hasNextStationNumberLineSymbol}, station number {nextStationNumberTextNoPeriod}{/if}{#if nextStationIsBound}, the final stop{/if}.',
    '{#if shouldAnnounceAfterNextStop} After leaving {nextStationEn}, we will be stopping at {afterNextStationEn}.{/if}'
  ),
  ARRIVING: t(
    '{#if nextStationIsBound}',
    'Thank you for riding with us. We will soon be arriving at {nextStationEn}{#if hasNextStationNumberLineSymbol}, station number {nextStationNumberTextNoPeriod}{/if}.',
    '{#if hasTransferLines} Transfer here for {transferLinesEnList}.{/if}',
    ' Thank you for using {currentLineCompanyEn}. {nextStationEn}, {nextStationEn}. This is the final stop.',
    '{:else}',
    'We will soon be making a brief stop at {nextStationEn}{#if hasNextStationNumberLineSymbol}, station number {nextStationNumberTextNoPeriod}{/if}.',
    '{#if hasTransferLines} Transfer here for {transferLinesEnList}.{/if}',
    '{#if shouldAnnounceAfterNextStop} After leaving {nextStationEn}, we will be stopping at {afterNextStationEn}.{/if}',
    '{/if}'
  ),
};

const TOEI_EN: ThemeTemplate = {
  NEXT: t(
    '{#if isNextStopTerminus}Thank you for using the {currentLineThanksEn}. {/if}',
    '{#if isNextStopThroughBoundary}Thank you for using the {currentLineThanksEn}. {/if}',
    '{#if firstSpeech}',
    'Thank you for using the {currentLineThanksEn}. ',
    '{#if hasTrainType}This is the {trainTypeEn} {vehicleEn} bound for {boundForEn}. {:else}This {vehicleEn} is bound for {boundForEn}. {/if}',
    '{/if}',
    'The next {placeEn} is {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}{#if isNextStopTerminus}, the final stop on this line{/if}.',
    '{#if hasTransferLines} Please change here for {transferLinesEnList}.{/if}',
    '{#if isNextStopThroughBoundary} This is the {trainTypeEn} {vehicleEn} bound for {boundForEn}.{/if}'
  ),
  ARRIVING: t(
    'We will soon be arriving at {nextStationEn}{#if hasNextStationNumberText} {nextStationNumberTextNoPeriod}{/if}{#if isNextStopTerminus}, the final stop on this line{/if}.',
    '{#if shouldAnnounceAfterNextStop} The stop after {nextStationEn} will be {afterNextStationEn}.{/if}'
  ),
};

const JR_KYUSHU_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}{#if hasTrainType}This is a {trainTypeEn} {vehicleEn}{:else}This {vehicleEn} is{/if} bound for {boundForEn}.{/if} ',
    'The next {placeEn} is {nextStationEn} {nextStationNumberText}',
    '{#if nextStationIsBound} terminal{/if}. ',
    '{#if hasTransferLines}You can transfer to {transferLinesEnList} at {nextStationEn}.{/if}'
  ),
  ARRIVING: t(
    'We will soon be arriving at {nextStationEn}',
    '{#if nextStationIsBound} terminal{/if} {nextStationNumberText}. ',
    '{#if hasTransferLines}',
    'You can transfer to {transferLinesEnList} at {nextStationEn}. ',
    '{#if nextStationIsBound}Thank you for using the {currentLineThanksEn}.{/if}',
    '{/if}'
  ),
};

const EMPTY_RENDERER: TemplateRenderer = () => '';
const EMPTY_THEME: ThemeTemplate = {
  NEXT: EMPTY_RENDERER,
  ARRIVING: EMPTY_RENDERER,
};

export const JA_TEMPLATES: Record<AppTheme, ThemeTemplate> = {
  [APP_THEME.TOKYO_METRO]: TOKYO_METRO,
  [APP_THEME.TY]: TY,
  [APP_THEME.YAMANOTE]: JR_EAST,
  [APP_THEME.JR_WEST]: JR_WEST,
  [APP_THEME.SAIKYO]: JR_EAST,
  [APP_THEME.TOEI]: TOEI,
  [APP_THEME.JR_KYUSHU]: JR_KYUSHU,
  [APP_THEME.LED]: EMPTY_THEME,
  [APP_THEME.JO]: EMPTY_THEME,
  [APP_THEME.JL]: EMPTY_THEME,
  [APP_THEME.ODAKYU]: EMPTY_THEME,
  [APP_THEME.E231]: EMPTY_THEME,
};

export const EN_TEMPLATES: Record<AppTheme, ThemeTemplate> = {
  [APP_THEME.TOKYO_METRO]: TOKYO_METRO_EN,
  [APP_THEME.TY]: TY_EN,
  [APP_THEME.YAMANOTE]: JR_EAST_EN,
  [APP_THEME.JR_WEST]: JR_WEST_EN,
  [APP_THEME.SAIKYO]: JR_EAST_EN,
  [APP_THEME.TOEI]: TOEI_EN,
  [APP_THEME.JR_KYUSHU]: JR_KYUSHU_EN,
  [APP_THEME.LED]: EMPTY_THEME,
  [APP_THEME.JO]: EMPTY_THEME,
  [APP_THEME.JL]: EMPTY_THEME,
  [APP_THEME.ODAKYU]: EMPTY_THEME,
  [APP_THEME.E231]: EMPTY_THEME,
};
