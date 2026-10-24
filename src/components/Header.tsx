import React from 'react'
import { ShieldCheck, Wallet, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'
import { botChainTestnet } from '../config/chain'
import type { WalletState } from '../hooks/useWallet'

interface HeaderProps {
  wallet: WalletState
  onRefresh: () => void
  isLoading: boolean
}

export const Header: React.FC<HeaderProps> = ({ wallet, onRefresh, isLoading }) => {
  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <header className="header-container">
      <div className="header-left">
        <div className="brand-logo">
          <ShieldCheck className="brand-icon" size={28} />
          <div>
            <h1 className="brand-title">BRAIL</h1>
            <span className="brand-subtitle">Native BOT Vault & Guard</span>
          </div>
        </div>
        <div className="network-pill">
          <span className="network-dot"></span>
          <span>Bohr Testnet</span>
          <span className="network-id">ID: {botChainTestnet.id}</span>
        </div>
      </div>

      <div className="header-right">
        <button
          onClick={onRefresh}
          className="icon-button"
          title="Refresh Blockchain Data"
          disabled={isLoading}
        >
          <RefreshCw size={17} className={isLoading ? 'spin' : ''} />
        </button>

        {wallet.isConnected && wallet.isWrongNetwork && (
          <button onClick={wallet.switchToBohrTestnet} className="btn-warning">
            <AlertTriangle size={16} />
            <span>Switch to Bohr Testnet</span>
          </button>
        )}

        {wallet.isConnected ? (
          <div className="wallet-connected-group">
            <a
              href={`${botChainTestnet.blockExplorers.default.url}/address/${wallet.address}`}
              target="_blank"
              rel="noreferrer"
              className="wallet-address-pill"
              title="View on Bohr Scan"
            >
              <Wallet size={15} />
              <span className="mono">{truncate(wallet.address!)}</span>
              <ExternalLink size={12} />
            </a>
            <button onClick={wallet.disconnect} className="btn-disconnect">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={wallet.connect}
            disabled={wallet.isConnecting}
            className="btn-connect"
          >
            <Wallet size={17} />
            <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
          </button>
        )}
      </div>
    </header>
  )
}
