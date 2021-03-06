import { getPercentChange } from './../../utils/data'
import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { useDeltaTimestamps } from 'utils/queries'
import { useBlocksFromTimestamps } from 'hooks/useBlocksFromTimestamps'
import { get2DayChange } from 'utils/data'
import { TokenData } from 'state/tokens/reducer'
import { useEthPrices } from 'hooks/useEthPrices'
import { formatTokenSymbol, formatTokenName } from 'utils/tokens'
import { useActiveNetworkVersion, useClients } from 'state/application/hooks'
import { calculateTVL } from './priceData'

export const TOKENS_BULK = (block: number | undefined, tokens: string[]) => {
  let tokenString = `[`
  tokens.map((address) => {
    return (tokenString += `"${address}",`)
  })
  tokenString += ']'
  const queryString =
    `
    query superPools {
      pools(where: {id_in: ${tokenString}},` +
    (block ? `block: {number: ${block}} ,` : ``) +
    ` orderBy: balanceCerby, orderDirection: desc, subgraphError: allow) {
        id
        poolId
        token
        vaultAddress
        balanceToken
        balanceCerby
        CreditCerby
        price
        priceUSD
        symbol
        name
        decimals
        latestDailies {
          volumeUSD
          amountFeesCollected
          priceChangePercent
          priceUSDChangePercent
        }
      }
    }
    `
  return gql(queryString)
}

interface TokenFields {
  id: string
  poolId: string
  token: string
  vaultAddress: string
  balanceToken: string
  balanceCerby: string
  CreditCerby: string
  price: string
  priceUSD: string
  symbol: string
  name: string
  decimals: number
  latestDailies: {
    volumeUSD: string
    amountFeesCollected: string
    priceChangePercent: string
    priceUSDChangePercent: string
  }
}

interface TokenDataResponse {
  pools: TokenFields[]
  bundles: {
    ethPriceUSD: string
  }[]
}

/**
 * Fetch top addresses by volume
 */
export function useFetchedTokenDatas(
  tokenAddresses: string[]
): {
  loading: boolean
  error: boolean
  data:
    | {
        [address: string]: TokenData
      }
    | undefined
} {
  const [activeNetwork] = useActiveNetworkVersion()
  const { dataClient } = useClients()

  // get blocks from historic timestamps
  const [t24, t48, tWeek] = useDeltaTimestamps()

  const { blocks, error: blockError } = useBlocksFromTimestamps([t24, t48, tWeek])
  const [block24, block48, blockWeek] = blocks ?? []
  // const ethPrices = useEthPrices()

  const { loading, error, data } = useQuery<TokenDataResponse>(TOKENS_BULK(undefined, tokenAddresses), {
    client: dataClient,
  })

  const { loading: loading24, error: error24, data: data24 } = useQuery<TokenDataResponse>(
    TOKENS_BULK(parseInt(block24?.number), tokenAddresses),
    {
      client: dataClient,
    }
  )

  const { loading: loading48, error: error48, data: data48 } = useQuery<TokenDataResponse>(
    TOKENS_BULK(parseInt(block48?.number), tokenAddresses),
    {
      client: dataClient,
    }
  )

  const { loading: loadingWeek, error: errorWeek, data: dataWeek } = useQuery<TokenDataResponse>(
    TOKENS_BULK(parseInt(blockWeek?.number), tokenAddresses),
    {
      client: dataClient,
    }
  )

  const anyError = Boolean(error || error24 || error48 || blockError || errorWeek)
  const anyLoading = Boolean(loading || loading24 || loading48 || loadingWeek || !blocks)


  // return early if not all data yet
  if (anyError || anyLoading) {
    return {
      loading: anyLoading,
      error: anyError,
      data: undefined,
    }
  }

  const parsed = data?.pools
    ? data.pools.reduce((accum: { [address: string]: TokenFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
      }, {})
    : {}
  const parsed24 = data24?.pools
    ? data24.pools.reduce((accum: { [address: string]: TokenFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
      }, {})
    : {}
  const parsed48 = data48?.pools
    ? data48.pools.reduce((accum: { [address: string]: TokenFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
      }, {})
    : {}
  const parsedWeek = dataWeek?.pools
    ? dataWeek.pools.reduce((accum: { [address: string]: TokenFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
      }, {})
    : {}

  // format data and calculate daily changes
  const formatted = tokenAddresses.reduce((accum: { [address: string]: TokenData }, address) => {
    const current: TokenFields | undefined = parsed[address]
    const oneDay: TokenFields | undefined = parsed24[address]
    const twoDay: TokenFields | undefined = parsed48[address]
    const week: TokenFields | undefined = parsedWeek[address]

    const [volumeUSD, volumeUSDChange] =
      current && oneDay && twoDay
        ? get2DayChange(current.latestDailies.volumeUSD, oneDay.latestDailies.volumeUSD, twoDay.latestDailies.volumeUSD)
        : current
        ? [parseFloat(current.latestDailies.volumeUSD), 0]
        : [0, 0]

    const volumeUSDWeek =
      current && week
        ? parseFloat(current.latestDailies.volumeUSD) - parseFloat(week.latestDailies.volumeUSD)
        : current
        ? parseFloat(current.latestDailies.volumeUSD)
        : 0
    const tvlUSD = current ? calculateTVL(current) : 0
    const tvlUSDChange = getPercentChange(current ? calculateTVL(current).toString() : undefined, oneDay ? calculateTVL(oneDay).toString() : undefined)
    const tvlToken = current ? parseFloat(current.balanceToken) : 0
    const priceUSD = current ? parseFloat(current.priceUSD) : 0
    const priceUSDOneDay = oneDay ? parseFloat(oneDay.priceUSD) : 0
    const priceUSDWeek = week ? parseFloat(week.priceUSD) : 0
    const priceUSDChange = parseFloat(current.latestDailies.priceUSDChangePercent)

    const priceUSDChangeWeek =
      priceUSD && priceUSDWeek ? getPercentChange(priceUSD.toString(), priceUSDWeek.toString()) : 0
    const txCount = 0
      // current && oneDay
      //   ? parseFloat(current.tra) - parseFloat(oneDay.txCount)
      //   : current
      //   ? parseFloat(current.txCount)
      //   : 0
    const feesUSD =
      (current && oneDay
        ? (parseFloat(current.latestDailies.amountFeesCollected) - parseFloat(oneDay.latestDailies.amountFeesCollected)) / 1e16
        : current
        ? parseFloat(current.latestDailies.amountFeesCollected) / 1e16
        : 0) * (+current.priceUSD / +current.price);

    accum[address] = {
      exists: !!current,
      address,
      name: current ? formatTokenName(address, current.name, activeNetwork) : '',
      symbol: current ? formatTokenSymbol(address, current.symbol, activeNetwork) : '',
      volumeUSD,
      volumeUSDChange,
      volumeUSDWeek,
      txCount,
      tvlUSD: tvlUSD,
      feesUSD: feesUSD,
      tvlUSDChange,
      tvlToken: tvlToken / +current.decimals,
      priceUSD,
      priceUSDChange,
      priceUSDChangeWeek,
    }

    return accum
  }, {})

  return {
    loading: anyLoading,
    error: anyError,
    data: formatted,
  }
}
