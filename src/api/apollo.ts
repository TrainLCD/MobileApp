import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
} from '@apollo/client';

const getClient = (dev: boolean): ApolloClient<unknown> =>
  new ApolloClient({
    uri: dev ? process.env.API_URL_STG : process.env.API_URL_PROD,
    cache: new InMemoryCache({
      dataIdFromObject(responseObject) {
        // eslint-disable-next-line no-underscore-dangle
        switch (responseObject.__typename) {
          case 'TrainType':
            return `TrainType:${responseObject.groupId}`;
          default:
            return defaultDataIdFromObject(responseObject);
        }
      },
    }),
  });

export default getClient;
