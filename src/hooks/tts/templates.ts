import { APP_THEME, type AppTheme } from '../../models/Theme';
import { compile, type TemplateRenderer } from './templateEngine';

/** 複数行文字列を結合して compile に渡す。空白を一切挿入しないので、テンプレ内の空白は自前で書く。 */
const t = (...parts: string[]): TemplateRenderer => compile(parts.join(''));

type ThemeTemplate = { NEXT: TemplateRenderer; ARRIVING: TemplateRenderer };

const TOKYO_METRO: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    '{currentLineJa}をご利用くださいまして、ありがとうございます。',
    '次は、{nextStationJa}{#if isNextStopTerminus}、終点{/if}です。',
    'この電車は、',
    '{#if hasConnectedLines}{connectedLinesListJa}直通、{/if}',
    '{trainTypeJa}、{boundForJa}ゆきです。',
    '{#if hasTrainTypeAndAfterNext}',
    '{nextStationJa}の次は、',
    '{#if isAfterNextStopTerminus}終点、{/if}',
    '{afterNextStationJa}に停まります。',
    '{/if}',
    '{#if hasBetweenStations}{betweenStationsListJa}へおいでのお客様はお乗り換えです。{/if}',
    '{:else}',
    '次は、{nextStationJa}{#if isNextStopTerminus}、終点{/if}です。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    '{#if hasTrainTypeAndAfterNext}',
    '{nextStationJa}の次は、',
    '{#if isAfterNextStopTerminus}終点、{/if}',
    '{afterNextStationJa}に停まります。',
    '{/if}',
    '{#if hasBetweenStations}{betweenStationsListJa}へおいでのお客様はお乗り換えです。{/if}',
    '{/if}'
  ),
  ARRIVING: t(
    'まもなく、{nextStationJa}{#if isNextStopTerminus}終点{/if}です。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    '{#if isNextStopTerminus}{currentLineCompanyJa}をご利用くださいまして、ありがとうございました。{/if}'
  ),
};

const TY: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    '{currentLineJa}をご利用くださいまして、ありがとうございます。',
    'この電車は',
    '{#if hasConnectedLines}{connectedLinesListJa}直通、{/if}',
    '{trainTypeJa}、{boundForJa}ゆきです。',
    '{/if}',
    '次は、{nextStationJa}{#if isNextStopTerminus}、終点{/if}です。',
    '{#if hasTransferLines}{transferLinesListJa}をご利用のお客様はお乗り換えです。{/if}'
  ),
  ARRIVING: t(
    'まもなく、{nextStationJa}{#if isNextStopTerminus}、終点{/if}です。',
    '{#if hasTransferLines}{transferLinesListJa}をご利用のお客様はお乗り換えです。{/if}',
    '{#if hasAfterNextStation}',
    '{nextStationJa}を出ますと、',
    '{#if isAfterNextStopTerminus}終点、{/if}',
    '{afterNextStationJa}に停まります。',
    '{/if}',
    '{#if isNextStopTerminus} {currentLineJa}をご利用くださいまして、ありがとうございました。{/if}'
  ),
};

const YAMANOTE: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}今日も、{currentLineCompanyShortJa}をご利用くださいまして、ありがとうございます。この電車は、{boundForJa}ゆきです。{/if}',
    '次は、{nextStationJa}、{nextStationJa}{#if isNextStopTerminus}、終点です{/if}。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}'
  ),
  ARRIVING: t(
    'まもなく、{#if isNextStopTerminus}終点、{/if}{nextStationJa}、{nextStationJa}。',
    '{#if hasTransferLines}{transferLinesListJa}は、お乗り換えです。{/if}',
    '{#if isNextStopTerminus}{currentLineCompanyShortJa}をご利用くださいまして、ありがとうございました。{/if}'
  ),
};

const SAIKYO: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}今日も、{currentLineCompanyShortJa}をご利用くださいまして、ありがとうございます。この電車は、{boundForJa}ゆきです。{/if}',
    '次は、{#if isNextStopTerminus}終点、{/if}{nextStationJa}、{nextStationJa}。',
    '{#if hasTransferLines}{transferLinesListJa}は、お乗り換えです。{/if}'
  ),
  ARRIVING: t(
    'まもなく、{#if isNextStopTerminus}終点、{/if}{nextStationJa}、{nextStationJa}。',
    '{#if hasTransferLines}{transferLinesListJa}は、お乗り換えです。{/if}',
    '{#if isNextStopTerminus}{currentLineCompanyShortJa}をご利用くださいまして、ありがとうございました。{/if}'
  ),
};

const JR_WEST: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    '今日も、{currentLineCompanyShortJa}をご利用くださいまして、ありがとうございます。',
    'この電車は、{trainTypeJaPlain}、',
    '{#if hasViaStation}{viaStationJa}方面、{/if}',
    '{boundForJa}ゆきです。',
    '{/if}',
    '{#if shouldAnnounceJrWestStopList}',
    '{jrWestStopsListJa}の順に停まります。',
    '{#if lastAnnouncedStopIsBound}{:else}{lastAnnouncedStopJa}から先は、後ほどご案内いたします。{/if}',
    '{/if}',
    '次は、{#if nextStationIsBound}終点、{/if}{nextStationJa}、{nextStationJa}です。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}'
  ),
  ARRIVING: t(
    '{#if isNextStopTerminus}',
    '終点、{nextStationJa}です。',
    'ご乗車ありがとうございました。',
    'まもなく{nextStationJa}、{nextStationJa}です。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    '今日も{currentLineCompanyShortJa}をご利用くださいまして、ありがとうございました。',
    '{nextStationJa}、{nextStationJa}です。',
    '{:else}',
    'まもなく、{nextStationJa}、{nextStationJa}です。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    '{#if hasAfterNextStation}{nextStationJa}を出ますと、次は、{afterNextStationJa}に停まります。{/if}',
    '{/if}'
  ),
};

const TOEI: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}{currentLineJa}をご利用くださいまして、ありがとうございます。{/if}',
    '次は、{nextStationJa}、{nextStationJa}{#if isNextStopTerminus}、終点です{/if}。 ',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    'この電車は、',
    '{#if hasConnectedLines}{connectedLinesListJa}直通、{/if}',
    '{trainTypeJa}、{boundForJa}ゆきです。',
    '{#if hasTrainTypeAndAfterNext}',
    '{nextStationJa}の次は、',
    '{#if isAfterNextStopTerminus}終点、{/if}',
    '{afterNextStationJa}に停まります。',
    '{/if}',
    '{#if hasBetweenStations}通過する、{betweenStationsListJa}へおいでの方はお乗り換えです。{/if}'
  ),
  ARRIVING: t(
    'まもなく、{#if isNextStopTerminus}終点、{/if}{nextStationJa}、{nextStationJa}。',
    '{#if hasTransferLines}{transferLinesListJa}はお乗り換えです。{/if}',
    '{#if hasTrainTypeAndAfterNext}',
    '{nextStationJa}の次は、',
    '{#if isAfterNextStopTerminus}終点、{/if}',
    '{afterNextStationJa}に停まります。',
    '{/if}',
    '{#if hasBetweenStations}通過する、{betweenStationsListJa}へおいでの方はお乗り換えです。{/if}',
    '{#if isNextStopTerminus} {currentLineJa}をご利用くださいまして、ありがとうございました。{/if}'
  ),
};

const JR_KYUSHU: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}この列車は{trainTypeJaKyushu}、{boundForJa}行きです。{/if}',
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
    'The next stop is {nextStationEn}',
    '{#if hasNextStationNumberText} {nextStationNumberText}{:else}.{/if}',
    '{#if isNextStopTerminus} The last stop.{/if}',
    '{#if hasTransferLines} Please change here for {transferLinesEnList}.{/if}',
    '{#if firstSpeech}',
    ' This train is the ',
    '{#if yamanoteTrainTypeEn}{yamanoteTrainTypeEn} train',
    '{:else}{currentTrainTypeOrLocalEn} Service on the {currentLineEn}{/if}',
    ' bound for {boundForEn}. ',
    '{#if hasTrainTypeAndAfterNext}',
    'The next stop after {nextStationEn}, is {afterNextStationEn}',
    '{#if isAfterNextStopTerminus} terminal{/if}.',
    '{/if}',
    '{#if hasBetweenStations} For stations in between, Please change trains at the next stop.{/if}',
    '{/if}'
  ),
  ARRIVING: t(
    'Arriving at {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, the last stop.{/if} ',
    '{#if hasTransferLines}Please change here for {transferLinesEnList}{/if}. ',
    '{#if isNextStopTerminus}Thank you for using the {currentLineEn}.{/if}'
  ),
};

const TY_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    'Thank you for using the {currentLineEn}. ',
    'This is the {trainTypeEn} train ',
    '{connectedLineEnPhrase}',
    ' to {boundForEn}. ',
    '{/if}',
    'The next station is {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, the last stop{/if} ',
    '{#if hasTransferLines}Passengers changing to {transferLinesEnList}, Please transfer at this station.{/if}'
  ),
  ARRIVING: t(
    'We will soon make a brief stop at {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, the last stop{/if}',
    '{#if hasTransferLines} Passengers changing to {transferLinesEnList}, Please transfer at this station.{/if}',
    '{#if hasTrainTypeAndAfterNext} The stop after {nextStationEn}, will be {afterNextStationEn}{#if isAfterNextStopTerminus} the last stop{/if}.{/if}',
    '{#if isNextStopTerminus} Thank you for using the {currentLineEn}.{/if}'
  ),
};

const YAMANOTE_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}This is the {currentLineEn} train bound for {boundForEn}. {/if}',
    'The next station is {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, terminal.{/if} ',
    '{#if hasTransferLines}Please change here for {transferLinesEnList}.{/if}'
  ),
  ARRIVING: t(
    'The next station is {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, terminal.{/if} ',
    '{#if hasTransferLines}Please change here for {transferLinesEnList}{/if}. ',
    '{#if isNextStopTerminus}Thank you for traveling with us, and look forward to serving you again.{/if}'
  ),
};

const SAIKYO_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}This is the {currentLineEn} train bound for {boundForEn}. {/if}',
    'The next station is {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, terminal{/if} ',
    '{#if hasTransferLines}Please change here for {transferLinesEnList}.{/if}'
  ),
  ARRIVING: t(
    'The next station is {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, terminal.{/if} ',
    '{#if hasTransferLines}Please change here for {transferLinesEnList}.{/if} ',
    '{#if isNextStopTerminus}Thank you for traveling with us, and look forward to serving you again.{/if}'
  ),
};

const JR_WEST_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}',
    'Thank you for using {currentLineCompanyEn}. ',
    'This is the {trainTypeEn} Service bound for {boundForEn} ',
    '{#if hasViaStation}via {viaStationEn}{/if}. ',
    '{/if}',
    '{#if shouldAnnounceJrWestStopList}',
    'We will be stopping at {jrWestStopsListEn}. ',
    '{#if lastAnnouncedStopIsBound}{:else}Stops after {lastAnnouncedStopEn} will be announced later. {/if}',
    '{/if}',
    'The next stop is {nextStationEn}{#if nextStationIsBound} terminal{/if}',
    '{#if hasNextStationNumberLineSymbol} station number {nextStationNumberTextNoPeriod}.{:else}.{/if} ',
    '{#if hasTransferLines}Transfer here for {transferLinesEnList}.{/if}'
  ),
  ARRIVING: t(
    'We will soon be making a brief stop at {nextStationEn}{#if nextStationIsBound} terminal{/if}',
    '{#if hasNextStationNumberLineSymbol} station number {nextStationNumberTextNoPeriod}.{:else}.{/if} ',
    '{#if hasTransferLines}Transfer here for {transferLinesEnList}.{/if} ',
    '{#if hasAfterNextStation}After leaving {nextStationEn}, We will be stopping at {afterNextStationEn}.{/if}'
  ),
};

const TOEI_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}Thank you for using the {currentLineEn}. {/if}',
    'This is the {trainTypeEn} train bound for {boundForEn}. ',
    'The next station is {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, the last stop{/if} ',
    '{#if hasTransferLines}Please change here for {transferLinesEnList}.{/if}'
  ),
  ARRIVING: t(
    'We will soon be arriving at {nextStationEn} {nextStationNumberText}',
    '{#if isNextStopTerminus}, the last stop{/if} ',
    '{#if hasTransferLines}Please change here for {transferLinesEnList}.{/if}',
    '{#if hasTrainTypeAndAfterNext} The stop after {nextStationEn}, will be {afterNextStationEn}{#if isAfterNextStopTerminus} the last stop{/if}.{/if}',
    '{#if isNextStopTerminus} Thank you for using the {currentLineEn}.{/if}'
  ),
};

const JR_KYUSHU_EN: ThemeTemplate = {
  NEXT: t(
    '{#if firstSpeech}This is a {trainTypeEn} train bound for {boundForEn}.{/if} ',
    'The next station is {nextStationEn} {nextStationNumberText}',
    '{#if nextStationIsBound} terminal{/if}. ',
    '{#if hasTransferLines}You can transfer to {transferLinesEnList} at {nextStationEn}.{/if}'
  ),
  ARRIVING: t(
    'We will soon be arriving at {nextStationEn}',
    '{#if nextStationIsBound} terminal{/if} {nextStationNumberText}. ',
    '{#if hasTransferLines}',
    'You can transfer to {transferLinesEnList} at {nextStationEn}. ',
    '{#if nextStationIsBound}Thank you for using the {currentLineEn}.{/if}',
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
  [APP_THEME.YAMANOTE]: YAMANOTE,
  [APP_THEME.JR_WEST]: JR_WEST,
  [APP_THEME.SAIKYO]: SAIKYO,
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
  [APP_THEME.YAMANOTE]: YAMANOTE_EN,
  [APP_THEME.JR_WEST]: JR_WEST_EN,
  [APP_THEME.SAIKYO]: SAIKYO_EN,
  [APP_THEME.TOEI]: TOEI_EN,
  [APP_THEME.JR_KYUSHU]: JR_KYUSHU_EN,
  [APP_THEME.LED]: EMPTY_THEME,
  [APP_THEME.JO]: EMPTY_THEME,
  [APP_THEME.JL]: EMPTY_THEME,
  [APP_THEME.ODAKYU]: EMPTY_THEME,
  [APP_THEME.E231]: EMPTY_THEME,
};
