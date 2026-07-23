// TTS テンプレート (hooks/tts/templates.ts, formatters.ts, utils/phoneme.ts) は
// 旧外部 TTS API (Azure Speech) 向けの SSML 断片を生成する。OS ネイティブ TTS
// (expo-speech) は SSML を解釈せずタグをそのまま読み上げてしまうため、
// 読み上げ直前にプレーンテキストへ変換する。
// - <break time="..."/> はポーズ相当の区切り文字に置き換える (言語別に指定)
// - <phoneme ph="...">表記</phoneme> や <say-as>5</say-as> は中身のテキストを残す
//   (IPA 発音記号は失われるが、fallbackText / surface が読み上げ可能な表記を持つ)
// - escapeXml 済みの実体参照 (&amp; など) を元の文字へ戻す

export interface SsmlToPlainTextOptions {
  // <break/> の置き換え文字。日本語は「、」、英語はテンプレ側にカンマが
  // 既に含まれるため半角スペースを想定している。
  breakReplacement?: string;
}

export const ssmlToPlainText = (
  ssml: string,
  options?: SsmlToPlainTextOptions
): string => {
  const breakReplacement = options?.breakReplacement ?? '、';
  return (
    ssml
      .replace(/<break\b[^>]*>/gi, breakReplacement)
      .replace(/<[^>]+>/g, '')
      // 実体参照の復元はタグ除去の後に行う。先に &lt; を戻すと本文由来の
      // 「<」が偽タグとして本文ごと削られてしまう。&amp; は最後に戻す。
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/[\t ]+/g, ' ')
      .trim()
  );
};
