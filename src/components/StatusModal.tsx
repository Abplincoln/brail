import React from 'react'
import { CheckCircle2, AlertCircle, XCircle, Loader2, ExternalLink, X } from 'lucide-react'
import { botChainTestnet } from '../config/chain'

interface StatusModalProps {
  status: 'idle' | 'pending' | 'confirmed' | 'failed' | 'rejected'
  hash: string | null
  error: string | null
  onClose: () => void
}

export const StatusModal: React.FC<StatusModalProps> = ({
  status,
  hash,
  error,
  onClose,
}) => {
  if (status === 'idle') return null

  return (
    <div className="modal-backdrop" onClick={status !== 'pending' ? onClose : undefined}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="modal-close-btn"
          disabled={status === 'pending'}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {status === 'pending' && (
          <div className="modal-body">
            <Loader2 size={44} className="spin text-cyan modal-icon" />
            <h3 className="modal-title">Transaction Pending</h3>
            <p className="modal-text">
              Broadcasting to BOT Chain Bohr Testnet and awaiting block confirmation...
            </p>
            {hash && (
              <a
                href={`${botChainTestnet.blockExplorers.default.url}/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="modal-tx-link mono"
              >
                <span>View on Bohr Scan: {hash.slice(0, 10)}...{hash.slice(-8)}</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {status === 'confirmed' && (
          <div className="modal-body">
            <CheckCircle2 size={44} className="text-emerald modal-icon" />
            <h3 className="modal-title">Transaction Confirmed</h3>
            <p className="modal-text">
              The operation succeeded and was verified on-chain. State updated from Bohr Testnet.
            </p>
            {hash && (
              <a
                href={`${botChainTestnet.blockExplorers.default.url}/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="modal-tx-link mono"
              >
                <span>View on Bohr Scan: {hash.slice(0, 10)}...{hash.slice(-8)}</span>
                <ExternalLink size={14} />
              </a>
            )}
            <button onClick={onClose} className="btn-primary mt-4">
              Dismiss
            </button>
          </div>
        )}

        {status === 'rejected' && (
          <div className="modal-body">
            <AlertCircle size={44} className="text-amber modal-icon" />
            <h3 className="modal-title">Transaction Canceled</h3>
            <p className="modal-text">
              {error || 'Signature or transaction request was rejected in your wallet.'}
            </p>
            <button onClick={onClose} className="btn-secondary mt-4">
              Close
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="modal-body">
            <XCircle size={44} className="text-rose modal-icon" />
            <h3 className="modal-title">Transaction Failed</h3>
            <p className="modal-text error-detail mono">
              {error || 'The transaction was reverted by the EVM or failed to broadcast.'}
            </p>
            {hash && (
              <a
                href={`${botChainTestnet.blockExplorers.default.url}/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="modal-tx-link mono"
              >
                <span>View Revert on Bohr Scan: {hash.slice(0, 10)}...{hash.slice(-8)}</span>
                <ExternalLink size={14} />
              </a>
            )}
            <button onClick={onClose} className="btn-secondary mt-4">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
