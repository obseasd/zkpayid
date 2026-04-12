export interface ChainConfig {
  id: number
  name: string
  rpc: string
  explorer: string
  faucet?: string
  nativeSymbol: string
  contracts: {
    zkCreditScore?: string
  }
}

export const HASHKEY_TESTNET: ChainConfig = {
  id: 133,
  name: 'HashKey Chain Testnet',
  rpc: 'https://testnet.hsk.xyz',
  explorer: 'https://hashkey.blockscout.com',
  faucet: 'https://hashkeychain.net/faucet',
  nativeSymbol: 'HSK',
  contracts: {
    zkCreditScore: '', // Will be filled after deployment
  },
}

export const HASHKEY_MAINNET: ChainConfig = {
  id: 177,
  name: 'HashKey Chain',
  rpc: 'https://mainnet.hsk.xyz',
  explorer: 'https://explorer.hashkeychain.net',
  nativeSymbol: 'HSK',
  contracts: {},
}

export const ACTIVE_CHAIN = HASHKEY_TESTNET
