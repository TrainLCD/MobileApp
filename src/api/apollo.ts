import ApolloClient from 'apollo-boost';

const client = new ApolloClient({
  uri: 'https://sapi.tinykitten.me',
});

export default client;
