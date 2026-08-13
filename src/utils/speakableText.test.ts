import { toSpeakableText, truncateToSpeechLimit } from './speakableText';

describe('toSpeakableText', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('SSML タグを除去し、sub は読み仮名を採用する', () => {
    expect(
      toSpeakableText('次は<sub alias="オオサキ">大崎</sub>です', 'JA')
    ).toBe('次はオオサキです');
  });

  it('日本語の break は読点へ置き換える', () => {
    expect(toSpeakableText('次は<break time="250ms"/>大崎です', 'JA')).toBe(
      '次は、大崎です'
    );
  });

  it('英語の break は半角スペースへ置き換える', () => {
    // 英語テンプレートは区切りのカンマを自前で持つため読点を足さない
    expect(
      toSpeakableText(
        'The next station is Osaki,<break time="200ms"/> J Y 24.',
        'EN'
      )
    ).toBe('The next station is Osaki, J Y 24.');
  });

  it('「JR」を言語ごとの読み方が確定する表記へ置換する', () => {
    expect(toSpeakableText('<sub alias="JRセン">JR線</sub>', 'JA')).toBe(
      'ジェーアールセン'
    );
    expect(toSpeakableText('the JR Kobe Line', 'EN')).toBe('the J-R Kobe Line');
  });

  it('英語文に混入した日本語を除去する', () => {
    // nameRoman 欠落データ等で英語文に日本語が残ると、エンジンが言語を誤判定して
    // 全文を日本語音声で読んでしまうため最終防衛線として除去する
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    expect(toSpeakableText('Arriving at あかさか K 7.', 'EN')).toBe(
      'Arriving at K 7.'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[speakableText] English text contains Japanese characters, stripping:',
      'Arriving at あかさか K 7.'
    );
  });

  it('日本語文の日本語は当然除去しない', () => {
    expect(toSpeakableText('つぎはあかさかです', 'JA')).toBe(
      'つぎはあかさかです'
    );
  });
});

describe('truncateToSpeechLimit', () => {
  it('上限を超えたら切り詰める', () => {
    expect(truncateToSpeechLimit('abcdef', 3)).toBe('abc');
  });

  it('上限以内ならそのまま返す', () => {
    expect(truncateToSpeechLimit('abc', 10)).toBe('abc');
  });

  it('上限が未定義・0・負値なら切り詰めない', () => {
    expect(truncateToSpeechLimit('abcdef', undefined)).toBe('abcdef');
    expect(truncateToSpeechLimit('abcdef', 0)).toBe('abcdef');
    expect(truncateToSpeechLimit('abcdef', -1)).toBe('abcdef');
  });
});
