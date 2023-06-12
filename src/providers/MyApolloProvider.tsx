import { ApolloProvider } from '@apollo/client'
import React from 'react'
import Loading from '../components/Loading'
import useMyApolloClient from '../hooks/useMyApolloClient'

type Props = {
  children: React.ReactNode
}

const MyApolloProvider: React.FC<Props> = ({ children }) => {
  const client = useMyApolloClient()

  if (!client) {
    return <Loading />
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

export default MyApolloProvider
