import { parseAppStoreRSSXML } from './appStoreParser';

describe('App Store RSS Parser', () => {
  const sampleXML = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns:im="http://itunes.apple.com/rss" xmlns="http://www.w3.org/2005/Atom" xml:lang="ja">
  <entry>
    <id>https://itunes.apple.com/jp/review?id=1486355943&amp;reviewId=1234567890</id>
    <title>Great app!</title>
    <content type="text">Very useful for train information.</content>
    <im:rating>5</im:rating>
    <author>
      <name>TestUser</name>
    </author>
    <im:version>2.1.0</im:version>
    <updated>2023-12-01T10:00:00-07:00</updated>
    <link rel="related" href="https://itunes.apple.com/jp/review?id=1486355943&amp;reviewId=1234567890"/>
  </entry>
</feed>`;

  it('should parse App Store RSS XML correctly', () => {
    const reviews = parseAppStoreRSSXML(sampleXML);

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toEqual({
      id: 'https://itunes.apple.com/jp/review?id=1486355943&amp;reviewId=1234567890',
      title: 'Great app!',
      content: 'Very useful for train information.',
      rating: 5,
      author: 'TestUser',
      version: '2.1.0',
      date: '2023-12-01T10:00:00-07:00',
      link: 'https://itunes.apple.com/jp/review?id=1486355943&amp;reviewId=1234567890',
    });
  });

  it('should handle empty XML', () => {
    const reviews = parseAppStoreRSSXML('<feed></feed>');
    expect(reviews).toHaveLength(0);
  });

  it('should decode HTML entities', () => {
    const xmlWithEntities = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns:im="http://itunes.apple.com/rss" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>test123</id>
    <title>Test &amp; Review</title>
    <content type="text">Content with &quot;quotes&quot; &amp; entities</content>
    <im:rating>4</im:rating>
    <author><name>User</name></author>
    <im:version>1.0</im:version>
    <updated>2023-01-01</updated>
  </entry>
</feed>`;

    const reviews = parseAppStoreRSSXML(xmlWithEntities);
    expect(reviews[0].title).toBe('Test & Review');
    expect(reviews[0].content).toBe('Content with "quotes" & entities');
  });
});
