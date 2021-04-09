import { ApolloClient, InMemoryCache } from '@apollo/client';

const getClient = (dev: boolean): ApolloClient<unknown> =>
  new ApolloClient({
    uri: dev ? process.env.API_URL_STG : process.env.API_URL_PROD,
    cache: new InMemoryCache(),
  });

export default getClient;
