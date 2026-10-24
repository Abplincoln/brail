import React, { useState } from 'react'
import { ArrowUpRight, ShieldAlert, Lock, AlertCircle } from 'lucide-react'
import { isAddress, type Address } from 'viem'
import type { VaultState } from '../hooks/useVault'

interface WithdrawCardProps {
  vault: VaultState
  isPending: boolean
  disabled: boolean
}

export const WithdrawCard: React.FC<WithdrawCardProps> = ({ vault, isPending, disabled }) => {
  const [recipient, setRecipient] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [validationError, setValidationError] = useState<string>('')

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAddress(recipient)) {
      setValidationError('Destination must be a valid EVM address.')
      return
    }

    const isApproved = vault.approvedRecipients.some(
      (r) => r.toLowerCase() === recipient.toLowerCase()
    )
    if (!isApproved) {
      setValidationError('Destination address is not in the Approved Recipients list.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Withdrawal amount must be greater than zero.')
      return
    }

    const maxPerWithdrawal = parseFloat(vault.maxPerWithdrawal) || 0
    if (numAmount > maxPerWithdrawal) {
      setValidationError(`Amount exceeds the single withdrawal cap of ${vault.maxPerWithdrawal} BOT.`)
      return
    }

    const availableAllowance = parseFloat(vault.availableDailyAllowance) || 0
    if (numAmount > availableAllowance) {
      setValidationError(`Amount exceeds remaining daily allowance of ${vault.availableDailyAllowance} BOT.`)
      return
    }

    const vaultBalance = parseFloat(vault.vaultBalance) || 0
    if (numAmount > vaultBalance) {
      setValidationError(`Insufficient vault balance (${vault.vaultBalance} BOT available).`)
      return
    }

    setValidationError('')
    const ok = await vault.withdraw(recipient as Address, amount)
    if (ok) {
      setAmount('')
    }
  }

  const handleSelectApproved = (addr: string) => {
    setRecipient(addr)
    setValidationError('')
  }

  const handleFillMaxTx = () => {
    const maxTx = parseFloat(vault.maxPerWithdrawal) || 0
    const rem = parseFloat(vault.availableDailyAllowance) || 0
    const bal = parseFloat(vault.vaultBalance) || 0
    const fillable = Math.min(maxTx, rem, bal)
    if (fillable > 0) {
      setAmount(fillable.toString())
      setValidationError('')
    }
  }

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <ArrowUpRight className="text-cyan" size={20} />
          <h3>Initiate Guarded Withdrawal</h3>
        </div>
        <span className="badge-owner">Owner Only</span>
      </div>

      {!vault.isOwner && (
        <div className="owner-gate-banner">
          <Lock size={15} />
          <span>
            Only the contract owner ({vault.ownerAddress ? `${vault.ownerAddress.slice(0, 6)}...` : 'not set'}) can initiate withdrawals.
          </span>
        </div>
      )}

      <form onSubmit={handleWithdraw} className="form-group">
        <label className="form-label" htmlFor="withdraw-recipient">
          Approved Destination Recipient
        </label>
        
        {vault.approvedRecipients.length > 0 ? (
          <div className="recipient-selector-group">
            <select
              id="withdraw-recipient-select"
              value={recipient}
              onChange={(e) => handleSelectApproved(e.target.value)}
              disabled={disabled || !vault.isOwner || isPending}
              className="select-input mono"
            >
              <option value="">-- Select Approved Recipient --</option>
              {vault.approvedRecipients.map((addr) => (
                <option key={addr} value={addr}>
                  {addr.slice(0, 8)}...{addr.slice(-6)}
                </option>
              ))}
            </select>
            <input
              id="withdraw-recipient"
              type="text"
              placeholder="Or paste 0x address"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value)
                if (validationError) setValidationError('')
              }}
              disabled={disabled || !vault.isOwner || isPending}
              className="input-text mono"
            />
          </div>
        ) : (
          <div className="empty-recipients-warning">
            <AlertCircle size={15} />
            <span>No approved recipients registered yet. Add one in Recipient Management below.</span>
          </div>
        )}

        <div className="form-row-header">
          <label className="form-label" htmlFor="withdraw-amount">
            Amount (BOT)
          </label>
          {vault.isOwner && (
            <button
              type="button"
              onClick={handleFillMaxTx}
              className="btn-tiny"
              disabled={disabled || isPending}
            >
              Max Permitted
            </button>
          )}
        </div>

        <div className="input-wrapper">
          <input
            id="withdraw-amount"
            type="number"
            step="any"
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (validationError) setValidationError('')
            }}
            disabled={disabled || !vault.isOwner || isPending}
            className="input-text mono"
          />
          <span className="input-suffix">BOT</span>
        </div>

        {validationError && <span className="error-text">{validationError}</span>}

        <button
          type="submit"
          className="btn-action cyan"
          disabled={disabled || !vault.isOwner || isPending || !amount || !recipient}
        >
          {isPending ? 'Confirming Withdrawal...' : 'Withdraw BOT'}
        </button>
      </form>

      <div className="limits-checklist">
        <div className="checklist-item">
          <ShieldAlert size={14} className="text-cyan" />
          <span>Max Per Tx: <strong>{vault.maxPerWithdrawal} BOT</strong></span>
        </div>
        <div className="checklist-item">
          <ShieldAlert size={14} className="text-cyan" />
          <span>Daily Remaining: <strong>{vault.availableDailyAllowance} BOT</strong></span>
        </div>
      </div>
    </div>
  )
}
