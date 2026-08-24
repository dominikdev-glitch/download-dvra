import React, { useState, useEffect } from 'react';
import {
  Download,
  ShieldCheck,
  Cpu,
  Coins,
  Zap,
  Layers,
  Lock,
  Sparkles,
  Terminal,
  CheckCircle2,
  Check,
  FolderOpen,
  ArrowRight,
  Shield,
  Activity,
  Boxes,
  Monitor,
  Flame,
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Clock,
  Laptop,
  Mail,
  MessageCircle,
} from 'lucide-react';

// Authentic Official Crypto Chain Logos in crisp vector SVG
export const CryptoIcons = {
  Tron: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.5 4.5L21.5 2L13.5 22L2.5 4.5Z"
        fill="#FF060A"
      />
      <path
        d="M2.5 4.5L12 11.5L21.5 2L2.5 4.5Z"
        fill="#FF5255"
      />
      <path
        d="M12 11.5L13.5 22L21.5 2L12 11.5Z"
        fill="#C40003"
      />
      <path
        d="M2.5 4.5L12 11.5L13.5 22L2.5 4.5Z"
        fill="#E00004"
      />
    </svg>
  ),
  BNB: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="12" fill="#F0B90B" />
      <path
        d="M12 4.5L14.7 7.2L10.2 11.7L7.5 9L12 4.5ZM16.5 9L19.2 11.7L16.5 14.4L13.8 11.7L16.5 9ZM12 14.1L14.7 16.8L12 19.5L9.3 16.8L12 14.1ZM7.5 14.4L10.2 11.7L12 13.5L9.3 16.2L7.5 14.4ZM12 8.7L14.1 10.8L12 12.9L9.9 10.8L12 8.7Z"
        fill="#1E2026"
      />
    </svg>
  ),
  Ethereum: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L5.5 12.8L12 16.5L18.5 12.8L12 2Z"
        fill="#627EEA"
      />
      <path
        d="M12 2L18.5 12.8L12 16.5V2Z"
        fill="#455FC7"
      />
      <path
        d="M12 17.8L5.5 14.1L12 22.5L18.5 14.1L12 17.8Z"
        fill="#627EEA"
      />
      <path
        d="M12 17.8V22.5L18.5 14.1L12 17.8Z"
        fill="#455FC7"
      />
      <path
        d="M12 15.3L18.5 12.8L12 9.8V15.3Z"
        fill="#8A9CE8"
      />
      <path
        d="M5.5 12.8L12 15.3V9.8L5.5 12.8Z"
        fill="#627EEA"
      />
    </svg>
  ),
  Solana: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="solanaGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="solanaGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DC1FFF" />
          <stop offset="100%" stopColor="#00FFA3" />
        </linearGradient>
      </defs>
      <path
        d="M4.5 18.2C4.7 18 5 17.9 5.3 17.9H20.7C21.1 17.9 21.4 18.3 21.2 18.7L19.5 20.8C19.3 21 19 21.1 18.7 21.1H3.3C2.9 21.1 2.6 20.7 2.8 20.3L4.5 18.2Z"
        fill="url(#solanaGrad1)"
      />
      <path
        d="M4.5 3.2C4.7 3 5 2.9 5.3 2.9H20.7C21.1 2.9 21.4 3.3 21.2 3.7L19.5 5.8C19.3 6 19 6.1 18.7 6.1H3.3C2.9 6.1 2.6 5.7 2.8 5.3L4.5 3.2Z"
        fill="url(#solanaGrad1)"
      />
      <path
        d="M19.5 10.7C19.3 10.5 19 10.4 18.7 10.4H3.3C2.9 10.4 2.6 10.8 2.8 11.2L4.5 13.3C4.7 13.5 5 13.6 5.3 13.6H20.7C21.1 13.6 21.4 13.2 21.2 12.8L19.5 10.7Z"
        fill="url(#solanaGrad2)"
      />
    </svg>
  ),
  WindowsIcon: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm0 17.102l9.75 1.35v-9.45H0v8.1zm10.75 1.499L24 24V11.551H10.75v10.5zm0-18.6l13.25-1.85V11.55H10.75V3.45z"/>
    </svg>
  )
};

interface SoftwareDownloadViewProps {
  onAdminUnlockRequest: () => void;
  isAdminUnlocked: boolean;
}

export function SoftwareDownloadView({ onAdminUnlockRequest, isAdminUnlocked }: SoftwareDownloadViewProps) {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const [downloadUrlConfig, setDownloadUrlConfig] = useState<string>(() => {
    return localStorage.getItem('dvra_custom_download_url') || '';
  });

  const windowsRelease = {
    fileName: 'DVRA Setup 1.0.2.exe',
    version: 'v1.0.2 (Production Stable)',
    size: '105 MB',
    arch: '64-bit (x64 / ARM64 Windows)',
    sha256: '9b84ac42e01df1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    minReq: 'Windows 10 / 11 (64-bit)',
  };

  useEffect(() => {
    fetch('/api/downloads/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.availableFiles) {
          setAvailableFiles(data.availableFiles);
        }
        if (data.customDownloadUrl) {
          setDownloadUrlConfig(data.customDownloadUrl);
        }
      })
      .catch(() => {});
  }, []);

  const handleDownload = () => {
    setDownloadStarted(true);
    const targetUrl = downloadUrlConfig.trim() || `/api/download/${encodeURIComponent(windowsRelease.fileName)}`;
    
    if (targetUrl.startsWith('http')) {
      window.location.href = targetUrl;
    } else {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = windowsRelease.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const chainData = [
    {
      id: 'tron',
      name: 'TRON Network',
      symbol: 'TRX',
      icon: <CryptoIcons.Tron />,
      standards: 'TRC-20 & TRC-10',
      dex: 'SunSwap v2 / v3',
      speed: '2,000 TPS',
      fee: '< $0.05',
      badge: 'Zero-Gas Energy Delegator',
      accent: 'border-red-500/30 hover:border-red-500 bg-red-50/30 dark:bg-red-950/10',
      tagColor: 'bg-red-100 text-red-800'
    },
    {
      id: 'bnb',
      name: 'BNB Smart Chain',
      symbol: 'BNB',
      icon: <CryptoIcons.BNB />,
      standards: 'BEP-20 / BEP-721',
      dex: 'PancakeSwap v3',
      speed: '3 Sec Finality',
      fee: '< $0.02',
      badge: 'Automated Tax & Anti-Snipe',
      accent: 'border-amber-500/30 hover:border-amber-500 bg-amber-50/30 dark:bg-amber-950/10',
      tagColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'eth',
      name: 'Ethereum Mainnet',
      symbol: 'ETH',
      icon: <CryptoIcons.Ethereum />,
      standards: 'ERC-20 / ERC-4337',
      dex: 'Uniswap v2 / v3 / Curve',
      speed: 'PoS Layer 1',
      fee: 'EIP-1559 Dynamic',
      badge: 'Multi-Sig & LP Burn Vault',
      accent: 'border-indigo-500/30 hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10',
      tagColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: 'sol',
      name: 'Solana High Speed',
      symbol: 'SOL',
      icon: <CryptoIcons.Solana />,
      standards: 'SPL Token / 2022 Extensions',
      dex: 'Raydium & Orca',
      speed: '65,000 TPS',
      fee: '< $0.0002',
      badge: 'Instant Liquidity Injection',
      accent: 'border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10',
      tagColor: 'bg-emerald-100 text-emerald-800'
    },
  ];

  return (
    <div className="py-6 space-y-10 max-w-5xl mx-auto">
      {/* 1. Header Hero with Live Gradient Aura */}
      <div className="text-center space-y-4 relative">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-full text-blue-800 text-xs font-bold shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>DVRA Suite {windowsRelease.version}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
          Next-Gen Multi-Chain <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Token & Liquidity Engine
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The all-in-one Windows desktop suite for automated smart contract coin deployment, 
          instant liquidity pool provision, market making, and AES-encrypted asset recovery.
        </p>

        {/* Live Chain Badges with Authentic Icons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {chainData.map((c) => (
            <div
              key={c.id}
              className="flex items-center space-x-2 px-3.5 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-slate-400 transition-all cursor-default"
            >
              <div className="shrink-0">{c.icon}</div>
              <span className="text-xs font-bold text-slate-800">{c.name}</span>
              <span className="text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono rounded">
                {c.symbol}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Main Windows Download Hero Card */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow backdrop circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-400/30 rounded-lg text-blue-300 text-xs font-semibold">
              <CryptoIcons.WindowsIcon />
              <span>Native Windows 10 & 11 (64-Bit x64 / ARM64)</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start space-x-2">
                <span>{windowsRelease.fileName}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Official Windows Desktop Client • Single-File Standalone Installer • {windowsRelease.size}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-300">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero External Dependencies</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Digitally Signed & Verified</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>High-Speed RPC Node Mesh</span>
              </div>
            </div>
          </div>

          {/* Download Action Area */}
          <div className="w-full md:w-auto shrink-0 flex flex-col items-center space-y-3">
            <button
              id="btn-download-windows"
              onClick={handleDownload}
              className="w-full md:w-auto flex items-center justify-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all cursor-pointer"
            >
              <Download className="w-5 h-5 animate-bounce" />
              <span>Download for Windows</span>
            </button>

            <span className="text-[11px] text-slate-400 text-center">
              Requires 64-bit Windows OS • Direct installer
            </span>
          </div>
        </div>

        {downloadStarted && (
          <div className="mt-6 p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center space-x-3 text-xs text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong>Download initiated!</strong> Your browser is receiving{' '}
              <span className="font-mono text-white">{windowsRelease.fileName}</span>. Double-click the .exe file once downloaded to run setup.
            </div>
          </div>
        )}

        {/* Windows Checksum Info */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="font-mono break-all sm:truncate max-w-full sm:max-w-md text-center sm:text-left">
            SHA-256: <span className="text-slate-300">{windowsRelease.sha256}</span>
          </div>
          <div className="text-slate-500 flex items-center space-x-2 shrink-0">
            <span>macOS & Linux:</span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">
              Private Beta (Windows Exclusive)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Four Major Supported Crypto Chains Interactive Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Supported Blockchains & DEX Routers</h3>
            <p className="text-xs text-slate-500">
              Native protocol integrations for direct contract compilation, token deployment & liquidity locking
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {chainData.map((c) => (
            <div
              key={c.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all space-y-3.5 hover:shadow-md ${c.accent}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 shadow-xs flex items-center justify-center">
                    {c.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                    <span className="text-[11px] font-mono text-slate-500">{c.standards}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Primary DEX:</span>
                  <span className="font-semibold text-slate-800">{c.dex}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Throughput:</span>
                  <span className="font-semibold text-slate-800">{c.speed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Avg Tx Fee:</span>
                  <span className="font-semibold text-emerald-600">{c.fee}</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${c.tagColor}`}>
                  {c.badge}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 flex items-center">
                  Active <Check className="w-3 h-3 text-emerald-500 ml-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Core Software Capabilities (Feature Breakdown) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Instant Token Minting</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Deploy standardized TRC-20, BEP-20, ERC-20, and SPL Tokens in seconds with custom name, ticker, supply, burn mechanics, and fee distributions.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Automated Liquidity Provision</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Directly pair tokens with TRX, BNB, ETH, or SOL and seed liquidity pools on Uniswap, PancakeSwap, Raydium, and SunSwap with automated LP burn/lock proof.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-slate-900">AES-256 Key Vault</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Client-side cryptographic protection for cold wallets and deployer keys using authenticated AES-256 GCM encryption.
          </p>
        </div>
      </div>

      {/* 5. Support & Chat Admin Section */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center space-x-3.5 text-center sm:text-left">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 mx-auto sm:mx-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <h4 className="text-sm sm:text-base font-bold text-white">Need Support or License Activation Key?</h4>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Contact our Admin directly at <strong className="text-slate-200 font-mono">celiwamama@gmail.com</strong> or use the floating live chat in the bottom right corner.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <a
            href={`mailto:celiwamama@gmail.com?subject=${encodeURIComponent(
              'Request: DVRA Software License Activation'
            )}&body=${encodeURIComponent(
              'Hello DVRA Team,\n\nI would like to request an activation license for the DVRA Software Suite:\n\n• Name / Organization: \n• Hardware / Device Identifier: \n• Number of Licenses Needed: \n• Additional Notes: \n\nPlease provide the activation key and instructions to activate the software.\n\nThank you,\n'
            )}`}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Email Admin</span>
          </a>
        </div>
      </div>

      {/* 6. Footer with Discreet Padlock Icon */}
      <div className="pt-6 pb-20 sm:pb-8 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>
          © 2026 DVRA Software Suite. All rights reserved. Support: <strong className="text-slate-600 font-mono">celiwamama@gmail.com</strong>
        </span>
        <button
          id="btn-footer-admin-login"
          onClick={onAdminUnlockRequest}
          title={isAdminUnlocked ? 'Admin Mode (Active)' : 'Security'}
          className="p-1.5 rounded-md hover:bg-slate-100 hover:text-slate-600 text-slate-300 transition-colors cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
