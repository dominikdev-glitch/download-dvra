import React from 'react';
import {
  Database,
  ShieldCheck,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { ConnectionStatus } from '../types';

interface NavbarProps {
  activeTab: 'database' | 'crypto';
  setActiveTab: (tab: 'database' | 'crypto') => void;
  connectionStatus: ConnectionStatus;
  onOpenServiceAccountModal: () => void;
  onDisconnect: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  connectionStatus,
  onOpenServiceAccountModal,
  onDisconnect,
}) => {
  return (
    <header
      id="app-header"
      className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-100 text-base tracking-tight">
                VaultDB
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30">
                AES-256 + Firebase
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              Firestore Manager & Standard Cryptographic Suite
            </p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav
          id="main-nav-tabs"
          className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80"
        >
          <button
            id="tab-btn-database"
            onClick={() => setActiveTab('database')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'database'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database View</span>
          </button>

          <button
            id="tab-btn-crypto"
            onClick={() => setActiveTab('crypto')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'crypto'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>AES-256 Crypto Studio</span>
          </button>
        </nav>

        {/* Right: Connection Status & Service Account Action */}
        <div className="flex items-center space-x-3">
          {connectionStatus.connected && connectionStatus.mode === 'real' ? (
            <div className="flex items-center space-x-2">
              <div
                id="live-connection-badge"
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono truncate max-w-[140px] sm:max-w-[200px]" title={connectionStatus.projectId}>
                  {connectionStatus.projectId}
                </span>
              </div>
              <button
                id="btn-disconnect-service-account"
                onClick={onDisconnect}
                title="Disconnect Firebase Service Account"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div
                id="sandbox-badge"
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sandbox Mode</span>
              </div>
              <button
                id="btn-open-service-account-modal"
                onClick={onOpenServiceAccountModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Connect Service Key</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
