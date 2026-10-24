import { defineChain, createPublicClient, http, isAddress, type Address } from 'viem'

export const botChainTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Bohr Testnet',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOHR Scan',
      url: 'https://scan.bohr.life',
    },
  },
  testnet: true,
})

export const BOHR_CHAIN_ID_HEX = '0x3c8' // 968

export const publicClient = createPublicClient({
  chain: botChainTestnet,
  transport: http('https://rpc.bohr.life'),
})

// Environment or configured contract address
export const ENV_VAULT_ADDRESS = (import.meta.env.VITE_VAULT_ADDRESS || '').trim()

export function getEffectiveVaultAddress(customAddress?: string): Address | null {
  const addr = (customAddress !== undefined ? customAddress : ENV_VAULT_ADDRESS).trim()
  if (addr && isAddress(addr)) {
    return addr as Address
  }
  return null
}
