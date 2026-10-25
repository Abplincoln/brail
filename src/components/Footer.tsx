import React from 'react'
import { ExternalLink, ShieldCheck } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="footer-container">
      <div className="footer-left">
        <div className="footer-brand">
          <ShieldCheck size={18} className="text-emerald" />
          <span className="footer-title">Brail Vault</span>
        </div>
        <span className="footer-copy">
          Securing Native BOT on BOT Chain Bohr Testnet
        </span>
      </div>

      <div className="footer-right">
        <nav className="footer-links" aria-label="Footer Navigation">
          <a
            href="https://botchain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <span>BOT Chain</span>
            <ExternalLink size={13} />
          </a>

          <span className="footer-divider" aria-hidden="true">•</span>

          <a
            href="https://scan.bohr.life"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <span>Block Explorer</span>
            <ExternalLink size={13} />
          </a>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
