// import OPTIMISM_LOGO_URL from '../assets/images/optimism.svg'
// import ARBITRUM_LOGO_URL from '../assets/images/arbitrum.svg'
import ETHEREUM_LOGO_URL from '../assets/images/ethereum-logo.png'
import POLYGON_LOGO_URL from '../assets/images/polygon-logo.png'
import BINANCE_LOGO_URL from '../assets/images/bsc.png'
import AVALANCHE_LOGO_URL from '../assets/images/avax.png'
import FANTOM_LOGO_URL from '../assets/images/ftm.png'

export enum SupportedNetwork {
  ETHEREUM,
  BINANCE,
  POLYGON,
  AVALANCHE,
  FANTOM
}

export type NetworkInfo = {
  id: SupportedNetwork
  route: string
  name: string
  imageURL: string
  bgColor: string
  primaryColor: string
  secondaryColor: string
  blurb?: string
}

export const EthereumNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.ETHEREUM,
  route: '',
  name: 'Ethereum',
  bgColor: '#fc077d',
  primaryColor: '#fc077d',
  secondaryColor: '#2172E5',
  imageURL: ETHEREUM_LOGO_URL,
}

export const PolygonNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.POLYGON,
  route: 'polygon',
  name: 'Polygon',
  bgColor: '#8247e5',
  primaryColor: '#8247e5',
  secondaryColor: '#FB7876',
  imageURL: POLYGON_LOGO_URL,
  blurb: '',
}
export const BinanceNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.BINANCE,
  route: 'bsc',
  name: 'BSC',
  bgColor: '#8247e5',
  primaryColor: '#8247e5',
  secondaryColor: '#FB7876',
  imageURL: BINANCE_LOGO_URL,
  blurb: '',
}

export const AvalancheNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.AVALANCHE,
  route: 'avax',
  name: 'Avalanche',
  bgColor: '#8247e5',
  primaryColor: '#8247e5',
  secondaryColor: '#FB7876',
  imageURL: AVALANCHE_LOGO_URL,
  blurb: '',
}

export const FantomNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.FANTOM,
  route: 'ftm',
  name: 'Fantom',
  bgColor: '#8247e5',
  primaryColor: '#8247e5',
  secondaryColor: '#FB7876',
  imageURL: FANTOM_LOGO_URL,
  blurb: '',
}

export const SUPPORTED_NETWORK_VERSIONS: NetworkInfo[] = [
  EthereumNetworkInfo,
  BinanceNetworkInfo,
  PolygonNetworkInfo,
  AvalancheNetworkInfo,
  FantomNetworkInfo
]
