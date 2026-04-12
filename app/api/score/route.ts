import { NextResponse } from 'next/server'
import { computeCreditScore, generateCommitment } from '@/lib/credit-score'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')

  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }

  try {
    const result = await computeCreditScore(address)
    const nonce = Math.random().toString(36).slice(2)
    const commitment = generateCommitment(address, result.score, nonce)

    return NextResponse.json({
      ...result,
      commitment,
      chain: 'HashKey Chain Testnet',
      chainId: 133,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
