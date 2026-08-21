import React, { useState } from 'react';
import {
  KeyRound,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Lock,
  Binary,
  Hash,
} from 'lucide-react';
import {
  generate256BitKeyHex,
  generate256BitKeyBase64,
  generateSecurePassphrase,
  generateRandomBytes,
  bufferToHex,
  bufferToBase64,
} from '../../utils/crypto';

export const AesKeyGenerator: React.FC = () => {
  const [hexKey, setHexKey] = useState(generate256BitKeyHex());
  const [base64Key, setBase64Key] = useState(generate256BitKeyBase64());
  const [passphrase, setPassphrase] = useState(generateSecurePassphrase(4));
  const [salt128, setSalt128] = useState(bufferToHex(generateRandomBytes(16)));
  const [ivGcm96, setIvGcm96] = useState(bufferToHex(generateRandomBytes(12)));
  const [ivCbc128, setIvCbc128] = useState(bufferToHex(generateRandomBytes(16)));

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleRegenerateAll = () => {
    setHexKey(generate256BitKeyHex());
    setBase64Key(generate256BitKeyBase64());
    setPassphrase(generateSecurePassphrase(4));
    setSalt128(bufferToHex(generateRandomBytes(16)));
    setIvGcm96(bufferToHex(generateRandomBytes(12)));
    setIvCbc128(bufferToHex(generateRandomBytes(16)));
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Cryptographic Random Material Generator
            </h3>
            <p className="text-xs text-slate-400">
              Generates CSPRNG (Cryptographically Secure Pseudo-Random Number Generator) keys, salts, and IVs.
            </p>
          </div>
        </div>

        <button
          onClick={handleRegenerateAll}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Regenerate All Randoms</span>
        </button>
      </div>

      {/* Keys & Passphrases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 256-bit Raw Hex Key */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-slate-200">
                AES-256 Raw Hex Key (32 Bytes / 64 Hex Chars)
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-semibold">
              256-bit Entropy
            </span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 break-all select-all">
            {hexKey}
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              onClick={() => setHexKey(generate256BitKeyHex())}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Roll New Key
            </button>
            <button
              onClick={() => copyToClipboard(hexKey, 'hexKey')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              {copiedField === 'hexKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'hexKey' ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>

        {/* 256-bit Base64 Key */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-semibold text-slate-200">
                AES-256 Raw Base64 Key (32 Bytes / 44 Base64 Chars)
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-mono font-semibold">
              256-bit Entropy
            </span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-cyan-400 break-all select-all">
            {base64Key}
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              onClick={() => setBase64Key(generate256BitKeyBase64())}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Roll New Key
            </button>
            <button
              onClick={() => copyToClipboard(base64Key, 'base64Key')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              {copiedField === 'base64Key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'base64Key' ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>

        {/* High-Entropy Diceware Passphrase */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-slate-200">
                High-Entropy Memorable Passphrase (PBKDF2 Derivation)
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono font-semibold">
              ~64 bits Entropy
            </span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-amber-300 break-all select-all flex items-center justify-between">
            <span>{passphrase}</span>
            <button
              onClick={() => copyToClipboard(passphrase, 'passphrase')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors ml-4 shrink-0"
            >
              {copiedField === 'passphrase' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'passphrase' ? 'Copied' : 'Copy Passphrase'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auxiliary Cryptographic Parameters: Salts & IVs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h4 className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Auxiliary Random Parameters (Salts & Nonces)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">PBKDF2 Salt (16 Bytes):</span>
              <button
                onClick={() => copyToClipboard(salt128, 'salt')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                {copiedField === 'salt' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-slate-300 break-all text-[11px]">{salt128}</p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">GCM Nonce / IV (12 Bytes):</span>
              <button
                onClick={() => copyToClipboard(ivGcm96, 'ivGcm')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                {copiedField === 'ivGcm' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-slate-300 break-all text-[11px]">{ivGcm96}</p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">CBC IV (16 Bytes):</span>
              <button
                onClick={() => copyToClipboard(ivCbc128, 'ivCbc')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                {copiedField === 'ivCbc' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-slate-300 break-all text-[11px]">{ivCbc128}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
