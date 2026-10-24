import React, { useState, useEffect } from 'react'
import { Sliders, Lock, ShieldCheck } from 'lucide-react'
import type { VaultState } from '../hooks/useVault'

interface LimitsConfigurationProps {
  vault: VaultState
  isPending: boolean
  disabled: boolean
}

export const LimitsConfiguration: React.FC<LimitsConfigurationProps> = ({
  vault,
  isPending,
  disabled,
}) => {
  const [maxVal, setMaxVal] = useState('')
  const [dailyVal, setDailyVal] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (vault.maxPerWithdrawal && vault.maxPerWithdrawal !== '0') {
      setMaxVal(vault.maxPerWithdrawal)
    }
    if (vault.dailyLimit && vault.dailyLimit !== '0') {
      setDailyVal(vault.dailyLimit)
    }
  }, [vault.maxPerWithdrawal, vault.dailyLimit])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    const maxNum = parseFloat(maxVal)
    const dailyNum = parseFloat(dailyVal)

    if (isNaN(maxNum) || maxNum <= 0) {
      setError('Max per withdrawal must be a positive number.')
      return
    }
    if (isNaN(dailyNum) || dailyNum <= 0) {
      setError('Daily limit must be a positive number.')
      return
    }
    if (maxNum > dailyNum) {
      setError('Single transaction limit cannot exceed cumulative daily limit.')
      return
    }

    setError('')
    await vault.setLimits(maxVal, dailyVal)
  }

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <Sliders className="text-blue" size={20} />
          <h3>Dual Limit Thresholds</h3>
        </div>
        <span className="badge-owner">Owner Governance</span>
      </div>

      <p className="panel-description">
        Enforce cryptographic guardrails on outflows. Withdrawals that exceed either cap will revert on-chain.
      </p>

      {!vault.isOwner && (
        <div className="owner-gate-banner">
          <Lock size={15} />
          <span>Only the vault owner can reconfigure withdrawal caps.</span>
        </div>
      )}

      <form onSubmit={handleUpdate} className="form-group">
        <div className="two-col-grid">
          <div>
            <label className="form-label" htmlFor="max-per-tx">
              Max Per Transaction (BOT)
            </label>
            <div className="input-wrapper">
              <input
                id="max-per-tx"
                type="number"
                step="any"
                placeholder="1.0"
                value={maxVal}
                onChange={(e) => {
                  setMaxVal(e.target.value)
                  if (error) setError('')
                }}
                disabled={disabled || !vault.isOwner || isPending}
                className="input-text mono"
              />
              <span className="input-suffix">BOT</span>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="daily-cap">
              UTC Daily Limit (BOT)
            </label>
            <div className="input-wrapper">
              <input
                id="daily-cap"
                type="number"
                step="any"
                placeholder="5.0"
                value={dailyVal}
                onChange={(e) => {
                  setDailyVal(e.target.value)
                  if (error) setError('')
                }}
                disabled={disabled || !vault.isOwner || isPending}
                className="input-text mono"
              />
              <span className="input-suffix">BOT</span>
            </div>
          </div>
        </div>

        {error && <span className="error-text">{error}</span>}

        {vault.isOwner && (
          <button
            type="submit"
            className="btn-action blue"
            disabled={disabled || isPending || !maxVal || !dailyVal}
          >
            <ShieldCheck size={16} />
            <span>{isPending ? 'Updating Limits...' : 'Update Limits'}</span>
          </button>
        )}
      </form>
    </div>
  )
}
