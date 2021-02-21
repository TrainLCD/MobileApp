import { ApolloClient, InMemoryCache } from '@apollo/client';
// eslint-disable-next-line import/no-unresolved
import { API_URL } from '@env';

const client = new ApolloClient({
  uri: 'https://sapi.tinykitten.me/graphql',
  cache: new InMemoryCache(),
});

export default client;
