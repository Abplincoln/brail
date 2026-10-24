import { useState, useEffect, useCallback } from 'react'
import { createWalletClient, custom, type WalletClient, type Address } from 'viem'
import { botChainTestnet, BOHR_CHAIN_ID_HEX } from '../config/chain'

declare global {
  interface Window {
    ethereum?: any
  }
}

export interface WalletState {
  address: Address | null
  chainId: number | null
  isConnecting: boolean
  isConnected: boolean
  isWrongNetwork: boolean
  error: string | null
  walletClient: WalletClient | null
  connect: () => Promise<void>
  disconnect: () => void
  switchToBohrTestnet: () => Promise<void>
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<Address | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null)

  const isConnected = !!address
  const isWrongNetwork = isConnected && chainId !== botChainTestnet.id

  const updateAccountAndChain = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return

    try {
      const client = createWalletClient({
        chain: botChainTestnet,
        transport: custom(window.ethereum),
      })
      setWalletClient(client)

      const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0] as Address)
      } else {
        setAddress(null)
      }

      const chainIdHex: string = await window.ethereum.request({ method: 'eth_chainId' })
      if (chainIdHex) {
        setChainId(parseInt(chainIdHex, 16))
      }
    } catch (err: any) {
      console.error('Error updating account state:', err)
    }
  }, [])

  useEffect(() => {
    updateAccountAndChain()

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0] as Address)
          setError(null)
        } else {
          setAddress(null)
          setWalletClient(null)
        }
      }

      const handleChainChanged = (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16))
        setError(null)
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
          window.ethereum.removeListener('chainChanged', handleChainChanged)
        }
      }
    }
  }, [updateAccountAndChain])

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('No EVM wallet detected. Please install MetaMask, Rabby, or another compatible wallet.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0] as Address)
      }

      const chainIdHex: string = await window.ethereum.request({ method: 'eth_chainId' })
      setChainId(parseInt(chainIdHex, 16))

      const client = createWalletClient({
        chain: botChainTestnet,
        transport: custom(window.ethereum),
      })
      setWalletClient(client)
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection rejected by user in wallet.')
      } else {
        setError(err.message || 'Failed to connect wallet.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setWalletClient(null)
    setError(null)
  }

  const switchToBohrTestnet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Wallet is not available to switch networks.')
      return
    }

    setError(null)
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BOHR_CHAIN_ID_HEX }],
      })
      setChainId(botChainTestnet.id)
    } catch (switchError: any) {
      // 4902 signifies the chain has not been added to the wallet yet
      if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BOHR_CHAIN_ID_HEX,
                chainName: 'BOT Chain Bohr Testnet',
                nativeCurrency: {
                  name: 'BOT',
                  symbol: 'BOT',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.bohr.life'],
                blockExplorerUrls: ['https://scan.bohr.life'],
              },
            ],
          })
          setChainId(botChainTestnet.id)
        } catch (addError: any) {
          setError(addError.message || 'Failed to add Bohr Testnet to wallet.')
        }
      } else if (switchError.code === 4001) {
        setError('Network switch canceled by user.')
      } else {
        setError(switchError.message || 'Failed to switch network.')
      }
    }
  }

  return {
    address,
    chainId,
    isConnecting,
    isConnected,
    isWrongNetwork,
    error,
    walletClient,
    connect,
    disconnect,
    switchToBohrTestnet,
  }
}
