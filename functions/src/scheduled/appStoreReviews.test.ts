import { parseApiReviews } from './appStoreReviews';

afterEach(() => {
  jest.clearAllMocks();
});

describe('parseApiReviews', () => {
  it('parses entries from the App Store Connect API response', () => {
    const data = {
      data: [
        {
          id: '12345',
          attributes: {
            rating: 5,
            title: 'Great',
            body: 'Awesome app',
            reviewerNickname: 'User1',
            createdDate: '2025-09-03T10:00:00-07:00',
            territory: 'JPN',
          },
        },
      ],
    };
    const reviews = parseApiReviews(data);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      id: '12345',
      rating: 5,
      title: 'Great',
      content: 'Awesome app',
      author: 'User1',
      territory: 'JPN',
    });
  });

  it('handles multiple entries', () => {
    const data = {
      data: [
        {
          id: '1',
          attributes: {
            rating: 4,
            title: 'Good',
            body: 'Nice',
            createdDate: '2025-09-01T00:00:00Z',
          },
        },
        {
          id: '2',
          attributes: {
            rating: 2,
            title: 'Bad',
            body: 'Needs work',
            createdDate: '2025-09-02T00:00:00Z',
          },
        },
      ],
    };
    expect(parseApiReviews(data)).toHaveLength(2);
  });

  it('returns empty array for empty data', () => {
    expect(parseApiReviews({ data: [] })).toEqual([]);
    expect(parseApiReviews({})).toEqual([]);
  });

  it('skips entries without id or createdDate', () => {
    const data = {
      data: [
        { attributes: { rating: 3, createdDate: '2025-09-03T00:00:00Z' } },
        { id: '2', attributes: { rating: 3 } },
        {
          id: '3',
          attributes: { rating: 5, createdDate: '2025-09-03T00:00:00Z' },
        },
      ],
    };
    const reviews = parseApiReviews(data);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].id).toBe('3');
  });

  it('defaults missing optional fields', () => {
    const data = {
      data: [
        {
          id: '1',
          attributes: {
            createdDate: '2025-09-03T00:00:00Z',
          },
        },
      ],
    };
    const reviews = parseApiReviews(data);
    expect(reviews[0]).toMatchObject({
      title: '',
      content: '',
      rating: 0,
      author: undefined,
      territory: undefined,
    });
  });
});
