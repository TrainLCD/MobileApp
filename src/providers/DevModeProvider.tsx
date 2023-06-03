import { ApolloProvider } from '@apollo/client'
import React from 'react'
import useMyApolloClient from '../hooks/useMyApolloClient'

type Props = {
  children: React.ReactNode
}

const MyApolloProvider: React.FC<Props> = ({ children }) => {
  const client = useMyApolloClient()

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

export default MyApolloProvider
