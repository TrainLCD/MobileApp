import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://sapi.tinykitten.me',
  cache: new InMemoryCache(),
});

export default client;
