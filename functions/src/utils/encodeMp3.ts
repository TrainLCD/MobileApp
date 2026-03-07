import { spawn } from 'node:child_process';

const MP3_BITRATE = '128k';

/**
 * PCM 16-bit LE mono を ffmpeg で MP3 にエンコードする。
 * WAV (RIFF) ヘッダー付きの場合は自動判別される。
 */
export const encodePcmToMp3 = async (
  pcmBuffer: Buffer,
  sampleRate = 24000,
  volumeDb?: number
): Promise<{ buffer: Buffer; mimeType: string }> => {
  const isWav =
    pcmBuffer.length >= 12 &&
    pcmBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    pcmBuffer.subarray(8, 12).toString('ascii') === 'WAVE';

  const inputArgs = isWav
    ? ['-i', 'pipe:0']
    : ['-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0'];

  const filterArgs =
    volumeDb != null ? ['-af', `volume=${volumeDb}dB`] : [];

  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    ...inputArgs,
    ...filterArgs,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    MP3_BITRATE,
    '-f',
    'mp3',
    'pipe:1',
  ];

  const mp3Buffer = await new Promise<Buffer>((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const chunks: Buffer[] = [];
    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));

    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
        return;
      }
      resolve(Buffer.concat(chunks as unknown as Uint8Array[]));
    });

    proc.stdin.end(pcmBuffer);
  });

  return { buffer: mp3Buffer, mimeType: 'audio/mpeg' };
};
