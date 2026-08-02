import { type Voice, VoiceQuality } from 'expo-speech';
import { scoreVoiceQuality, selectBestVoiceIdentifier } from './nativeTtsVoice';

const voice = (
  identifier: string,
  language: string,
  quality: VoiceQuality = VoiceQuality.Default,
  name = identifier
): Voice => ({ identifier, name, quality, language });

describe('scoreVoiceQuality', () => {
  it('premium識別子を最高スコアにする', () => {
    expect(
      scoreVoiceQuality(voice('com.apple.voice.premium.ja-JP.Kyoko', 'ja-JP'))
    ).toBe(3);
  });

  it('旧形式のpremium識別子(ttsbundle)も判定する', () => {
    expect(
      scoreVoiceQuality(voice('com.apple.ttsbundle.Kyoko-premium', 'ja-JP'))
    ).toBe(3);
  });

  it('quality=Enhancedをスコア2にする', () => {
    // Android は識別子に品質を含まないため quality フィールドで判定する
    expect(
      scoreVoiceQuality(
        voice('ja-jp-x-htm-local', 'ja-JP', VoiceQuality.Enhanced)
      )
    ).toBe(2);
  });

  it('enhanced識別子はquality=Defaultでもスコア2にする', () => {
    // iOS の premium 音声が quality=Default として報告される既知の落とし穴と
    // 同様に、識別子側でも enhanced を検出できるようにしている
    expect(
      scoreVoiceQuality(voice('com.apple.voice.enhanced.ja-JP.Kyoko', 'ja-JP'))
    ).toBe(2);
  });

  it('コンパクト版はスコア1にする', () => {
    expect(
      scoreVoiceQuality(voice('com.apple.voice.compact.ja-JP.Kyoko', 'ja-JP'))
    ).toBe(1);
  });
});

describe('selectBestVoiceIdentifier', () => {
  it('premium > enhanced > compact の優先順で選ぶ', () => {
    const voices = [
      voice('com.apple.voice.compact.ja-JP.Kyoko', 'ja-JP'),
      voice(
        'com.apple.voice.enhanced.ja-JP.Kyoko',
        'ja-JP',
        VoiceQuality.Enhanced
      ),
      voice('com.apple.voice.premium.ja-JP.Kyoko', 'ja-JP'),
    ];
    expect(selectBestVoiceIdentifier(voices, 'ja-JP')).toBe(
      'com.apple.voice.premium.ja-JP.Kyoko'
    );
  });

  it('premiumが無ければenhancedを選ぶ', () => {
    const voices = [
      voice('com.apple.voice.compact.en-US.Samantha', 'en-US'),
      voice(
        'com.apple.voice.enhanced.en-US.Ava',
        'en-US',
        VoiceQuality.Enhanced
      ),
    ];
    expect(selectBestVoiceIdentifier(voices, 'en-US')).toBe(
      'com.apple.voice.enhanced.en-US.Ava'
    );
  });

  it('高品質音声が無い場合はundefinedを返しシステム既定に任せる', () => {
    const voices = [
      voice('com.apple.voice.compact.ja-JP.Kyoko', 'ja-JP'),
      voice('com.apple.eloquence.ja-JP.Eddy', 'ja-JP'),
    ];
    expect(selectBestVoiceIdentifier(voices, 'ja-JP')).toBeUndefined();
  });

  it('allowDefaultQuality指定時は既定品質の音声も返す(Android向け)', () => {
    const voices = [voice('ja-jp-x-htm-local', 'ja-JP')];
    expect(
      selectBestVoiceIdentifier(voices, 'ja-JP', { allowDefaultQuality: true })
    ).toBe('ja-jp-x-htm-local');
  });

  it('allowDefaultQuality指定時も高品質音声を優先する', () => {
    const voices = [
      voice('ja-jp-x-htm-local', 'ja-JP'),
      voice('ja-jp-x-htm-enhanced', 'ja-JP', VoiceQuality.Enhanced),
    ];
    expect(
      selectBestVoiceIdentifier(voices, 'ja-JP', { allowDefaultQuality: true })
    ).toBe('ja-jp-x-htm-enhanced');
  });

  it('ネットワーク必須音声しか無い場合は最後の手段として選ぶ', () => {
    // 音声未指定のまま進めると Android では言語フォールバック不備で端末既定
    // 言語の合成になるため、ネットワーク音声でも明示指定する方がマシ
    const voices = [voice('ja-jp-x-jab-network', 'ja-JP')];
    expect(
      selectBestVoiceIdentifier(voices, 'ja-JP', { allowDefaultQuality: true })
    ).toBe('ja-jp-x-jab-network');
  });

  it('別言語の音声は選ばない', () => {
    const voices = [
      voice('com.apple.voice.premium.en-US.Zoe', 'en-US'),
      voice(
        'com.apple.voice.enhanced.ja-JP.Kyoko',
        'ja-JP',
        VoiceQuality.Enhanced
      ),
    ];
    expect(selectBestVoiceIdentifier(voices, 'ja-JP')).toBe(
      'com.apple.voice.enhanced.ja-JP.Kyoko'
    );
  });

  it('言語タグの大文字小文字・アンダースコア差を吸収する', () => {
    const voices = [voice('ja-jp-x-htm-local', 'ja_JP', VoiceQuality.Enhanced)];
    expect(selectBestVoiceIdentifier(voices, 'ja-JP')).toBe(
      'ja-jp-x-htm-local'
    );
  });

  it('ローカル音声をネットワーク必須音声より優先する(Android)', () => {
    const voices = [
      voice('ja-jp-x-jab-network', 'ja-JP', VoiceQuality.Enhanced),
      voice('ja-jp-x-htm-local', 'ja-JP', VoiceQuality.Enhanced),
    ];
    expect(selectBestVoiceIdentifier(voices, 'ja-JP')).toBe(
      'ja-jp-x-htm-local'
    );
  });

  it('地域一致が無い場合は同一言語の別地域へフォールバックする', () => {
    // en-US の音声データが無い端末でも en-GB 等があれば英語で読み上げる。
    // 音声未指定のまま進めると Android では端末既定言語(日本語)で合成されてしまう
    const voices = [
      voice('en-gb-x-gba-local', 'en-GB', VoiceQuality.Enhanced),
      voice('ja-jp-x-htm-local', 'ja-JP', VoiceQuality.Enhanced),
    ];
    expect(selectBestVoiceIdentifier(voices, 'en-US')).toBe(
      'en-gb-x-gba-local'
    );
  });

  it('品質より地域一致を優先する', () => {
    const voices = [
      voice('en-gb-x-gba-local', 'en-GB', VoiceQuality.Enhanced),
      voice(
        'en-us-x-iob-local',
        'en-US',
        VoiceQuality.Enhanced,
        'en-us-enhanced'
      ),
    ];
    expect(selectBestVoiceIdentifier(voices, 'en-US')).toBe(
      'en-us-x-iob-local'
    );
  });

  it('同スコアの候補は識別子順で決定的に選ぶ', () => {
    const voices = [
      voice('com.apple.voice.premium.en-US.Zoe', 'en-US'),
      voice('com.apple.voice.premium.en-US.Ava', 'en-US'),
    ];
    expect(selectBestVoiceIdentifier(voices, 'en-US')).toBe(
      'com.apple.voice.premium.en-US.Ava'
    );
  });
});
