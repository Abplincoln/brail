import React, { useState } from 'react'
import { AlertCircle, Terminal, CheckCircle2, ArrowRight } from 'lucide-react'
import { isAddress } from 'viem'

interface DeploymentNoticeProps {
  currentAddress: string | null
  onSetAddress: (addr: string) => void
}

export const DeploymentNotice: React.FC<DeploymentNoticeProps> = ({
  currentAddress,
  onSetAddress,
}) => {
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState('')

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputVal.trim()
    if (!trimmed) {
      onSetAddress('')
      setError('')
      return
    }
    if (!isAddress(trimmed)) {
      setError('Please enter a valid 0x EVM contract address.')
      return
    }
    setError('')
    onSetAddress(trimmed)
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
            The frontend is fully compiled with the genuine <code>BrailVault</code> ABI. No fabricated or dummy address is hardcoded. Once the contract is deployed in Stage 4, connect it below or via <code>VITE_VAULT_ADDRESS</code>.
          </p>
        </div>
      </div>

      <div className="deployment-instructions-box">
        <div className="instructions-title">
          <Terminal size={15} />
          <span>Stage 4 Deployment Command</span>
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

      {currentAddress && (
        <div className="current-configured-address mono">
          <CheckCircle2 size={16} className="text-emerald" />
          <span>Active Address: {currentAddress}</span>
          <button
            type="button"
            onClick={() => onSetAddress('')}
            className="btn-link"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
