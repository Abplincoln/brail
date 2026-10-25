import React from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, UserPlus, UserMinus, Sliders, ExternalLink, KeyRound } from 'lucide-react'
import { botChainTestnet } from '../config/chain'
import type { VaultActivityItem } from '../hooks/useVault'

interface ActivityFeedProps {
  activity: VaultActivityItem[]
  isLoading: boolean
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activity, isLoading }) => {
  const getIcon = (type: VaultActivityItem['type']) => {
    switch (type) {
      case 'Deposit':
        return <ArrowDownRight size={16} className="text-emerald" />
      case 'Withdrawal':
        return <ArrowUpRight size={16} className="text-cyan" />
      case 'RecipientAdded':
        return <UserPlus size={16} className="text-emerald" />
      case 'RecipientRemoved':
        return <UserMinus size={16} className="text-rose" />
      case 'LimitsUpdated':
        return <Sliders size={16} className="text-blue" />
      case 'OwnershipTransferred':
        return <KeyRound size={16} className="text-amber" />
      default:
        return <Activity size={16} className="text-muted" />
    }
  }

  const truncateTx = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <Activity className="text-cyan" size={20} />
          <h3>Confirmed On-Chain Activity</h3>
        </div>
        <span className="badge-public mono">Live Event Log</span>
      </div>

      <p className="panel-description">
        Real event logs queried directly from BOT Chain Bohr Testnet. Only verified on-chain transactions appear here.
      </p>

      <div className="activity-list">
        {activity.length > 0 ? (
          activity.map((item, idx) => (
            <div key={`${item.txHash}-${idx}`} className="activity-row">
              <div className="activity-icon-col">
                <div className="activity-icon-wrapper">
                  {getIcon(item.type)}
                </div>
              </div>

              <div className="activity-details-col">
                <div className="activity-title-row">
                  <span className="activity-title">{item.title}</span>
                  <span className="activity-block mono">Block #{item.blockNumber.toString()}</span>
                </div>
                <div className="activity-description mono">{item.details}</div>
              </div>

              <div className="activity-action-col">
                <a
                  href={`${botChainTestnet.blockExplorers.default.url}/tx/${item.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tx-link-btn mono"
                  title="View on Bohr Scan"
                >
                  <span>{truncateTx(item.txHash)}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            {isLoading ? (
              <span>Querying confirmed event logs from Bohr Testnet...</span>
            ) : (
              <span>No contract event activity detected yet for this vault.</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
