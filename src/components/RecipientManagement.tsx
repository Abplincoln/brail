import React, { useState } from 'react'
import { UserCheck, UserPlus, UserMinus, Shield, Lock, ExternalLink } from 'lucide-react'
import { isAddress, type Address } from 'viem'
import { botChainTestnet } from '../config/chain'
import type { VaultState } from '../hooks/useVault'

interface RecipientManagementProps {
  vault: VaultState
  isPending: boolean
  disabled: boolean
}

export const RecipientManagement: React.FC<RecipientManagementProps> = ({
  vault,
  isPending,
  disabled,
}) => {
  const [newRecipient, setNewRecipient] = useState('')
  const [error, setError] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newRecipient.trim()
    if (!isAddress(trimmed)) {
      setError('Please enter a valid 0x EVM recipient address.')
      return
    }

    if (vault.approvedRecipients.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setError('This address is already registered as an approved recipient.')
      return
    }

    setError('')
    const ok = await vault.addRecipient(trimmed as Address)
    if (ok) {
      setNewRecipient('')
    }
  }

  const handleRemove = async (addr: Address) => {
    if (window.confirm(`Are you sure you want to revoke withdrawal approval for ${addr}?`)) {
      await vault.removeRecipient(addr)
    }
  }

  const truncate = (addr: string) => `${addr.slice(0, 10)}...${addr.slice(-8)}`

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <UserCheck className="text-emerald" size={20} />
          <h3>Approved Recipients Registry</h3>
        </div>
        <span className="badge-count mono">{vault.approvedRecipients.length} Approved</span>
      </div>

      <p className="panel-description">
        Only addresses in this cryptographic allowlist are eligible to receive native currency withdrawals from Brail.
      </p>

      {vault.isOwner ? (
        <form onSubmit={handleAdd} className="inline-add-form">
          <input
            type="text"
            placeholder="0x... (new recipient EVM address)"
            value={newRecipient}
            onChange={(e) => {
              setNewRecipient(e.target.value)
              if (error) setError('')
            }}
            disabled={disabled || isPending}
            className="input-text mono"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={disabled || isPending || !newRecipient}
          >
            <UserPlus size={16} />
            <span>Add Recipient</span>
          </button>
        </form>
      ) : (
        <div className="owner-gate-banner">
          <Lock size={15} />
          <span>Only the vault owner can add or revoke approved destination recipients.</span>
        </div>
      )}

      {error && <span className="error-text">{error}</span>}

      <div className="recipients-list">
        {vault.approvedRecipients.length > 0 ? (
          vault.approvedRecipients.map((addr) => (
            <div key={addr} className="recipient-row">
              <div className="recipient-info">
                <Shield size={16} className="text-emerald" />
                <a
                  href={`${botChainTestnet.blockExplorers.default.url}/address/${addr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="recipient-address mono"
                >
                  {truncate(addr)}
                  <ExternalLink size={12} />
                </a>
              </div>
              {vault.isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemove(addr)}
                  disabled={disabled || isPending}
                  className="btn-revoke"
                  title="Revoke approval"
                >
                  <UserMinus size={14} />
                  <span>Revoke</span>
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span>No approved recipients configured yet.</span>
          </div>
        )}
      </div>
    </div>
  )
}
