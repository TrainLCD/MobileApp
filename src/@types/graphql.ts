import type * as gql from './graphql.d';

export * from './graphql.d';

export type Station = gql.Station | gql.StationNested;
export type Line = gql.Line | gql.LineNested;
