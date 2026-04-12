export interface ChainConfig {
  id: number
  name: string
  rpc: string
  explorer: string
  faucet?: string
  nativeSymbol: string
  contracts: {
    zkCreditScore?: string
    zkGatedPool?: string
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
    zkCreditScore: '0x1d03f395bCC1E5bd0e516bE2C1Aa28950910DDC5',
    zkGatedPool: '0x3338d2791e1cab22835a3975b1401C0f16C2AcCa',
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
