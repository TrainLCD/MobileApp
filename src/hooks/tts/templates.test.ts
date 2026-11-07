import { APP_THEME } from '~/models/Theme';
import { EN_TEMPLATES, JA_TEMPLATES } from './templates';

describe('TTSテンプレート', () => {
  it('E131系風は埼京線風と同じ日本語テンプレートを使う', () => {
    expect(JA_TEMPLATES[APP_THEME.E131]).toBe(JA_TEMPLATES[APP_THEME.SAIKYO]);
  });

  it('E131系風は埼京線風と同じ英語テンプレートを使う', () => {
    expect(EN_TEMPLATES[APP_THEME.E131]).toBe(EN_TEMPLATES[APP_THEME.SAIKYO]);
  });
});

describe('315系風のTTS', () => {
  const context = {
    firstSpeech: true,
    hasTrainType: true,
    trainTypeJa315: '快速',
    trainTypeEn: 'rapid',
    vehicleEn: 'train',
    currentLineCompanyJa: 'JR東海',
    currentLineCompanyEn: 'JR Central',
    boundForJa: '中津川',
    boundForEn: 'Nakatsugawa',
    nextStationJa: '金山',
    nextStationEn: 'Kanayama',
    hasNextStationNumberText: true,
    nextStationNumberTextNoPeriod:
      'C F <say-as interpret-as="cardinal">1</say-as>',
    hasTransferLines: true,
    transferLinesListJa: '東海道線',
    transferLinesEnList: 'the Tokaido Line',
    jr315ShouldAnnounceAfterNextStop: true,
    afterNextStationJa: '鶴舞',
    afterNextStationEn: 'Tsurumai',
    hasAfterNextStationNumberText: true,
    afterNextStationNumberText:
      'C F <say-as interpret-as="cardinal">2</say-as>',
  };

  it('初回は会社・種別・行先、通常は次駅だけを案内する', () => {
    expect(JA_TEMPLATES.JR_315.NEXT(context)).toBe(
      '今日もJR東海をご利用くださいまして、ありがとうございます。快速、中津川行きです。次は金山です。'
    );
    expect(EN_TEMPLATES.JR_315.NEXT(context)).toBe(
      'Thank you for traveling with JR Central. This is the rapid train bound for Nakatsugawa. The next stop is Kanayama, C F <say-as interpret-as="cardinal">1</say-as>.'
    );
    expect(JA_TEMPLATES.JR_315.NEXT({ ...context, firstSpeech: false })).toBe(
      '次は金山です。'
    );
  });

  it('到着前は乗換・次の停車駅・ドアの順に案内する', () => {
    expect(JA_TEMPLATES.JR_315.ARRIVING(context)).toBe(
      'まもなく、金山です。東海道線はお乗り換えです。金山を出ますと次は鶴舞に停まります。ドアから手を離してお待ちください。'
    );
    expect(EN_TEMPLATES.JR_315.ARRIVING(context)).toBe(
      'We will soon make a brief stop at Kanayama, C F <say-as interpret-as="cardinal">1</say-as>. Passengers transferring to the Tokaido Line, please change trains here. After leaving Kanayama, we will stop at Tsurumai, C F <say-as interpret-as="cardinal">2</say-as>. Please refrain from touching the doors and wait for them to open.'
    );
  });

  it('終点は忘れ物注意・会社への御礼の後にドアの注意喚起を加える', () => {
    const terminal = {
      ...context,
      isNextStopTerminus: true,
      hasTransferLines: false,
      jr315ShouldAnnounceAfterNextStop: false,
    };
    expect(JA_TEMPLATES.JR_315.ARRIVING(terminal)).toBe(
      'まもなく、終点金山です。お忘れ物のないよう、お確かめください。今日もJR東海をご利用くださいまして、ありがとうございました。ドアから手を離してお待ちください。'
    );
    expect(EN_TEMPLATES.JR_315.ARRIVING(terminal)).toBe(
      'We will soon make a brief stop at Kanayama, C F <say-as interpret-as="cardinal">1</say-as>, the final stop. Please take care not to leave any items. Thank you for traveling with JR Central. Please refrain from touching the doors and wait for them to open.'
    );
  });

  it('会社・駅・種別・行先・乗換路線・駅番号を固定しない', () => {
    const other = {
      ...context,
      currentLineCompanyJa: '小田急電鉄',
      currentLineCompanyEn: 'Odakyu',
      trainTypeJa315: '急行',
      trainTypeEn: 'express',
      boundForJa: '新宿',
      boundForEn: 'Shinjuku',
      nextStationJa: '代々木上原',
      nextStationEn: 'Yoyogi-Uehara',
      nextStationNumberTextNoPeriod: 'O H 5',
      transferLinesListJa: '千代田線',
      transferLinesEnList: 'the Chiyoda Line',
    };
    const ja = JA_TEMPLATES.JR_315.NEXT(other);
    expect(ja).toBe(
      '今日も小田急電鉄をご利用くださいまして、ありがとうございます。急行、新宿行きです。次は代々木上原です。'
    );
    expect(EN_TEMPLATES.JR_315.NEXT(other)).toContain(
      'Odakyu. This is the express train bound for Shinjuku. The next stop is Yoyogi-Uehara, O H 5.'
    );
    expect(JA_TEMPLATES.JR_315.ARRIVING(other)).toContain(
      '千代田線はお乗り換えです。'
    );
    expect(EN_TEMPLATES.JR_315.ARRIVING(other)).toContain(
      'the Chiyoda Line, please change trains here.'
    );
  });

  it('番号・乗換・快速の次の停車駅が無い場合も余分な句読点を出さない', () => {
    const simple = {
      ...context,
      hasNextStationNumberText: false,
      hasTransferLines: false,
      jr315ShouldAnnounceAfterNextStop: false,
    };
    expect(EN_TEMPLATES.JR_315.ARRIVING(simple)).toBe(
      'We will soon make a brief stop at Kanayama. Please refrain from touching the doors and wait for them to open.'
    );
    expect(JA_TEMPLATES.JR_315.ARRIVING(simple)).toBe(
      'まもなく、金山です。ドアから手を離してお待ちください。'
    );
  });
});
