import { ethers } from 'ethers'
import { ACTIVE_CHAIN } from './chains'

export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not installed')
  }
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
  const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }) as string, 16)
  return { address: accounts[0], chainId }
}

export async function switchToHashKey(): Promise<void> {
  if (!window.ethereum) return
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + ACTIVE_CHAIN.id.toString(16) }],
    })
  } catch (err: unknown) {
    const switchError = err as { code?: number }
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + ACTIVE_CHAIN.id.toString(16),
          chainName: ACTIVE_CHAIN.name,
          rpcUrls: [ACTIVE_CHAIN.rpc],
          blockExplorerUrls: [ACTIVE_CHAIN.explorer],
          nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
        }],
      })
    }
  }
}

export async function getBalance(address: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpc)
  const balance = await provider.getBalance(address)
  return ethers.formatEther(balance)
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, cb: (...args: unknown[]) => void) => void
      removeListener: (event: string, cb: (...args: unknown[]) => void) => void
    }
  }
}
