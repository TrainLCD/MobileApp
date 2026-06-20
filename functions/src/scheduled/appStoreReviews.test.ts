import { parseAppStoreJson } from './appStoreReviews';

describe('parseAppStoreJson', () => {
  it('parses entries from the App Store JSON feed', () => {
    const feed = JSON.stringify({
      feed: {
        entry: [
          {
            id: { label: 'r1' },
            updated: { label: '2025-09-03T10:00:00Z' },
            title: { label: 'Great' },
            content: { label: 'Awesome' },
            'im:rating': { label: '5' },
            'im:version': { label: '1.0' },
            author: { name: { label: 'A' } },
            link: { attributes: { href: 'https://example.com/r1' } },
          },
        ],
      },
    });
    const reviews = parseAppStoreJson(feed);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      id: 'r1',
      rating: 5,
      version: '1.0',
      author: 'A',
      url: 'https://example.com/r1',
    });
  });

  it('wraps a single entry object into an array', () => {
    const feed = JSON.stringify({
      feed: {
        entry: {
          id: { label: 'solo' },
          updated: { label: '2025-09-03T10:00:00Z' },
          title: { label: 't' },
          content: { label: 'c' },
          'im:rating': { label: '4' },
        },
      },
    });
    expect(parseAppStoreJson(feed)).toHaveLength(1);
  });

  it('returns empty array for malformed JSON', () => {
    expect(parseAppStoreJson('not json')).toEqual([]);
  });

  it('skips entries without id or updated', () => {
    const feed = JSON.stringify({
      feed: { entry: [{ title: { label: 'no id' } }] },
    });
    expect(parseAppStoreJson(feed)).toEqual([]);
  });
});
