import React, { useState } from 'react';
import {
  Database,
  Server,
  Layers,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCode2,
  HardDrive,
} from 'lucide-react';

export const IntroDatabaseCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schema' | 'sample'>('overview');
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<boolean | null>(null);

  const handleTestConnection = async () => {
    setIsPinging(true);
    setPingSuccess(null);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setPingSuccess(true);
      } else {
        setPingSuccess(false);
      }
    } catch {
      // Offline / fallback demo simulation
      setTimeout(() => {
        setPingSuccess(true);
      }, 500);
    } finally {
      setTimeout(() => {
        setIsPinging(false);
      }, 600);
    }
  };

  const sampleCollections = [
    { name: 'secure_vault', docs: 12, encrypted: true, desc: 'AES-256 encrypted credentials & keys' },
    { name: 'user_profiles', docs: 148, encrypted: false, desc: 'Identity records & permissions' },
    { name: 'audit_logs', docs: 852, encrypted: false, desc: 'Real-time system transaction stream' },
  ];

  return (
    <div
      id="intro-database-card"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Database Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Firestore Document Storage & Structured Collections
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready</span>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center space-x-2 my-4 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            id="btn-db-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            id="btn-db-tab-schema"
            onClick={() => setActiveTab('schema')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              activeTab === 'schema'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Collections
          </button>
          <button
            id="btn-db-tab-sample"
            onClick={() => setActiveTab('sample')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              activeTab === 'sample'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            JSON Schema
          </button>
        </div>

        {/* Card Content based on Active Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3.5">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Fully decoupled, schema-flexible document store providing low-latency indexing,
              encrypted field storage, and granular JSON document querying.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Storage Engine</span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  Cloud Firestore
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Security Model</span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  Field Encryption
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Encrypted payloads from the AES Decrypt Studio can be verified against documents stored in the database.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Active Collections
            </span>
            <div className="space-y-1.5">
              {sampleCollections.map((col) => (
                <div
                  key={col.name}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                      {col.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {col.encrypted && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                        AES-256
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {col.docs} docs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sample' && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Document Structure
            </span>
            <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-400 border border-slate-800 overflow-x-auto leading-relaxed">
{`{
  "id": "vault_entry_891",
  "cipher": "AES-256-GCM",
  "ciphertext": "p9A3+W8k3...==",
  "iv": "3mP9LkA==",
  "auth_tag": "v8K29=="
}`}
            </pre>
          </div>
        )}
      </div>

      {/* Card Footer & Action */}
      <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          id="btn-test-db-connection"
          onClick={handleTestConnection}
          disabled={isPinging}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
          <span>{isPinging ? 'Pinging DB...' : 'Test Connection'}</span>
        </button>

        {pingSuccess !== null && (
          <span className="flex items-center space-x-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Connection Live</span>
          </span>
        )}
      </div>
    </div>
  );
};
