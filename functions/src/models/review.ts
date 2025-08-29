export interface AppStoreReview {
  id: string;
  title: string;
  content: string;
  rating: number;
  author: string;
  version: string;
  date: string;
  link: string;
}

export interface GooglePlayReview {
  reviewId: string;
  authorName: string;
  content: string;
  starRating: number;
  lastModified: string;
  appVersion: string;
}

export interface ReviewNotificationState {
  platform: 'appstore' | 'googleplay';
  lastProcessedId: string;
  lastProcessedDate: string;
  updatedAt: string;
}
