import { ethers } from 'ethers'
import { ACTIVE_CHAIN } from './chains'

export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected. Install MetaMask or Rabby.')
  }
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
  const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }) as string, 16)
  return { address: accounts[0], chainId }
}

export async function switchToHashKey(): Promise<boolean> {
  if (!window.ethereum) return false
  const hexChainId = '0x' + ACTIVE_CHAIN.id.toString(16)

  // First try adding the chain (works for both MetaMask and Rabby)
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: hexChainId,
        chainName: ACTIVE_CHAIN.name,
        rpcUrls: [ACTIVE_CHAIN.rpc],
        blockExplorerUrls: [ACTIVE_CHAIN.explorer],
        nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
      }],
    })
    return true
  } catch {
    // If addChain fails, try switchChain
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      })
      return true
    } catch (err) {
      console.error('Failed to switch network:', err)
      return false
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
