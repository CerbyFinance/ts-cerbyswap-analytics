import { ApolloClient, InMemoryCache } from '@apollo/client'

const GRAPH_SERVER: string | undefined = process.env.REACT_APP_GRAPH_SERVER;

if(!GRAPH_SERVER) {
  console.log(process.env)
  throw new Error("Please specify in .env the domain graph of the server");
}


export const healthClient = new ApolloClient({
  uri: `${GRAPH_SERVER}:8031/graphql`,
  cache: new InMemoryCache(),
});

// export const blockClient = new ApolloClient({
//   uri: `${GRAPH_SERVER}:8000/subgraphs/name/CerbySwap/testGanache`,
//   cache: new InMemoryCache(),
//   queryDeduplication: true,
//   defaultOptions: {
//     watchQuery: {
//       fetchPolicy: 'no-cache',
//     },
//     query: {
//       fetchPolicy: 'no-cache',
//       errorPolicy: 'all',
//     }
//   },
// });

export const client = new ApolloClient({
  uri: `${GRAPH_SERVER}:8000/subgraphs/name/CerbySwap/testGanache`,
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
});

export const polygonClient = new ApolloClient({
  uri: `${GRAPH_SERVER}:8000/subgraphs/name/CerbySwap/Polygon`,
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

// export const polygonBlockClient = new ApolloClient({
//   uri: 'https://api.thegraph.com/subgraphs/name/ianlapham/polygon-blocks`,
//   cache: new InMemoryCache(),
//   queryDeduplication: true,
//   defaultOptions: {
//     watchQuery: {
//       fetchPolicy: 'cache-first',
//     },
//     query: {
//       fetchPolicy: 'cache-first',
//       errorPolicy: 'all',
//     },
//   },
// })


export const binanceClient = new ApolloClient({
  uri: `${GRAPH_SERVER}:8000/subgraphs/name/CerbySwap/Binance`,
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

export const avalancheClient = new ApolloClient({
  uri: `${GRAPH_SERVER}:8000/subgraphs/name/CerbySwap/Avalanche`,
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})


export const fantomClient = new ApolloClient({
  uri: `${GRAPH_SERVER}:8000/subgraphs/name/CerbySwap/Fantom`,
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})