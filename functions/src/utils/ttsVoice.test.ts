import { isAwsVoiceName, resolveAwsVoiceName } from './ttsVoice';

describe('ttsVoice (AWS Polly)', () => {
  it('accepts known Polly voices', () => {
    expect(isAwsVoiceName('Kazuha')).toBe(true);
    expect(isAwsVoiceName('Takumi')).toBe(true);
    expect(isAwsVoiceName('Joanna')).toBe(true);
    expect(isAwsVoiceName('Matthew')).toBe(true);
  });

  it('rejects unknown / non-Polly voice ids', () => {
    expect(isAwsVoiceName('ja-JP-NanamiNeural')).toBe(false);
    expect(isAwsVoiceName('en-US-Standard-G')).toBe(false);
    expect(isAwsVoiceName('en-US-Chirp3-HD-Aoede')).toBe(false);
    expect(isAwsVoiceName('')).toBe(false);
  });

  it('prefers a valid requested voice', () => {
    expect(resolveAwsVoiceName('Joanna', 'Matthew', 'Ruth')).toBe('Joanna');
  });

  it('falls back to a configured voice when the request is invalid', () => {
    expect(resolveAwsVoiceName('en-US-Standard-H', 'Matthew', 'Ruth')).toBe(
      'Matthew'
    );
  });

  it('falls back to the default voice when both inputs are invalid', () => {
    expect(
      resolveAwsVoiceName('ja-JP-Standard-B', 'ja-JP-Neural2-B', 'Kazuha')
    ).toBe('Kazuha');
  });
});
