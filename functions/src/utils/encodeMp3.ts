const MP3_BITRATE = 128;

/**
 * PCM 16-bit LE mono を MP3 にエンコードする。
 * WAV (RIFF) ヘッダー付きの場合は自動でスキップする。
 */
export const encodePcmToMp3 = async (
  pcmBuffer: Buffer,
  sampleRate = 24000
): Promise<{ buffer: Buffer; mimeType: string }> => {
  // TypeScript の "module": "commonjs" 設定では await import() が require() に変換され、
  // @breezystack/lamejs の IIFE ビルドは module.exports を設定しないため空オブジェクトになる。
  // new Function を使って真の ESM dynamic import を強制する。
  const dynamicImport = new Function(
    'specifier',
    'return import(specifier)'
  ) as (specifier: string) => Promise<typeof import('@breezystack/lamejs')>;
  const { Mp3Encoder } = await dynamicImport('@breezystack/lamejs');

  let pcmData = pcmBuffer;
  let rate = sampleRate;

  // WAV ヘッダーがあれば解析してスキップ
  if (
    pcmData.length >= 44 &&
    pcmData.subarray(0, 4).toString('ascii') === 'RIFF' &&
    pcmData.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    rate = pcmData.readUInt32LE(24);
    pcmData = pcmData.subarray(44);
  }

  const samples = new Int16Array(
    pcmData.buffer,
    pcmData.byteOffset,
    pcmData.byteLength / 2
  );

  const encoder = new Mp3Encoder(1, rate, MP3_BITRATE);
  const chunkSize = 1152;
  const mp3Parts: Buffer[] = [];

  for (let i = 0; i < samples.length; i += chunkSize) {
    const chunk = samples.subarray(i, i + chunkSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Parts.push(Buffer.from(mp3buf.buffer, mp3buf.byteOffset, mp3buf.byteLength));
    }
  }

  const flush = encoder.flush();
  if (flush.length > 0) {
    mp3Parts.push(Buffer.from(flush.buffer, flush.byteOffset, flush.byteLength));
  }

  return {
    buffer: Buffer.concat(mp3Parts as unknown as Uint8Array[]),
    mimeType: 'audio/mpeg',
  };
};
