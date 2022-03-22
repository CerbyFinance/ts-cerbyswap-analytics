import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import gql from 'graphql-tag'
import { Transaction, TransactionType } from 'types'
import { formatTokenSymbol } from 'utils/tokens'

const POOL_TRANSACTIONS = gql`
  query transactions($address: Bytes!) {
    pool(id: $address) {
      id
      symbol
      name
      decimals
      poolTransactions(first: 1000, orderBy: timestamp, orderDirection: desc) {
        transaction {
          id
          swaps(first: 1000, orderBy: logIndex, orderDirection: asc) {
            feedType
            amountTokensIn
            amountTokensOut
            amountFeesCollected
            token	{
              id
              symbol
              name
              decimals
              token
            }
            logIndex
          }
          liqudity(first: 1000, orderBy: logIndex, orderDirection: asc, where:{ token: $address }) {
            id
            feedType
            amountTokens
            amountCerUsd
            amountLpTokensBalanceToBurn
            logIndex
          }
          timestamp
        }
      }
    }
  }
`

export interface TransactionResults {
  pool: {
    id: string
    symbol: string
    name: string
    decimals: number
    poolTransactions: {
      transaction: {
        id: string
        from: string
        swaps: {
          feedType: "buy" | "sell"
          amountTokensIn: string
          amountTokensOut: string
          amountFeesCollected: string
          token: {
            id: string
            symbol: string
            name: string
            decimals: number
            token: string
          }
          logIndex: string
        }[]
        liqudity: {
          id: string
          feedType: "add" | "remove"
          amountTokens: string
          amountCerUsd: string
          amountLpTokensBalanceToBurn: string
          logIndex: string
        }[],
        timestamp: string
      }
    }[]
  }
}

type normalizedSwap = TransactionResults["pool"]["poolTransactions"][0]["transaction"]["swaps"][0] & { CerUSD: number, TokenAmount: number };

export function normalization(swap: TransactionResults["pool"]["poolTransactions"][0]["transaction"]["swaps"][0]): normalizedSwap {
  return {
    ...swap,
    CerUSD: +(swap.feedType == 'buy' ? swap.amountTokensIn : swap.amountTokensOut) / 1e18,
    TokenAmount: +(swap.feedType == 'sell' ? swap.amountTokensIn : swap.amountTokensOut) / 10 ** swap.token.decimals
  }
}

export async function fetchPoolTransactions(
  address: string,
  client: ApolloClient<NormalizedCacheObject>
): Promise<{ data: Transaction[] | undefined; error: boolean; loading: boolean }> {
  const { data, error, loading } = await client.query<TransactionResults>({
    query: POOL_TRANSACTIONS,
    variables: {
      address: address,
    },
    fetchPolicy: 'cache-first',
  })

  if (error) {
    return {
      data: undefined,
      error: true,
      loading: false,
    }
  }

  if (loading && !data) {
    return {
      data: undefined,
      error: false,
      loading: true,
    }
  }
  const CerUSD = "0x333333f9E4ba7303f1ac0BF8fE1F47d582629194";
  
  const swaps: Transaction[] = [];
  const mints: Transaction[] = [];
  const burns: Transaction[] = [];

  data.pool.poolTransactions.forEach((poolTransaction) => {
    const transaction = poolTransaction.transaction;

    // Swaps
    let normalizedSwaps: (normalizedSwap & { i: number })[] = [];

    if(transaction.swaps.length) {
        normalizedSwaps = transaction.swaps.map((t, i): normalizedSwap & { i: number } => { return { ...normalization(t), i }});
    }

    while(normalizedSwaps.length) {
        const swap = normalizedSwaps[0];
        normalizedSwaps.splice(0, 1);

        if(normalizedSwaps.length > 1) {
          const maybeRelated = normalizedSwaps.findIndex((related) => { return swap.feedType != related.feedType && swap.CerUSD == related.CerUSD });
          if(~maybeRelated) {
            const Related = normalizedSwaps[maybeRelated];
            // swaps.push(`Swap ${swap.feedType} ${swap.token.symbol} ${swap.feedType == 'buy' ? "<<" : ">>"} ${Related.token.symbol}; CerUSD: ${swap.CerUSD}, ${Related.token.symbol}: ${Related.TokenAmount}, ${swap.token.symbol}: ${swap.TokenAmount}`)
            swaps.push({
              type: TransactionType.SWAP,
              hash: transaction.id,
              sender: transaction.from,
              token0Symbol: formatTokenSymbol(swap.token.token, swap.token.symbol),
              token1Symbol: formatTokenSymbol(Related.token.token, Related.token.symbol),
              token0Address: swap.token.token,
              token1Address: Related.token.token,
              amountUSD: swap.CerUSD,
              amountToken0: swap.TokenAmount,
              amountToken1: Related.TokenAmount,
              timestamp: transaction.timestamp
            })
            normalizedSwaps.splice(maybeRelated, 1);
            continue;
          }
        }
        // swaps.push(`Swap ${swap.feedType} ${swap.token.symbol}; CerUSD: ${+(swap.feedType == 'buy' ? swap.amountTokensIn : swap.amountTokensOut) / 1e18}, ${swap.token.symbol}: ${+(swap.feedType == 'sell' ? swap.amountTokensIn : swap.amountTokensOut) / 10*swap.token.decimals} `)
        let token0Symbol, token1Symbol, token0Address, token1Address, amountToken0, amountToken1;
        if(swap.feedType == 'buy') {
          token0Symbol = formatTokenSymbol(CerUSD, 'CerUSD');
          token0Address = CerUSD;
          token1Symbol = formatTokenSymbol(swap.token.token, swap.token.symbol);
          token1Address = swap.token.token;
          amountToken0 = swap.CerUSD;
          amountToken1 = swap.TokenAmount;
        } else {
          token1Symbol = formatTokenSymbol(CerUSD, 'CerUSD');
          token1Address = CerUSD;
          token0Symbol = formatTokenSymbol(swap.token.token, swap.token.symbol);
          token0Address = swap.token.token;
          amountToken1 = swap.CerUSD;
          amountToken0 = swap.TokenAmount;
        }
        swaps.push({
          type: TransactionType.SWAP,
          hash: transaction.id,
          sender: transaction.from,
          token0Symbol,
          token1Symbol,
          token0Address,
          token1Address,
          amountUSD: swap.CerUSD,
          amountToken0,
          amountToken1,
          timestamp: transaction.timestamp
        })
    }
  })


  // const mints = data.mints.map((m) => {
  //   return {
  //     type: TransactionType.MINT,
  //     hash: m.transaction.id,
  //     timestamp: m.timestamp,
  //     sender: m.origin,
  //     token0Symbol: formatTokenSymbol(m.pool.token0.id, m.pool.token0.symbol),
  //     token1Symbol: formatTokenSymbol(m.pool.token1.id, m.pool.token1.symbol),
  //     token0Address: m.pool.token0.id,
  //     token1Address: m.pool.token1.id,
  //     amountUSD: parseFloat(m.amountUSD),
  //     amountToken0: parseFloat(m.amount0),
  //     amountToken1: parseFloat(m.amount1),
  //   }
  // })
  // const burns = data.burns.map((m) => {
  //   return {
  //     type: TransactionType.BURN,
  //     hash: m.transaction.id,
  //     timestamp: m.timestamp,
  //     sender: m.owner,
  //     token0Symbol: formatTokenSymbol(m.pool.token0.id, m.pool.token0.symbol),
  //     token1Symbol: formatTokenSymbol(m.pool.token1.id, m.pool.token1.symbol),
  //     token0Address: m.pool.token0.id,
  //     token1Address: m.pool.token1.id,
  //     amountUSD: parseFloat(m.amountUSD),
  //     amountToken0: parseFloat(m.amount0),
  //     amountToken1: parseFloat(m.amount1),
  //   }
  // })

  // const swaps = data.swaps.map((m) => {
  //   return {
  //     type: TransactionType.SWAP,
  //     hash: m.transaction.id,
  //     timestamp: m.timestamp,
  //     sender: m.origin,
  //     token0Symbol: formatTokenSymbol(m.pool.token0.id, m.pool.token0.symbol),
  //     token1Symbol: formatTokenSymbol(m.pool.token1.id, m.pool.token1.symbol),
  //     token0Address: m.pool.token0.id,
  //     token1Address: m.pool.token1.id,
  //     amountUSD: parseFloat(m.amountUSD),
  //     amountToken0: parseFloat(m.amount0),
  //     amountToken1: parseFloat(m.amount1),
  //   }
  // })

  return { data: [...mints, ...burns, ...swaps], error: false, loading: false }
}
