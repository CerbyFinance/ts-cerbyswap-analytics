import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import gql from 'graphql-tag'
import { TokenChartEntry } from 'state/tokens/reducer'

// format dayjs with the libraries that we need
dayjs.extend(utc)
dayjs.extend(weekOfYear)
const ONE_DAY_UNIX = 24 * 60 * 60

const TOKEN_CHART = gql`
  query poolDailies($startTime: Int!, $skip: Int!, $address: Bytes!) {
    poolDailies(
      first: 1000
      skip: $skip
      where: { token: $address, startUnix_gt: $startTime }
      orderBy: startUnix
      orderDirection: asc
      subgraphError: allow
    ) {
      startUnix
      volumeUSD
      balanceCerUsd
      APR
    }
  }
`

interface ChartResults {
  poolDailies: {
    startUnix: number
    volumeUSD: string
    balanceCerUsd: string
    APR: string
  }[]
}

export async function fetchTokenChartData(address: string, client: ApolloClient<NormalizedCacheObject>) {
  let data: {
    startUnix: number
    volumeUSD: string
    balanceCerUsd: string
    APR: string
  }[] = []
  const startTimestamp = 1619170975
  const endTimestamp = dayjs.utc().unix()

  let error = false
  let skip = 0
  let allFound = false

  try {
    while (!allFound) {
      const { data: chartResData, error, loading } = await client.query<ChartResults>({
        query: TOKEN_CHART,
        variables: {
          address: address,
          startTime: startTimestamp,
          skip,
        },
        fetchPolicy: 'cache-first',
      })
      if (!loading) {
        skip += 1000
        if (chartResData.poolDailies.length < 1000 || error) {
          allFound = true
        }
        if (chartResData) {
          data = data.concat(chartResData.poolDailies)
        }
      }
    }
  } catch {
    error = true
  }

  if (data) {
    const formattedExisting = data.reduce((accum: { [date: number]: TokenChartEntry }, dayData) => {
      const roundedDate = parseInt((dayData.startUnix / ONE_DAY_UNIX).toFixed(0))
      accum[roundedDate] = {
        date: dayData.startUnix,
        volumeUSD: +dayData.volumeUSD / 1e18,
        balanceCerUsd: +dayData.balanceCerUsd / 1e18,
        APR: +dayData.APR
      }
      return accum
    }, {})

    const firstEntry = formattedExisting[parseInt(Object.keys(formattedExisting)[0])]

    // fill in empty days ( there will be no day datas if no trades made that day )
    let timestamp = firstEntry?.date ?? startTimestamp
    let latestTvl = firstEntry?.balanceCerUsd ?? 0
    const latestAPR = firstEntry?.APR ?? 0
    while (timestamp < endTimestamp - ONE_DAY_UNIX) {
      const nextDay = timestamp + ONE_DAY_UNIX
      const currentDayIndex = parseInt((nextDay / ONE_DAY_UNIX).toFixed(0))
      if (!Object.keys(formattedExisting).includes(currentDayIndex.toString())) {
        formattedExisting[currentDayIndex] = {
          date: nextDay,
          volumeUSD: 0,
          balanceCerUsd: latestTvl,
          APR: latestAPR
        }
      } else {
        latestTvl = formattedExisting[currentDayIndex].balanceCerUsd
      }
      timestamp = nextDay
    }

    const dateMap = Object.keys(formattedExisting).map((key) => {
      return formattedExisting[parseInt(key)]
    })

    return {
      data: dateMap,
      error: false,
    }
  } else {
    return {
      data: undefined,
      error,
    }
  }
}
