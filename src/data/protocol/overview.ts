import { getPercentChange } from '../../utils/data'
import { ProtocolData } from '../../state/protocol/reducer'
import gql from 'graphql-tag'
import { useQuery, ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { useDeltaTimestamps } from 'utils/queries'
import { useBlocksFromTimestamps } from 'hooks/useBlocksFromTimestamps'
import { useMemo } from 'react'
import { useClients } from 'state/application/hooks'
import { client } from 'apollo/client'

export const GLOBAL_DATA = (block?: string) => {
  const queryString = ` query CerbySwapFactories {
      globals(
       ${block !== undefined ? `block: { number: ${block}}` : ``} 
       first: 1, subgraphError: allow) {
        totalTransactions
        totalVolumeUSD
        totalLiquidityUSD
        Fees
        latestDailies {
          totalVolumeUSD
        }
      }
    }`
  return gql(queryString)
}

interface GlobalResponse {
  globals: {
    totalTransactions: string
    totalVolumeUSD: string
    Fees: string
    totalLiquidityUSD: string
    latestDailies: {
      totalVolumeUSD: string
    }
  }[]
}

export function useFetchProtocolData(
  dataClientOverride?: ApolloClient<NormalizedCacheObject>,
  blockClientOverride?: ApolloClient<NormalizedCacheObject>
): {
  loading: boolean
  error: boolean
  data: ProtocolData | undefined
} {
  // get appropriate clients if override needed
  const { dataClient, blockClient } = useClients()
  const activeDataClient = dataClientOverride ?? dataClient
  const activeBlockClient = blockClientOverride ?? blockClient

  // get blocks from historic timestamps
  const [t24, t48] = useDeltaTimestamps()
  const { blocks, error: blockError } = useBlocksFromTimestamps([t24, t48], activeBlockClient)
  const [block24, block48] = blocks ?? []

  // fetch all data
  const { loading, error, data } = useQuery<GlobalResponse>(GLOBAL_DATA(), { client: activeDataClient })

  const { loading: loading24, error: error24, data: data24 } = useQuery<GlobalResponse>(
    GLOBAL_DATA(block24?.number ?? 0),
    { client: activeDataClient }
  )

  const { loading: loading48, error: error48, data: data48 } = useQuery<GlobalResponse>(
    GLOBAL_DATA(block48?.number ?? 0),
    { client: activeDataClient }
  )

  const anyError = Boolean(error || error24 || error48 || blockError)
  const anyLoading = Boolean(loading || loading24 || loading48)

  const parsed = data?.globals?.[0]
  const parsed24 = data24?.globals?.[0]
  const parsed48 = data48?.globals?.[0]

  const formattedData: ProtocolData | undefined = useMemo(() => {
    if (anyError || anyLoading || !parsed || !blocks) {
      return undefined
    }

    // volume data
    const volumeUSD =
      parsed && parsed24
        ? parseFloat(parsed.latestDailies.totalVolumeUSD) - parseFloat(parsed24.latestDailies.totalVolumeUSD)
        : parseFloat(parsed.latestDailies.totalVolumeUSD)

    const volumeOneWindowAgo =
      parsed24?.latestDailies.totalVolumeUSD && parsed48?.latestDailies.totalVolumeUSD
        ? parseFloat(parsed24.latestDailies.totalVolumeUSD) - parseFloat(parsed48.latestDailies.totalVolumeUSD)
        : undefined

    const volumeUSDChange =
      volumeUSD && volumeOneWindowAgo ? ((volumeUSD - volumeOneWindowAgo) / volumeOneWindowAgo) * 100 : 0

    // total value locked
    const tvlUSDChange = getPercentChange(parsed?.totalLiquidityUSD, parsed24?.totalLiquidityUSD)

    // 24H transactions
    const txCount =
      parsed && parsed24
        ? parseFloat(parsed.totalTransactions) - parseFloat(parsed24.totalTransactions)
        : parseFloat(parsed.totalTransactions)

    const txCountOneWindowAgo =
      parsed24 && parsed48 ? parseFloat(parsed24.totalTransactions) - parseFloat(parsed48.totalTransactions) : undefined

    const txCountChange =
      txCount && txCountOneWindowAgo ? getPercentChange(txCount.toString(), txCountOneWindowAgo.toString()) : 0

    const feesOneWindowAgo = parsed24 && parsed48 ? parseFloat(parsed24.Fees) - parseFloat(parsed48.Fees) : undefined

    const feesUSD = parsed && parsed24 ? parseFloat(parsed.Fees) - parseFloat(parsed24.Fees) : parseFloat(parsed.Fees)

    const feeChange =
      feesUSD && feesOneWindowAgo ? getPercentChange(feesUSD.toString(), feesOneWindowAgo.toString()) : 0

    return {
      volumeUSD: volumeUSD / 1e18,
      volumeUSDChange: typeof volumeUSDChange === 'number' ? volumeUSDChange : 0,
      tvlUSD: parseFloat(parsed.totalLiquidityUSD) / 1e18,
      tvlUSDChange,
      feesUSD,
      feeChange,
      txCount,
      txCountChange,
    }
  }, [anyError, anyLoading, blocks, parsed, parsed24, parsed48])

  return {
    loading: anyLoading,
    error: anyError,
    data: formattedData,
  }
}

export function useFetchAggregateProtocolData(): {
  loading: boolean
  error: boolean
  data: ProtocolData | undefined
} {
  const { data: ethereumData, loading: loadingEthereum, error: errorEthereum } = useFetchProtocolData(
    client,
    client
  )
  // const { data: arbitrumData, loading: loadingArbitrum, error: errorArbitrum } = useFetchProtocolData(
  //   arbitrumClient,
  //   arbitrumBlockClient
  // )

  if (!ethereumData) {
    return {
      data: undefined,
      loading: false,
      error: false,
    }
  }

  // for now until useMultipleDatas hook just manuall construct ProtocolData object

  // console.log(ethereumData)
  // console.log(arbitrumData)

  return {
    data: undefined,
    loading: false,
    error: false,
  }
}
