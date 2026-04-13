declare module 'snarkjs' {
  export const groth16: {
    fullProve: (
      input: Record<string, string>,
      wasmPath: string,
      zkeyPath: string
    ) => Promise<{ proof: Record<string, unknown>; publicSignals: string[] }>
    verify: (
      vkey: Record<string, unknown>,
      publicSignals: string[],
      proof: Record<string, unknown>
    ) => Promise<boolean>
  }
}

declare module 'circomlibjs' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function buildPoseidon(): Promise<any>
}
