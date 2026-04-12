import { ethers } from 'ethers'
import { readFileSync } from 'fs'

const RPC = 'https://testnet.hsk.xyz'
const PRIVATE_KEY = process.env.PRIVATE_KEY

if (!PRIVATE_KEY) {
  console.error('Set PRIVATE_KEY env var')
  process.exit(1)
}

const provider = new ethers.JsonRpcProvider(RPC)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

console.log('Deployer:', wallet.address)
const balance = await provider.getBalance(wallet.address)
console.log('Balance:', ethers.formatEther(balance), 'HSK')

if (balance === 0n) {
  console.error('No HSK — get testnet tokens from https://hashkeychain.net/faucet')
  process.exit(1)
}

// Read compiled artifact
const artifact = JSON.parse(readFileSync('artifacts/contracts/ZKCreditScore.sol/ZKCreditScore.json', 'utf-8'))

console.log('Deploying ZKCreditScore...')
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet)
const contract = await factory.deploy('0x0000000000000000000000000000000000000001')
console.log('TX sent:', contract.deploymentTransaction()?.hash)

await contract.waitForDeployment()
const address = await contract.getAddress()

console.log('')
console.log('=================================')
console.log('ZKCreditScore deployed to:', address)
console.log('Explorer:', `https://hashkey.blockscout.com/address/${address}`)
console.log('=================================')
