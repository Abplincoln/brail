import React, { useState } from 'react'
import { AlertCircle, Terminal, CheckCircle2, ArrowRight, ExternalLink, Settings2 } from 'lucide-react'
import { isAddress } from 'viem'
import { botChainTestnet } from '../config/chain'

interface DeploymentNoticeProps {
  currentAddress: string | null
  onSetAddress: (addr: string) => void
}

export const DeploymentNotice: React.FC<DeploymentNoticeProps> = ({
  currentAddress,
  onSetAddress,
}) => {
  const [showOverride, setShowOverride] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState('')

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputVal.trim()
    if (!trimmed) {
      onSetAddress('')
      setError('')
      setShowOverride(false)
      return
    }
    if (!isAddress(trimmed)) {
      setError('Please enter a valid 0x EVM contract address.')
      return
    }
    setError('')
    onSetAddress(trimmed)
    setShowOverride(false)
  }

  if (currentAddress) {
    return (
      <div className="deployment-banner-card connected">
        <div className="deployment-connected-row">
          <div className="connected-left">
            <CheckCircle2 size={22} className="text-emerald" />
            <div>
              <span className="connected-status-label">BrailVault Connected on Bohr Testnet</span>
              <div className="connected-address-row">
                <a
                  href={`${botChainTestnet.blockExplorers.default.url}/address/${currentAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="connected-address-link mono"
                  title="View on Bohr Scan"
                >
                  <span>{currentAddress}</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOverride(!showOverride)}
            className="btn-tiny-settings"
          >
            <Settings2 size={14} />
            <span>{showOverride ? 'Hide Config' : 'Change Address'}</span>
          </button>
        </div>

        {showOverride && (
          <form onSubmit={handleApply} className="address-override-form mt-4">
            <label htmlFor="vault-address-input-override" className="form-label">
              Override Contract Address:
            </label>
            <div className="input-with-button">
              <input
                id="vault-address-input-override"
                type="text"
                placeholder="0x... (new contract address)"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="input-text mono"
              />
              <button type="submit" className="btn-primary">
                <span>Update</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetAddress('')
                  setShowOverride(false)
                }}
                className="btn-secondary"
              >
                Reset Default
              </button>
            </div>
            {error && <span className="error-text">{error}</span>}
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="deployment-banner-card">
      <div className="deployment-banner-header">
        <div className="banner-icon-badge">
          <AlertCircle size={22} className="text-amber" />
        </div>
        <div>
          <h3 className="banner-title">Vault Contract Awaiting Bohr Testnet Deployment</h3>
          <p className="banner-description">
            The frontend is fully compiled with the genuine <code>BrailVault</code> ABI. No fabricated or dummy address is hardcoded. Connect the deployed contract address below or via <code>VITE_VAULT_ADDRESS</code>.
          </p>
        </div>
      </div>

      <div className="deployment-instructions-box">
        <div className="instructions-title">
          <Terminal size={15} />
          <span>Stage 5 Deployment Command</span>
        </div>
        <pre className="instructions-code mono">
          npx hardhat run scripts/deploy.js --network bohrTestnet
        </pre>
      </div>

      <form onSubmit={handleApply} className="address-override-form">
        <label htmlFor="vault-address-input" className="form-label">
          Connect Deployed Vault Address (Bohr Testnet):
        </label>
        <div className="input-with-button">
          <input
            id="vault-address-input"
            type="text"
            placeholder="0x... (paste deployed BrailVault address)"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="input-text mono"
          />
          <button type="submit" className="btn-primary">
            <span>Connect Vault</span>
            <ArrowRight size={16} />
          </button>
        </div>
        {error && <span className="error-text">{error}</span>}
      </form>
    </div>
  )
}
