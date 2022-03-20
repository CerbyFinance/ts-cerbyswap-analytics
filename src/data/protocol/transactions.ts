import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import gql from 'graphql-tag'
import { Transaction, TransactionType } from 'types'
import { formatTokenSymbol } from 'utils/tokens'

const GLOBAL_TRANSACTIONS = gql`
  query {
    transactions(first: 1000, orderBy: timestamp, orderDirection: desc) {
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
      id
      from
      timestamp
    }
    liqudityEvents(first: 1000, orderBy: logIndex, orderDirection: asc) {
      id
      feedType
      amountTokens
      amountCerUsd
      amountLpTokensBalanceToBurn
      token	{
        id
        symbol
        name
        decimals
        token
      }
      transaction {
        timestamp
        from
        id
      }
      logIndex
    }
  }
`

type TransactionResults = {
  transactions: {
    id: string
    from: string
    timestamp: string
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
  }[]
  liqudityEvents: {
    id: string
    feedType: "add" | "remove"
    amountTokens: string
    amountCerUsd: string
    amountLpTokensBalanceToBurn: string
    token: {
      id: string
      symbol: string
      name: string
      decimals: number
      token: string
    }
    transaction: {
      id: string
      from: string
      timestamp: string
    }
    logIndex: string
  }[],

}

type normalizedSwap = TransactionResults["transactions"][0]["swaps"][0] & { CerUSD: number, TokenAmount: number };

export function swapNormalization(swap: TransactionResults["transactions"][0]["swaps"][0]): normalizedSwap {
  return {
    ...swap,
    CerUSD: +(swap.feedType == 'buy' ? swap.amountTokensIn : swap.amountTokensOut) / 1e18,
    TokenAmount: +(swap.feedType == 'sell' ? swap.amountTokensIn : swap.amountTokensOut) / 10 ** swap.token.decimals
  }
}


type normalizedLiqudity = TransactionResults["liqudityEvents"][0] & { CerUSD: number, TokenAmount: number };

export function liqudityNormalization(liqudity: TransactionResults["liqudityEvents"][0]): normalizedLiqudity {
  return {
    ...liqudity,
    CerUSD: +liqudity.amountCerUsd / 1e18,
    TokenAmount: +liqudity.amountTokens / 10 ** liqudity.token.decimals
  }
}

export async function fetchTopTransactions(
  client: ApolloClient<NormalizedCacheObject>
): Promise<Transaction[] | undefined> {
  try {
    const { data, error, loading } = await client.query<TransactionResults>({
      query: GLOBAL_TRANSACTIONS,
      fetchPolicy: 'cache-first',
    })

    if (error || loading || !data) {
      return undefined
    }

    const CerUSD = "0x333333f9E4ba7303f1ac0BF8fE1F47d582629194";

    const swaps: Transaction[] = [];

    data.transactions.forEach((transaction) => {

      // Swaps
      let normalizedSwaps: (normalizedSwap & { i: number })[] = [];

      if(transaction.swaps.length) {
          normalizedSwaps = transaction.swaps.map((t, i): normalizedSwap & { i: number } => { return { ...swapNormalization(t), i }});
      }

      while(normalizedSwaps.length) {
          const swap = normalizedSwaps[0];
          normalizedSwaps.splice(0, 1);
          console.log(normalizedSwaps);
          // console.log(normalizedSwaps);
          if(normalizedSwaps.length >= 1) {
            const maybeRelated = normalizedSwaps.findIndex((related) => { return swap.feedType != related.feedType && swap.CerUSD == related.CerUSD });
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
          // console.log(CerUSD, swap.token.token)
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


    const liqudityEvents: Transaction[] = 
      data.liqudityEvents.map(l =>  {
          const liqudity = liqudityNormalization(l)
          let token0Symbol, token1Symbol, token0Address, token1Address, amountToken0, amountToken1;
          if(liqudity.feedType == 'add') {
            token0Symbol = formatTokenSymbol(CerUSD, 'CerUSD');
            token0Address = CerUSD;
            token1Symbol = formatTokenSymbol(liqudity.token.token, liqudity.token.symbol);
            token1Address = liqudity.token.token;
            amountToken0 = liqudity.CerUSD;
            amountToken1 = liqudity.TokenAmount;
          } else {
            token1Symbol = formatTokenSymbol(CerUSD, 'CerUSD');
            token1Address = CerUSD;
            token0Symbol = formatTokenSymbol(liqudity.token.token, liqudity.token.symbol);
            token0Address = liqudity.token.token;
            amountToken1 = liqudity.CerUSD;
            amountToken0 = liqudity.TokenAmount;
          }
          return {
            type: liqudity.feedType == 'add' ? TransactionType.MINT : TransactionType.BURN,
            hash: liqudity.transaction.id,
            timestamp: liqudity.transaction.timestamp,
            sender: liqudity.transaction.from,
            token0Symbol,
            token1Symbol,
            token0Address,
            token1Address,
            amountUSD: liqudity.CerUSD,
            amountToken0,
            amountToken1,
          }
      })


    return [...swaps, ...liqudityEvents];
  } catch {
    return undefined
  }
}
