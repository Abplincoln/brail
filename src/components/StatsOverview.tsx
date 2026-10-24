import React from 'react'
import { Coins, Shield, Clock, TrendingUp, KeyRound, ExternalLink } from 'lucide-react'
import { botChainTestnet } from '../config/chain'
import type { VaultState } from '../hooks/useVault'

interface StatsOverviewProps {
  vault: VaultState
  connectedAddress: string | null
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ vault, connectedAddress }) => {
  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const dailyLimitNum = parseFloat(vault.dailyLimit) || 0
  const dailyWithdrawnNum = parseFloat(vault.dailyWithdrawn) || 0
  const percentageUsed = dailyLimitNum > 0
    ? Math.min(100, Math.round((dailyWithdrawnNum / dailyLimitNum) * 100))
    : 0

  return (
    <div className="stats-grid">
      {/* Vault Balance */}
      <div className="stat-card balance-highlight">
        <div className="stat-header">
          <span className="stat-label">Vault Balance</span>
          <div className="stat-icon-wrapper emerald">
            <Coins size={20} />
          </div>
        </div>
        <div className="stat-value mono">
          {vault.vaultBalance} <span className="stat-unit">BOT</span>
        </div>
        <div className="stat-footer">
          <span>Protected native testnet treasury</span>
        </div>
      </div>

      {/* Daily Allowance Status */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Daily Allowance Remaining</span>
          <div className="stat-icon-wrapper cyan">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="stat-value mono">
          {vault.availableDailyAllowance} <span className="stat-unit">BOT</span>
        </div>
        <div className="progress-container">
          <div
            className="progress-bar"
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
        <div className="stat-footer">
          <span>
            {vault.dailyWithdrawn} / {vault.dailyLimit} BOT used today ({percentageUsed}%)
          </span>
        </div>
      </div>

      {/* Limits Summary */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Per-Withdrawal Cap</span>
          <div className="stat-icon-wrapper blue">
            <Shield size={20} />
          </div>
        </div>
        <div className="stat-value mono">
          {vault.maxPerWithdrawal} <span className="stat-unit">BOT</span>
        </div>
        <div className="stat-footer mono">
          Daily Limit: {vault.dailyLimit} BOT
        </div>
      </div>

      {/* Vault Owner & UTC Epoch */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Governance & UTC Day</span>
          <div className="stat-icon-wrapper amber">
            <KeyRound size={20} />
          </div>
        </div>
        <div className="stat-subinfo">
          {vault.ownerAddress ? (
            <div className="owner-badge">
              <span className="owner-label">Owner:</span>
              <a
                href={`${botChainTestnet.blockExplorers.default.url}/address/${vault.ownerAddress}`}
                target="_blank"
                rel="noreferrer"
                className="owner-address mono"
              >
                {truncate(vault.ownerAddress)}
                <ExternalLink size={12} />
              </a>
              {vault.isOwner && <span className="tag-owner">You</span>}
            </div>
          ) : (
            <span className="text-muted">Awaiting Vault Link</span>
          )}
        </div>
        <div className="stat-footer">
          <Clock size={14} />
          <span>UTC Epoch Day: {vault.currentDay ? vault.currentDay.toString() : '—'}</span>
        </div>
      </div>
    </div>
  )
}
