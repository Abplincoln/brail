import React from 'react'
import { Header } from './components/Header'
import { DeploymentNotice } from './components/DeploymentNotice'
import { StatsOverview } from './components/StatsOverview'
import { DepositCard } from './components/DepositCard'
import { WithdrawCard } from './components/WithdrawCard'
import { RecipientManagement } from './components/RecipientManagement'
import { LimitsConfiguration } from './components/LimitsConfiguration'
import { ActivityFeed } from './components/ActivityFeed'
import { StatusModal } from './components/StatusModal'
import { useWallet } from './hooks/useWallet'
import { useVault } from './hooks/useVault'
import './App.css'

export const App: React.FC = () => {
  const wallet = useWallet()
  const vault = useVault(wallet.address, wallet.walletClient)

  const isTxPending = vault.txStatus === 'pending'
  const isVaultReady = vault.isConfigured

  return (
    <div className="app-wrapper">
      <Header
        wallet={wallet}
        onRefresh={vault.refresh}
        isLoading={vault.isLoading}
      />

      {wallet.error && (
        <div className="owner-gate-banner mb-4">
          <span>{wallet.error}</span>
        </div>
      )}

      {/* Deployment & Configuration Notice */}
      <DeploymentNotice
        currentAddress={vault.vaultAddress}
        onSetAddress={vault.setCustomAddress}
      />

      {/* Stats Summary */}
      <StatsOverview
        vault={vault}
        connectedAddress={wallet.address}
      />

      {/* Action Columns */}
      <div className="dashboard-grid">
        {/* Left Col: Transfers */}
        <div className="dashboard-col">
          <DepositCard
            onDeposit={vault.deposit}
            isPending={isTxPending}
            disabled={!wallet.isConnected || wallet.isWrongNetwork || !isVaultReady}
          />

          <WithdrawCard
            vault={vault}
            isPending={isTxPending}
            disabled={!wallet.isConnected || wallet.isWrongNetwork || !isVaultReady}
          />
        </div>

        {/* Right Col: Governance & Registry */}
        <div className="dashboard-col">
          <RecipientManagement
            vault={vault}
            isPending={isTxPending}
            disabled={!wallet.isConnected || wallet.isWrongNetwork || !isVaultReady}
          />

          <LimitsConfiguration
            vault={vault}
            isPending={isTxPending}
            disabled={!wallet.isConnected || wallet.isWrongNetwork || !isVaultReady}
          />
        </div>
      </div>

      {/* Confirmed Blockchain Event Activity Feed */}
      <ActivityFeed
        activity={vault.activity}
        isLoading={vault.isLoading}
      />

      {/* Transaction Status Modal */}
      <StatusModal
        status={vault.txStatus}
        hash={vault.txHash}
        error={vault.txError}
        onClose={vault.resetTxStatus}
      />
    </div>
  )
}

export default App
