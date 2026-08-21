import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Binary,
  Layers,
} from 'lucide-react';
import { AesEncryptPanel } from './AesEncryptPanel';
import { AesDecryptPanel } from './AesDecryptPanel';
import { AesKeyGenerator } from './AesKeyGenerator';
import { AesStandardSpecs } from './AesStandardSpecs';

interface AesCryptoViewProps {
  onSaveToDatabase?: (encryptedData: any) => void;
  defaultSubTab?: 'encrypt' | 'decrypt' | 'keygen' | 'specs';
}

export const AesCryptoView: React.FC<AesCryptoViewProps> = ({
  onSaveToDatabase,
  defaultSubTab = 'decrypt',
}) => {
  const [subTab, setSubTab] = useState<'encrypt' | 'decrypt' | 'keygen' | 'specs'>(defaultSubTab);
  const [decryptInitialData, setDecryptInitialData] = useState<{
    ciphertext: string;
    key: string;
  }>({ ciphertext: '', key: 'dvra-wallet-recovery-v1' });

  const handleSendToDecrypt = (ciphertext: string, key: string) => {
    setDecryptInitialData({ ciphertext, key });
    setSubTab('decrypt');
  };

  return (
    <div id="aes-crypto-studio-view" className="space-y-6">
      {/* Subtabs Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>AES-256 Cryptographic Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            FIPS-197 compliant symmetric encryption & authenticated decryption (GCM / CBC) for sensitive text, keys, and database payloads.
          </p>
        </div>

        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto max-w-full">
          <button
            id="subtab-encrypt"
            onClick={() => setSubTab('encrypt')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              subTab === 'encrypt'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Encrypt</span>
          </button>

          <button
            id="subtab-decrypt"
            onClick={() => setSubTab('decrypt')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              subTab === 'decrypt'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Decrypt & Verify</span>
          </button>

          <button
            id="subtab-keygen"
            onClick={() => setSubTab('keygen')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              subTab === 'keygen'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Key Generator</span>
          </button>

          <button
            id="subtab-specs"
            onClick={() => setSubTab('specs')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              subTab === 'specs'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>NIST Specs & KAT</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {subTab === 'encrypt' && (
          <AesEncryptPanel
            onSendToDecrypt={handleSendToDecrypt}
            onSaveToDatabase={onSaveToDatabase}
          />
        )}
        {subTab === 'decrypt' && (
          <AesDecryptPanel
            initialCiphertext={decryptInitialData.ciphertext}
            initialKey={decryptInitialData.key}
          />
        )}
        {subTab === 'keygen' && <AesKeyGenerator />}
        {subTab === 'specs' && <AesStandardSpecs />}
      </div>
    </div>
  );
};
