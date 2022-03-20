import { ChartDayData } from '../../types/index'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import gql from 'graphql-tag'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { useActiveNetworkVersion, useClients } from 'state/application/hooks'

// format dayjs with the libraries that we need
dayjs.extend(utc)
dayjs.extend(weekOfYear)
const ONE_DAY_UNIX = 24 * 60 * 60

const GLOBAL_CHART = gql`
  query CerbySwapDayDatas($startTime: Int!, $skip: Int!) {
    globalDailies(
      first: 1000
      skip: $skip
      subgraphError: allow
      where: { startUnix_gt: $startTime }
      orderBy: startUnix
      orderDirection: asc
    ) {
      id
      totalTransactions
      totalVolumeUSD
      totalLiquidityUSD
      totalPools
      Fees
      startUnix
    }
  }
`

interface ChartResults {
  globalDailies: {
    startUnix: number
    totalVolumeUSD: string
    totalLiquidityUSD: string
  }[]
}

async function fetchChartData(client: ApolloClient<NormalizedCacheObject>) {
  let data: {
    date: number
    volumeUSD: number
    tvlUSD: number
  }[] = []
  const startTimestamp = 0
  const endTimestamp = dayjs.utc().unix()

  let error = false
  let skip = 0
  let allFound = false

  try {
    while (!allFound) {
      const { data: chartResDataRaw, error, loading } = await client.query<ChartResults>({
        query: GLOBAL_CHART,
        variables: {
          startTime: startTimestamp,
          skip,
        },
        fetchPolicy: 'cache-first',
      })
      if (!loading) {
        const chartResData: typeof data = chartResDataRaw.globalDailies.map((daily) => {
          return {
            // ...daily,
            tvlUSD: Math.floor(+daily.totalLiquidityUSD / 1e18),
            volumeUSD: Math.floor(+daily.totalVolumeUSD / 1e18),
            date: daily.startUnix
          };
        })
        skip += 1000
        if (chartResData.length < 1000 || error) {
          allFound = true
        }
        if (chartResData) {
          data = data.concat(chartResData)
        }
      }
    }
  } catch(err) {
    error = true
    console.error(err)
  }

  console.log(data)

  if (data) {
    const formattedExisting = data.reduce((accum: { [date: number]: ChartDayData }, dayData) => {
      const roundedDate = parseInt((dayData.date / ONE_DAY_UNIX).toFixed(0))
      accum[roundedDate] = {
        date: dayData.date,
        volumeUSD: dayData.volumeUSD,
        tvlUSD: dayData.tvlUSD
      }
      return accum
    }, {})

    const firstEntry = formattedExisting[parseInt(Object.keys(formattedExisting)[0])]

    // fill in empty days ( there will be no day datas if no trades made that day )
    let timestamp = firstEntry?.date ?? startTimestamp
    let latestTvl = firstEntry?.tvlUSD ?? 0
    while (timestamp < endTimestamp - ONE_DAY_UNIX) {
      const nextDay = timestamp + ONE_DAY_UNIX
      const currentDayIndex = parseInt((nextDay / ONE_DAY_UNIX).toFixed(0))
      if (!Object.keys(formattedExisting).includes(currentDayIndex.toString())) {
        formattedExisting[currentDayIndex] = {
          date: nextDay,
          volumeUSD: 0,
          tvlUSD: latestTvl,
        }
      } else {
        latestTvl = formattedExisting[currentDayIndex].tvlUSD
      }
      timestamp = nextDay
    }

    return {
      data: Object.values(formattedExisting),
      error: false,
    }
  } else {
    return {
      data: undefined,
      error,
    }
  }
}

/**
 * Fetch historic chart data
 */
export function useFetchGlobalChartData(): {
  error: boolean
  data: ChartDayData[] | undefined
} {
  const [data, setData] = useState<{ [network: string]: ChartDayData[] | undefined }>()
  const [error, setError] = useState(false)
  const { dataClient } = useClients()

  const [activeNetworkVersion] = useActiveNetworkVersion()
  const indexedData = data?.[activeNetworkVersion.id]

  useEffect(() => {
    async function fetch() {
      const { data, error } = await fetchChartData(dataClient)
      if (data && !error) {
        setData({
          [activeNetworkVersion.id]: data,
        })
      } else if (error) {
        setError(true)
      }
    }
    if (!indexedData && !error) {
      fetch()
    }
  }, [data, error, dataClient, indexedData, activeNetworkVersion.id])

  return {
    error,
    data: indexedData,
  }
}
