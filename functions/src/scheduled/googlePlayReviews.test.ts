import { toPlayReviews, tsToIso } from './googlePlayReviews';

describe('tsToIso', () => {
  it('converts a Play timestamp to ISO', () => {
    expect(tsToIso({ seconds: 1756960800, nanos: 0 })).toBe(
      new Date(1756960800 * 1000).toISOString()
    );
  });

  it('accepts string seconds', () => {
    expect(tsToIso({ seconds: '1693821600', nanos: 0 })).toBe(
      new Date(1693821600 * 1000).toISOString()
    );
  });

  it('returns null for nullish input', () => {
    expect(tsToIso(null)).toBeNull();
    expect(tsToIso(undefined)).toBeNull();
  });
});

describe('toPlayReviews', () => {
  it('maps the latest user comment of each review', () => {
    const reviews = toPlayReviews({
      reviews: [
        {
          reviewId: 'rev1',
          authorName: 'U1',
          comments: [
            {
              userComment: {
                text: 'Good',
                starRating: 5,
                appVersionName: '1.0',
                reviewerLanguage: 'ja',
                lastModified: { seconds: 1756960800, nanos: 0 },
              },
            },
          ],
        },
      ],
    });
    expect(reviews).toHaveLength(1);
    const iso = new Date(1756960800 * 1000).toISOString();
    expect(reviews[0]).toMatchObject({
      reviewId: 'rev1',
      id: `rev1:${iso}`,
      content: 'Good',
      rating: 5,
      versionName: '1.0',
      author: 'U1',
      language: 'ja',
    });
  });

  it('skips reviews without a user comment', () => {
    expect(
      toPlayReviews({ reviews: [{ reviewId: 'x', comments: [] }] })
    ).toEqual([]);
  });

  it('returns empty array for empty response', () => {
    expect(toPlayReviews(null)).toEqual([]);
    expect(toPlayReviews({})).toEqual([]);
  });
});
