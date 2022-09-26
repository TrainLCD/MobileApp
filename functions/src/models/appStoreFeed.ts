export type AppStoreReviewFeed = {
  '?xml': string;
  feed: AppStoreReviewFeedData;
};

export type AppStoreReviewFeedData = {
  id: number;
  title: string;
  updated: string;
  link: string[];
  icon: string;
  author: Author;
  rights: string;
  entry: AppStoreReviewEntry[];
};

type Author = {
  name: string;
  uri: string;
};

export type AppStoreReviewEntry = {
  id: number;
  title: string;
  content: string[];
  'im:contentType': string;
  'im:voteSum': number;
  'im:voteCount': number;
  'im:rating': number;
  updated: string;
  'im:version': string;
  author: Author;
  link: string;
};

export type AppStoreReviewsDoc = {
  notifiedEntryFeeds: AppStoreReviewFeedData[];
};
