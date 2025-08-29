import type { AppStoreReview } from '../models/review';

export function parseAppStoreRSSXML(xmlContent: string): AppStoreReview[] {
  const reviews: AppStoreReview[] = [];

  try {
    // App Store RSS形式のシンプルなXMLパース
    // App Store RSSは通常、各レビューに<entry>要素を持ちます
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match: RegExpExecArray | null = entryRegex.exec(xmlContent);

    while (match !== null) {
      const entryContent = match[1];

      // 正規表現パターンを使用してレビューデータを抽出
      const id = extractValue(entryContent, /<id>([^<]+)<\/id>/);
      const title = extractValue(entryContent, /<title>([^<]+)<\/title>/);
      const content = extractValue(
        entryContent,
        /<content[^>]*>([^<]+)<\/content>/
      );
      const rating = extractRating(entryContent);
      const author = extractValue(entryContent, /<name>([^<]+)<\/name>/);
      const version = extractValue(
        entryContent,
        /<im:version>([^<]+)<\/im:version>/
      );
      const dateStr = extractValue(entryContent, /<updated>([^<]+)<\/updated>/);
      const link = extractValue(entryContent, /<link[^>]*href="([^"]+)"/);

      if (id && title) {
        reviews.push({
          id,
          title: decodeHTMLEntities(title),
          content: decodeHTMLEntities(content || ''),
          rating,
          author: decodeHTMLEntities(author || ''),
          version: version || '',
          date: dateStr || '',
          link: link || '',
        });
      }

      match = entryRegex.exec(xmlContent);
    }
  } catch (error) {
    console.error('Error parsing App Store RSS XML:', error);
  }

  return reviews;
}

function extractValue(content: string, regex: RegExp): string {
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractRating(content: string): number {
  // App Store RSSは通常im:rating要素に評価を含みます
  const ratingMatch = content.match(/<im:rating>([^<]+)<\/im:rating>/);
  if (ratingMatch) {
    return Number.parseInt(ratingMatch[1], 10) || 0;
  }
  return 0;
}

function decodeHTMLEntities(text: string): string {
  // 注意: この関数はテキストコンテンツ内の一般的なHTMLエンティティをデコードします。
  // XML属性内のエンティティはデコードしません。それはXMLパーサーによって別途処理されます。
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
