import type { AppStoreReview } from '../models/review';

export function parseAppStoreRSSXML(xmlContent: string): AppStoreReview[] {
  const reviews: AppStoreReview[] = [];

  try {
    // Simple XML parsing for App Store RSS format
    // App Store RSS typically has <entry> elements for each review
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match: RegExpExecArray | null = entryRegex.exec(xmlContent);

    while (match !== null) {
      const entryContent = match[1];

      // Extract review data using regex patterns
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
  // App Store RSS often includes rating in im:rating element
  const ratingMatch = content.match(/<im:rating>([^<]+)<\/im:rating>/);
  if (ratingMatch) {
    return Number.parseInt(ratingMatch[1], 10) || 0;
  }
  return 0;
}

function decodeHTMLEntities(text: string): string {
  // Note: This function decodes common HTML entities in text content.
  // It does not decode entities in XML attributes, which is handled separately by XML parsers.
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
