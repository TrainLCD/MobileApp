/** 受信テキストを1フレームにまとめる。確定応答の適用前は flush、破棄時は cancel を呼ぶ。 */
export const createFrameTextBatcher = (onText: (text: string) => void) => {
  let pending = '';
  let frame: number | null = null;
  let cancelled = false;
  const flush = () => {
    if (frame != null) cancelAnimationFrame(frame);
    frame = null;
    const text = pending;
    pending = '';
    if (!cancelled && text) onText(text);
  };
  return {
    append(text: string) {
      if (cancelled || !text) return;
      pending += text;
      if (frame == null) frame = requestAnimationFrame(flush);
    },
    flush,
    cancel() {
      cancelled = true;
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
      pending = '';
    },
  };
};
