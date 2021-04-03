import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: __DEV__ ? process.env.API_URL_STG : process.env.API_URL_PROD,
  cache: new InMemoryCache(),
});

export default client;
