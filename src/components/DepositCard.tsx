import React, { useState } from 'react'
import { ArrowDownRight, Info, CheckCircle2 } from 'lucide-react'

interface DepositCardProps {
  onDeposit: (amount: string) => Promise<boolean>
  isPending: boolean
  disabled: boolean
}

export const DepositCard: React.FC<DepositCardProps> = ({ onDeposit, isPending, disabled }) => {
  const [amount, setAmount] = useState('')
  const [validationError, setValidationError] = useState('')

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setValidationError('Please enter a valid positive deposit amount.')
      return
    }
    setValidationError('')
    const ok = await onDeposit(amount)
    if (ok) {
      setAmount('')
    }
  }

  const handlePreset = (val: string) => {
    setAmount(val)
    setValidationError('')
  }

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <ArrowDownRight className="text-emerald" size={20} />
          <h3>Deposit Native BOT</h3>
        </div>
        <span className="badge-public">Open to Anyone</span>
      </div>

      <p className="panel-description">
        Deposit native BOT currency directly into the vault. Inflows are never restricted by withdrawal or daily limits.
      </p>

      <form onSubmit={handleDeposit} className="form-group">
        <label className="form-label" htmlFor="deposit-amount">
          Amount (BOT)
        </label>
        <div className="input-wrapper">
          <input
            id="deposit-amount"
            type="number"
            step="any"
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (validationError) setValidationError('')
            }}
            disabled={disabled || isPending}
            className="input-text mono"
          />
          <span className="input-suffix">BOT</span>
        </div>

        <div className="quick-presets">
          <button
            type="button"
            className="preset-btn"
            onClick={() => handlePreset('0.1')}
            disabled={disabled || isPending}
          >
            0.1 BOT
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => handlePreset('0.5')}
            disabled={disabled || isPending}
          >
            0.5 BOT
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => handlePreset('1.0')}
            disabled={disabled || isPending}
          >
            1.0 BOT
          </button>
        </div>

        {validationError && <span className="error-text">{validationError}</span>}

        <button
          type="submit"
          className="btn-action emerald"
          disabled={disabled || isPending || !amount}
        >
          {isPending ? 'Confirming on Bohr Testnet...' : 'Deposit BOT'}
        </button>
      </form>

      <div className="panel-notice">
        <Info size={15} />
        <span>Direct wallet-to-contract transfers also execute native deposits via <code>receive()</code>.</span>
      </div>
    </div>
  )
}
