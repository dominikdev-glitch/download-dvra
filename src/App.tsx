import React, { useState, useEffect } from 'react';
import {
  Database,
  Unlock,
  ArrowLeft,
  ArrowRight,
  Shield,
  Layers,
  KeyRound,
  Download,
  Lock,
  LogOut,
} from 'lucide-react';
import { DatabaseView } from './components/DatabaseExplorer/DatabaseView';
import { AesCryptoView } from './components/AesStudio/AesCryptoView';
import { SoftwareDownloadView } from './components/DownloadSoftware/SoftwareDownloadView';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { ServiceAccountModal } from './components/ServiceAccountModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { ConnectionStatus } from './types';
import { authFetch } from './lib/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'download' | 'home' | 'database' | 'decrypt'>('download');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [pendingTargetPage, setPendingTargetPage] = useState<'home' | 'database' | 'decrypt' | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    mode: 'sandbox',
  });

  // Verify Admin Session on mount
  const checkAdminAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setIsAdminUnlocked(false);
      return;
    }

    try {
      const res = await authFetch('/api/admin/verify', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.valid) {
        setIsAdminUnlocked(true);
        checkStatus();
      } else {
        localStorage.removeItem('admin_token');
        setIsAdminUnlocked(false);
      }
    } catch {
      setIsAdminUnlocked(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await authFetch('/api/firebase/status');
      const data = await res.json();
      if (data.connected && data.mode === 'real') {
        setConnectionStatus({
          connected: true,
          mode: 'real',
          projectId: data.projectId,
          clientEmail: data.clientEmail,
          connectedAt: data.connectedAt,
        });
      } else {
        setConnectionStatus({
          connected: false,
          mode: 'sandbox',
        });
      }
    } catch {
      setConnectionStatus({
        connected: false,
        mode: 'sandbox',
      });
    }
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const handleAdminSuccess = () => {
    setIsAdminUnlocked(true);
    checkStatus();
    if (pendingTargetPage) {
      setCurrentPage(pendingTargetPage);
      setPendingTargetPage(null);
    } else {
      setCurrentPage('home');
    }
  };

  const handleOpenProtectedPage = (target: 'home' | 'database' | 'decrypt') => {
    if (isAdminUnlocked) {
      setCurrentPage(target);
    } else {
      setPendingTargetPage(target);
      setIsAdminModalOpen(true);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdminUnlocked(false);
    setCurrentPage('download');
  };

  const handleConnectServiceAccount = async (serviceAccountJson: string) => {
    const res = await authFetch('/api/firebase/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceAccountKey: serviceAccountJson }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setConnectionStatus({
        connected: true,
        mode: 'real',
        projectId: data.projectId,
        clientEmail: data.clientEmail,
        connectedAt: data.connectedAt,
      });
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Connection failed' };
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans max-w-full-viewport">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 truncate">
            {currentPage !== 'download' && (
              <button
                id="btn-back-download"
                onClick={() => setCurrentPage('download')}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Downloads</span>
              </button>
            )}

            <div
              onClick={() => setCurrentPage(isAdminUnlocked ? 'home' : 'download')}
              className="cursor-pointer truncate"
            >
              <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-1.5 truncate">
                <span className="truncate">
                  {currentPage === 'download' && 'DVRA Suite'}
                  {currentPage === 'home' && 'Admin Control'}
                  {currentPage === 'database' && 'Database Explorer'}
                  {currentPage === 'decrypt' && 'AES Decrypt Studio'}
                </span>
                {isAdminUnlocked && (
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full uppercase tracking-wider shrink-0">
                    Admin
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {/* If Admin is unlocked, show navigation tabs & lock button */}
            {isAdminUnlocked && (
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs overflow-x-auto max-w-[200px] sm:max-w-none">
                <button
                  id="tab-download"
                  onClick={() => setCurrentPage('download')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors text-xs ${
                    currentPage === 'download'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="hidden sm:inline">Downloads</span>
                  <span className="sm:hidden">App</span>
                </button>
                <button
                  id="tab-home"
                  onClick={() => setCurrentPage('home')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors text-xs ${
                    currentPage === 'home'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tools
                </button>
                <button
                  id="tab-database"
                  onClick={() => setCurrentPage('database')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors text-xs ${
                    currentPage === 'database'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="hidden sm:inline">Database</span>
                  <span className="sm:hidden">DB</span>
                </button>
                <button
                  id="tab-decrypt"
                  onClick={() => setCurrentPage('decrypt')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors text-xs ${
                    currentPage === 'decrypt'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  AES
                </button>
                <button
                  onClick={handleAdminLogout}
                  title="Lock & Exit Admin Mode"
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded flex items-center space-x-1 font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto p-3 sm:p-6 ${currentPage === 'database' ? 'max-w-7xl' : 'max-w-5xl'}`}>
        {/* 1. Public Download Page (Default for All Visitors) */}
        {currentPage === 'download' && (
          <SoftwareDownloadView
            onAdminUnlockRequest={() => {
              setPendingTargetPage('home');
              setIsAdminModalOpen(true);
            }}
            isAdminUnlocked={isAdminUnlocked}
          />
        )}

        {/* 2. Admin Home (Tool Cards) */}
        {currentPage === 'home' && isAdminUnlocked && (
          <div className="py-6 sm:py-8 space-y-6">
            <div className="text-center max-w-lg mx-auto space-y-1.5 px-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Admin Control Center</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Your database records, security keys, and decryption tools are unlocked.
              </p>
            </div>

            {/* 2 Clean Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto pt-2">
              {/* Card 1: Database Explorer */}
              <div
                id="card-database"
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-slate-300 hover:shadow transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Database Explorer</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      View and browse database collections, inspect stored documents, and view schema records.
                    </p>
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    id="btn-open-database"
                    onClick={() => setCurrentPage('database')}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <span>Open Database</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 2: AES Decrypt */}
              <div
                id="card-decrypt"
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-slate-300 hover:shadow transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Unlock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">AES Decrypt</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Decrypt AES-256 ciphertexts, envelopes, and encrypted payloads with your secret passphrase.
                    </p>
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    id="btn-open-decrypt"
                    onClick={() => setCurrentPage('decrypt')}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <span>Open AES Decrypt</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Software Release Direct Link Setting */}
            <div className="max-w-3xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Software Direct Download Link (GitHub / Cloud / CDN)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">105 MB Windows Build</span>
              </div>
              <p className="text-xs text-slate-600">
                Because 105MB exceeds the 25MB chat upload limit, paste your direct hosted download URL below (e.g. from GitHub Releases, Google Drive direct link, Mega, or Dropbox):
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  id="input-custom-download-url"
                  placeholder="https://github.com/.../releases/download/v1.0.2/DVRA-Setup.exe"
                  defaultValue={localStorage.getItem('dvra_custom_download_url') || ''}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  onChange={(e) => {
                    localStorage.setItem('dvra_custom_download_url', e.target.value.trim());
                  }}
                />
                <button
                  onClick={() => {
                    const val = (document.getElementById('input-custom-download-url') as HTMLInputElement)?.value.trim();
                    localStorage.setItem('dvra_custom_download_url', val || '');
                    alert('Download URL updated successfully!');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Save Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Database Explorer (Admin Only) */}
        {currentPage === 'database' && isAdminUnlocked && (
          <div>
            <DatabaseView
              connectionStatus={connectionStatus}
              onOpenServiceAccountModal={() => setIsServiceModalOpen(true)}
            />
          </div>
        )}

        {/* 4. AES Decrypt (Admin Only) */}
        {currentPage === 'decrypt' && isAdminUnlocked && (
          <div>
            <AesCryptoView />
          </div>
        )}
      </main>

      {/* PWA "Add to Home Screen" Banner / Modal */}
      <PwaInstallPrompt />

      {/* Admin Password Authentication Modal */}
      <AdminPasswordModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setPendingTargetPage(null);
        }}
        onSuccess={handleAdminSuccess}
      />

      {/* Service Account Modal */}
      <ServiceAccountModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onConnect={handleConnectServiceAccount}
        onUseSandbox={() => {
          setConnectionStatus({ connected: false, mode: 'sandbox' });
        }}
        currentProjectId={connectionStatus.projectId}
      />
    </div>
  );
}
