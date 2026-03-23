import {
  isStandardVoiceName,
  resolveStandardVoiceName,
} from './ttsVoice';

describe('ttsVoice', () => {
  it('accepts Google Standard voices', () => {
    expect(isStandardVoiceName('ja-JP-Standard-B')).toBe(true);
  });

  it('rejects voices that require a model name', () => {
    expect(isStandardVoiceName('ja-JP-Chirp3-HD-Charon')).toBe(false);
  });

  it('prefers a requested standard voice', () => {
    expect(
      resolveStandardVoiceName(
        'en-US-Standard-H',
        'en-US-Chirp3-HD-Aoede',
        'en-US-Standard-G'
      )
    ).toBe('en-US-Standard-H');
  });

  it('falls back to a configured standard voice when the request is invalid', () => {
    expect(
      resolveStandardVoiceName(
        'en-US-Chirp3-HD-Aoede',
        'en-US-Standard-F',
        'en-US-Standard-G'
      )
    ).toBe('en-US-Standard-F');
  });

  it('falls back to the default standard voice when both inputs are invalid', () => {
    expect(
      resolveStandardVoiceName(
        'ja-JP-Chirp3-HD-Charon',
        'ja-JP-Neural2-B',
        'ja-JP-Standard-B'
      )
    ).toBe('ja-JP-Standard-B');
  });
});
