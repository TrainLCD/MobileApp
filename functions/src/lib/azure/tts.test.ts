import { buildAzureSsml } from './tts';

describe('buildAzureSsml', () => {
  it('wraps standard neural voices with prosody/style when provided', () => {
    const ssml = buildAzureSsml('東京', 'ja-JP', 'ja-JP-NanamiNeural', {
      pitch: '+1st',
      style: 'narration-relaxed',
      styleDegree: '1.5',
    });

    expect(ssml).toContain('<prosody pitch="+1st">');
    expect(ssml).toContain(
      '<mstts:express-as style="narration-relaxed" styledegree="1.5">'
    );
    expect(ssml).toContain('name="ja-JP-NanamiNeural"');
  });

  it('omits prosody and express-as for HD (DragonHD) voices', () => {
    const ssml = buildAzureSsml(
      '東京',
      'ja-JP',
      'ja-JP-Nanami:DragonHDLatestNeural',
      { pitch: '+1st', style: 'narration-relaxed' }
    );

    // HD は <prosody> / <mstts:express-as> 非対応のため出力しない
    expect(ssml).not.toContain('<prosody');
    expect(ssml).not.toContain('mstts:express-as');
    expect(ssml).toContain('name="ja-JP-Nanami:DragonHDLatestNeural"');
    expect(ssml).toContain('>東京</voice>');
  });

  it('omits prosody for HD English voices as well', () => {
    const ssml = buildAzureSsml(
      'Tokyo',
      'en-US',
      'en-US-Jenny:DragonHDLatestNeural',
      { pitch: '+1st' }
    );

    expect(ssml).not.toContain('<prosody');
    expect(ssml).toContain('name="en-US-Jenny:DragonHDLatestNeural"');
  });

  it('preserves supported inner SSML (say-as/sub/break) for HD voices', () => {
    const inner = '<say-as interpret-as="cardinal">3</say-as> 番線';
    const ssml = buildAzureSsml(
      inner,
      'ja-JP',
      'ja-JP-Nanami:DragonHDLatestNeural',
      {}
    );

    expect(ssml).toContain(inner);
  });
});
