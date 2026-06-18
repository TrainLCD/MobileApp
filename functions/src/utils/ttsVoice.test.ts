import {
  isAzureHdVoiceName,
  isAzureVoiceName,
  resolveAzureVoiceName,
} from './ttsVoice';

describe('ttsVoice (Azure)', () => {
  it('accepts Azure neural voices', () => {
    expect(isAzureVoiceName('ja-JP-NanamiNeural')).toBe(true);
    expect(isAzureVoiceName('en-US-JennyNeural')).toBe(true);
    expect(isAzureVoiceName('en-US-AvaMultilingualNeural')).toBe(true);
  });

  it('accepts Azure HD (DragonHD) voices as valid voice names', () => {
    expect(isAzureVoiceName('ja-JP-Nanami:DragonHDLatestNeural')).toBe(true);
    expect(isAzureVoiceName('en-US-Jenny:DragonHDLatestNeural')).toBe(true);
  });

  it('detects HD (DragonHD) voices', () => {
    expect(isAzureHdVoiceName('ja-JP-Nanami:DragonHDLatestNeural')).toBe(true);
    expect(isAzureHdVoiceName('en-US-Jenny:DragonHDLatestNeural')).toBe(true);
    expect(isAzureHdVoiceName('en-US-Ava:DragonHDLatestNeural')).toBe(true);
  });

  it('treats standard neural voices as non-HD', () => {
    expect(isAzureHdVoiceName('ja-JP-NanamiNeural')).toBe(false);
    expect(isAzureHdVoiceName('en-US-JennyNeural')).toBe(false);
    expect(isAzureHdVoiceName('')).toBe(false);
  });

  it('rejects non-Azure voice ids', () => {
    expect(isAzureVoiceName('ja-JP-Standard-B')).toBe(false);
    expect(isAzureVoiceName('en-US-Chirp3-HD-Aoede')).toBe(false);
    expect(isAzureVoiceName('')).toBe(false);
  });

  it('prefers a valid requested voice', () => {
    expect(
      resolveAzureVoiceName(
        'en-US-AriaNeural',
        'en-US-GuyNeural',
        'en-US-JennyNeural'
      )
    ).toBe('en-US-AriaNeural');
  });

  it('falls back to a configured voice when the request is invalid', () => {
    expect(
      resolveAzureVoiceName(
        'en-US-Standard-H',
        'en-US-GuyNeural',
        'en-US-JennyNeural'
      )
    ).toBe('en-US-GuyNeural');
  });

  it('falls back to the default voice when both inputs are invalid', () => {
    expect(
      resolveAzureVoiceName(
        'ja-JP-Standard-B',
        'ja-JP-Neural2-B',
        'ja-JP-NanamiNeural'
      )
    ).toBe('ja-JP-NanamiNeural');
  });
});
