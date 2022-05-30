import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { isFulfilled } from '@reduxjs/toolkit'
import gql from 'graphql-tag'
import { Transaction, TransactionType } from 'types'
import { formatTokenSymbol } from 'utils/tokens'

const GLOBAL_TRANSACTIONS = gql`
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
            amountUSD
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
            amountCerby
            amountLpTokensBalanceToBurn
            amountUSD
            token	{
              id
              symbol
              name
              decimals
              token
            }
            logIndex
          }
          from
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
          amountUSD: string
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
          amountCerby: string
          amountLpTokensBalanceToBurn: string
          amountUSD: string
          token: {
            id: string
            symbol: string
            name: string
            decimals: number
            token: string
          }
          logIndex: string
        }[],
        timestamp: string
      }
    }[]
  }
}

type normalizedSwap = TransactionResults["pool"]["poolTransactions"][0]["transaction"]["swaps"][0] & { Cerby: number, TokenAmount: number };

export function swapNormalization(swap: TransactionResults["pool"]["poolTransactions"][0]["transaction"]["swaps"][0]): normalizedSwap {
  return {
    ...swap,
    Cerby: +(swap.feedType == 'buy' ? swap.amountTokensIn : swap.amountTokensOut) / 1e18,
    TokenAmount: +(swap.feedType == 'sell' ? swap.amountTokensIn : swap.amountTokensOut) / 10 ** swap.token.decimals
  }
}


type normalizedLiqudity = TransactionResults["pool"]["poolTransactions"][0]["transaction"]["liqudity"][0] & { Cerby: number, TokenAmount: number };

export function liqudityNormalization(liqudity: TransactionResults["pool"]["poolTransactions"][0]["transaction"]["liqudity"][0]): normalizedLiqudity {
  return {
    ...liqudity,
    Cerby: +liqudity.amountCerby / 1e18,
    TokenAmount: +liqudity.amountTokens / 10 ** liqudity.token.decimals
  }
}

export async function fetchTokenTransactions(
  address: string,
  client: ApolloClient<NormalizedCacheObject>
): Promise<{ data: Transaction[] | undefined; error: boolean; loading: boolean }> {
  try {
    const { data, error, loading } = await client.query<TransactionResults>({
      query: GLOBAL_TRANSACTIONS,
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

    const Cerby= "0xdef1fac7Bf08f173D286BbBDcBeeADe695129840";
    
    const swaps: Transaction[] = [];
    const liqudityEvents: Transaction[] = [];

    data.pool.poolTransactions.forEach((poolTransaction) => {
      const transaction = poolTransaction.transaction;

      // Swaps
      let normalizedSwaps: (normalizedSwap & { i: number })[] = [];

      if(transaction.swaps.length) {
          normalizedSwaps = transaction.swaps.map((t, i): normalizedSwap & { i: number } => { return { ...swapNormalization(t), i }});
      }

      while(normalizedSwaps.length) {
          const swap = normalizedSwaps[0];
          normalizedSwaps.splice(0, 1);
          if(normalizedSwaps.length >= 1) {
            const maybeRelated = normalizedSwaps.findIndex((related) => { return swap.feedType != related.feedType && swap.Cerby == related.Cerby });
            if(~maybeRelated) {
              const Related = normalizedSwaps[maybeRelated];
              swaps.push({
                type: TransactionType.SWAP,
                hash: transaction.id,
                sender: transaction.from,
                token0Symbol: formatTokenSymbol(swap.token.token, swap.token.symbol),
                token1Symbol: formatTokenSymbol(Related.token.token, Related.token.symbol),
                token0Address: swap.token.token,
                token1Address: Related.token.token,
                amountUSD: +swap.amountUSD,
                amountToken0: swap.TokenAmount,
                amountToken1: Related.TokenAmount,
                timestamp: transaction.timestamp
              })
              normalizedSwaps.splice(maybeRelated, 1);
              continue;
            }
          }
          // swaps.push(`Swap ${swap.feedType} ${swap.token.symbol}; CerUSD: ${+(swap.feedType == 'buy' ? swap.amountTokensIn : swap.amountTokensOut) / 1e18}, ${swap.token.symbol}: ${+(swap.feedType == 'sell' ? swap.amountTokensIn : swap.amountTokensOut) / 10*swap.token.decimals} `)
          if(swap.token.token == address) {
            let token0Symbol, token1Symbol, token0Address, token1Address, amountToken0, amountToken1;
            if(swap.feedType == 'buy') {
              token0Symbol = formatTokenSymbol(Cerby, 'CERBY');
              token0Address = Cerby;
              token1Symbol = formatTokenSymbol(swap.token.token, swap.token.symbol);
              token1Address = swap.token.token;
              amountToken0 = swap.Cerby;
              amountToken1 = swap.TokenAmount;
            } else {
              token1Symbol = formatTokenSymbol(Cerby, 'CERBY');
              token1Address = Cerby;
              token0Symbol = formatTokenSymbol(swap.token.token, swap.token.symbol);
              token0Address = swap.token.token;
              amountToken1 = swap.Cerby;
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
              amountUSD: +swap.amountUSD,
              amountToken0,
              amountToken1,
              timestamp: transaction.timestamp
            })
        }
      }

      transaction.liqudity.map(l => liqudityNormalization(l)).forEach((liqudity) => {
        let token0Symbol, token1Symbol, token0Address, token1Address, amountToken0, amountToken1;
        if(liqudity.feedType == 'add') {
          token0Symbol = formatTokenSymbol(Cerby, 'CERBY');
          token0Address = Cerby;
          token1Symbol = formatTokenSymbol(liqudity.token.token, liqudity.token.symbol);
          token1Address = liqudity.token.token;
          amountToken0 = liqudity.Cerby;
          amountToken1 = liqudity.TokenAmount;
        } else {
          token1Symbol = formatTokenSymbol(Cerby, 'CERBY');
          token1Address = Cerby;
          token0Symbol = formatTokenSymbol(liqudity.token.token, liqudity.token.symbol);
          token0Address = liqudity.token.token;
          amountToken1 = liqudity.Cerby;
          amountToken0 = liqudity.TokenAmount;
        }
        liqudityEvents.push({
          type: liqudity.feedType == 'add' ? TransactionType.MINT : TransactionType.BURN,
          hash: transaction.id,
          timestamp: transaction.timestamp,
          sender: transaction.from,
          token0Symbol,
          token1Symbol,
          token0Address,
          token1Address,
          amountUSD: +liqudity.amountUSD,
          amountToken0,
          amountToken1,
        })

      })
    })

    return { data: [...swaps, ...liqudityEvents], error: false, loading: false }
  } catch {
    return {
      data: undefined,
      error: true,
      loading: false,
    }
  }
}
