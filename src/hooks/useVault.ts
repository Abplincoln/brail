import { useState, useEffect, useCallback } from 'react'
import {
  parseEther,
  formatEther,
  isAddress,
  type Address,
  type WalletClient,
} from 'viem'
import { publicClient, botChainTestnet, getEffectiveVaultAddress, VAULT_DEPLOYMENT_BLOCK } from '../config/chain'
import { brailVaultAbi } from '../contracts/brailVaultAbi'

export interface VaultState {
  vaultAddress: Address | null
  isConfigured: boolean
  isLoading: boolean
  isOwner: boolean
  ownerAddress: Address | null
  vaultBalance: string
  maxPerWithdrawal: string
  dailyLimit: string
  currentDay: bigint | null
  dailyWithdrawn: string
  availableDailyAllowance: string
  approvedRecipients: Address[]
  activity: VaultActivityItem[]
  txStatus: 'idle' | 'pending' | 'confirmed' | 'failed' | 'rejected'
  txHash: string | null
  txError: string | null
  setCustomAddress: (addr: string) => void
  refresh: () => Promise<void>
  deposit: (amountInBot: string) => Promise<boolean>
  withdraw: (to: Address, amountInBot: string) => Promise<boolean>
  addRecipient: (recipient: Address) => Promise<boolean>
  removeRecipient: (recipient: Address) => Promise<boolean>
  setLimits: (maxInBot: string, dailyInBot: string) => Promise<boolean>
  resetTxStatus: () => void
}

export interface VaultActivityItem {
  type: 'Deposit' | 'Withdrawal' | 'RecipientAdded' | 'RecipientRemoved' | 'LimitsUpdated' | 'OwnershipTransferred'
  title: string
  details: string
  txHash: string
  blockNumber: bigint
}

export function useVault(walletAddress: Address | null, walletClient: WalletClient | null): VaultState {
  const [customAddress, setCustomAddressState] = useState<string>(() => {
    return localStorage.getItem('brail_custom_vault_address') || ''
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [ownerAddress, setOwnerAddress] = useState<Address | null>(null)
  const [vaultBalance, setVaultBalance] = useState<string>('0')
  const [maxPerWithdrawal, setMaxPerWithdrawal] = useState<string>('0')
  const [dailyLimit, setDailyLimit] = useState<string>('0')
  const [currentDay, setCurrentDay] = useState<bigint | null>(null)
  const [dailyWithdrawn, setDailyWithdrawn] = useState<string>('0')
  const [availableDailyAllowance, setAvailableDailyAllowance] = useState<string>('0')
  const [approvedRecipients, setApprovedRecipients] = useState<Address[]>([])
  const [activity, setActivity] = useState<VaultActivityItem[]>([])

  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed' | 'rejected'>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const effectiveAddress = getEffectiveVaultAddress(customAddress)
  const isConfigured = !!effectiveAddress

  const isOwner = !!(
    walletAddress &&
    ownerAddress &&
    walletAddress.toLowerCase() === ownerAddress.toLowerCase()
  )

  const setCustomAddress = (addr: string) => {
    const trimmed = addr.trim()
    setCustomAddressState(trimmed)
    if (trimmed) {
      localStorage.setItem('brail_custom_vault_address', trimmed)
    } else {
      localStorage.removeItem('brail_custom_vault_address')
    }
  }

  const resetTxStatus = () => {
    setTxStatus('idle')
    setTxHash(null)
    setTxError(null)
  }

  const fetchVaultData = useCallback(async () => {
    if (!effectiveAddress) {
      setOwnerAddress(null)
      setVaultBalance('0')
      setMaxPerWithdrawal('0')
      setDailyLimit('0')
      setCurrentDay(null)
      setDailyWithdrawn('0')
      setAvailableDailyAllowance('0')
      setApprovedRecipients([])
      setActivity([])
      return
    }

    setIsLoading(true)
    try {
      // Multicall or parallel contract reads via publicClient
      const [
        ownerRes,
        balanceRes,
        maxRes,
        dailyRes,
        currentDayRes,
        withdrawnRes,
        allowanceRes,
        recipientsRes,
      ] = await Promise.all([
        publicClient.readContract({
          address: effectiveAddress,
          abi: brailVaultAbi,
          functionName: 'owner',
        }).catch(() => null),
        publicClient.readContract({
          address: effectiveAddress,
          abi: brailVaultAbi,
          functionName: 'getVaultBalance',
        }).catch(() => 0n),
        publicClient.readContract({
          address: effectiveAddress,
          abi: brailVaultAbi,
          functionName: 'maxPerWithdrawal',
        }).catch(() => 0n),
        publicClient.readContract({
          address: effectiveAddress,
          abi: brailVaultAbi,
          functionName: 'dailyLimit',
        }).catch(() => 0n),
        publicClient.readContract({
          address: effectiveAddress,
          abi: brailVaultAbi,
          functionName: 'getCurrentDay',
        }).catch(() => 0n),
        publicClient.readContract({
          address: effectiveAddress,
          abi: brailVaultAbi,
          functionName: 'getCurrentDayWithdrawn',
        }).catch(() => 0n),
        publicClient.readContract({
          address: effectiveAddress,
          abi: brailVaultAbi,
          functionName: 'getAvailableDailyAllowance',
        }).catch(() => 0n),
        publicClient.readContract({
          address: effectiveAddress,
          abi: brailVaultAbi,
          functionName: 'getApprovedRecipients',
        }).catch(() => [] as readonly Address[]),
      ])

      if (ownerRes) setOwnerAddress(ownerRes as Address)
      setVaultBalance(formatEther(balanceRes))
      setMaxPerWithdrawal(formatEther(maxRes))
      setDailyLimit(formatEther(dailyRes))
      setCurrentDay(currentDayRes)
      setDailyWithdrawn(formatEther(withdrawnRes))
      setAvailableDailyAllowance(formatEther(allowanceRes))
      setApprovedRecipients([...recipientsRes] as Address[])

      // Query confirmed events from chain starting from deployment block
      try {
        const latestBlock = await publicClient.getBlockNumber()
        const fromBlock = latestBlock > VAULT_DEPLOYMENT_BLOCK ? VAULT_DEPLOYMENT_BLOCK : 0n

        const events = await publicClient.getContractEvents({
          address: effectiveAddress,
          abi: brailVaultAbi,
          fromBlock,
        })

        const formattedActivity: VaultActivityItem[] = events.map((ev) => {
          const type = ev.eventName as VaultActivityItem['type']
          let details = ''
          let title: string = ev.eventName || ''

          if (ev.eventName === 'Deposit') {
            const args = ev.args as any
            title = 'Native Deposit'
            details = `${formatEther(args.amount || 0n)} BOT from ${args.sender?.slice(0, 6)}...${args.sender?.slice(-4)}`
          } else if (ev.eventName === 'Withdrawal') {
            const args = ev.args as any
            title = 'Withdrawal'
            details = `${formatEther(args.amount || 0n)} BOT to ${args.recipient?.slice(0, 6)}...${args.recipient?.slice(-4)} (Day ${args.day?.toString()})`
          } else if (ev.eventName === 'RecipientAdded') {
            const args = ev.args as any
            title = 'Recipient Added'
            details = `Approved: ${args.recipient}`
          } else if (ev.eventName === 'RecipientRemoved') {
            const args = ev.args as any
            title = 'Recipient Removed'
            details = `Revoked: ${args.recipient}`
          } else if (ev.eventName === 'LimitsUpdated') {
            const args = ev.args as any
            title = 'Limits Configured'
            details = `Max: ${formatEther(args.maxPerWithdrawal || 0n)} BOT | Daily: ${formatEther(args.dailyLimit || 0n)} BOT`
          } else if (ev.eventName === 'OwnershipTransferred') {
            const args = ev.args as any
            title = 'Ownership Established'
            details = `Owner set to ${args.newOwner}`
          }

          return {
            type,
            title,
            details,
            txHash: ev.transactionHash,
            blockNumber: ev.blockNumber,
          }
        })

        // Sort descending by block number
        formattedActivity.sort((a, b) => Number(b.blockNumber - a.blockNumber))
        setActivity(formattedActivity.slice(0, 20))
      } catch (logErr) {
        console.warn('Could not query event logs:', logErr)
      }
    } catch (err: any) {
      console.error('Error fetching vault state:', err)
    } finally {
      setIsLoading(false)
    }
  }, [effectiveAddress])

  useEffect(() => {
    fetchVaultData()
  }, [fetchVaultData])

  // Helper for executing transactions
  const executeTransaction = async (
    actionName: string,
    txPromise: () => Promise<`0x${string}`>
  ): Promise<boolean> => {
    if (!walletClient || !walletAddress) {
      setTxError('Please connect your wallet first.')
      setTxStatus('failed')
      return false
    }

    setTxStatus('pending')
    setTxHash(null)
    setTxError(null)

    try {
      const hash = await txPromise()
      setTxHash(hash)

      // Wait for on-chain receipt confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status === 'success') {
        setTxStatus('confirmed')
        await fetchVaultData()
        return true
      } else {
        setTxStatus('failed')
        setTxError(`Transaction reverted on-chain.`)
        return false
      }
    } catch (err: any) {
      console.error(`Error during ${actionName}:`, err)
      if (err.code === 4001 || err.message?.includes('User rejected') || err.message?.includes('denied')) {
        setTxStatus('rejected')
        setTxError('Transaction was rejected in your wallet.')
      } else {
        setTxStatus('failed')
        const message = err.shortMessage || err.details || err.message || 'Transaction failed.'
        setTxError(message)
      }
      return false
    }
  }

  const deposit = async (amountInBot: string): Promise<boolean> => {
    if (!effectiveAddress) return false
    const parsed = parseEther(amountInBot)
    if (parsed <= 0n) {
      setTxError('Deposit amount must be greater than zero.')
      setTxStatus('failed')
      return false
    }

    return executeTransaction('deposit', async () => {
      const { request } = await publicClient.simulateContract({
        address: effectiveAddress,
        abi: brailVaultAbi,
        functionName: 'deposit',
        value: parsed,
        account: walletAddress!,
      })
      return walletClient!.writeContract(request)
    })
  }

  const withdraw = async (to: Address, amountInBot: string): Promise<boolean> => {
    if (!effectiveAddress) return false
    if (!isAddress(to)) {
      setTxError('Destination address is invalid.')
      setTxStatus('failed')
      return false
    }
    const parsed = parseEther(amountInBot)
    if (parsed <= 0n) {
      setTxError('Withdrawal amount must be greater than zero.')
      setTxStatus('failed')
      return false
    }

    return executeTransaction('withdraw', async () => {
      const { request } = await publicClient.simulateContract({
        address: effectiveAddress,
        abi: brailVaultAbi,
        functionName: 'withdraw',
        args: [to, parsed],
        account: walletAddress!,
      })
      return walletClient!.writeContract(request)
    })
  }

  const addRecipient = async (recipient: Address): Promise<boolean> => {
    if (!effectiveAddress) return false
    if (!isAddress(recipient)) {
      setTxError('Recipient address is invalid.')
      setTxStatus('failed')
      return false
    }

    return executeTransaction('addRecipient', async () => {
      const { request } = await publicClient.simulateContract({
        address: effectiveAddress,
        abi: brailVaultAbi,
        functionName: 'addRecipient',
        args: [recipient],
        account: walletAddress!,
      })
      return walletClient!.writeContract(request)
    })
  }

  const removeRecipient = async (recipient: Address): Promise<boolean> => {
    if (!effectiveAddress) return false
    if (!isAddress(recipient)) {
      setTxError('Recipient address is invalid.')
      setTxStatus('failed')
      return false
    }

    return executeTransaction('removeRecipient', async () => {
      const { request } = await publicClient.simulateContract({
        address: effectiveAddress,
        abi: brailVaultAbi,
        functionName: 'removeRecipient',
        args: [recipient],
        account: walletAddress!,
      })
      return walletClient!.writeContract(request)
    })
  }

  const setLimits = async (maxInBot: string, dailyInBot: string): Promise<boolean> => {
    if (!effectiveAddress) return false
    const maxParsed = parseEther(maxInBot)
    const dailyParsed = parseEther(dailyInBot)

    if (maxParsed <= 0n || dailyParsed <= 0n) {
      setTxError('Limits must be greater than zero.')
      setTxStatus('failed')
      return false
    }
    if (maxParsed > dailyParsed) {
      setTxError('Max per withdrawal cannot exceed daily limit.')
      setTxStatus('failed')
      return false
    }

    return executeTransaction('setLimits', async () => {
      const { request } = await publicClient.simulateContract({
        address: effectiveAddress,
        abi: brailVaultAbi,
        functionName: 'setLimits',
        args: [maxParsed, dailyParsed],
        account: walletAddress!,
      })
      return walletClient!.writeContract(request)
    })
  }

  return {
    vaultAddress: effectiveAddress,
    isConfigured,
    isLoading,
    isOwner,
    ownerAddress,
    vaultBalance,
    maxPerWithdrawal,
    dailyLimit,
    currentDay,
    dailyWithdrawn,
    availableDailyAllowance,
    approvedRecipients,
    activity,
    txStatus,
    txHash,
    txError,
    setCustomAddress,
    refresh: fetchVaultData,
    deposit,
    withdraw,
    addRecipient,
    removeRecipient,
    setLimits,
    resetTxStatus,
  }
}
