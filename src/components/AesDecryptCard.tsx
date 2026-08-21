import React, { useState } from 'react';
import {
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  FileCode2,
  Lock,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { decryptDvraPayload, DvraDecryptionResult } from '../utils/crypto';

export const AesDecryptCard: React.FC = () => {
  const DEFAULT_KEY = 'dvra-wallet-recovery-v1';

  const [inputCiphertext, setInputCiphertext] = useState('');
  const [passphrase, setPassphrase] = useState(DEFAULT_KEY);
  const [showPass, setShowPass] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [result, setResult] = useState<DvraDecryptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleDecrypt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCiphertext.trim()) {
      setError('Please paste the encrypted Base64 string (e.g. record.encrypted.privateKey or record.encrypted.mnemonic) or JSON record.');
      return;
    }
    if (!passphrase.trim()) {
      setError('Please provide the recovery key (default is dvra-wallet-recovery-v1).');
      return;
    }

    setIsDecrypting(true);
    setError(null);
    setResult(null);

    try {
      const res = await decryptDvraPayload(inputCiphertext, passphrase.trim());
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error || 'Decryption failed. Please check key and payload.');
      }
    } catch (err: any) {
      setError(err.message || 'Decryption error. Check if the recovery key or payload is correct.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCopy = (text: string, fieldName?: string) => {
    navigator.clipboard.writeText(text);
    if (fieldName) {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePasteExample = () => {
    // Generate an example payload with dvra format
    setInputCiphertext('paste your record.encrypted.privateKey or record.encrypted.mnemonic base64 string here');
  };

  return (
    <div
      id="aes-decrypt-card"
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                DVRA AES-256-GCM Decrypt
              </h2>
              <p className="text-xs text-slate-500">
                Key: SHA-256(FIREBASE_RECOVERY_KEY) • 16B IV + 16B Tag + Ciphertext
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-medium border border-blue-100">
            AES-256-GCM
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleDecrypt} className="space-y-4 my-4">
          {/* Recovery Key Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Recovery Key (FIREBASE_RECOVERY_KEY)
              </label>
              <button
                type="button"
                onClick={() => setPassphrase(DEFAULT_KEY)}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Reset to Default
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <input
                id="input-passphrase"
                type={showPass ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="dvra-wallet-recovery-v1"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Ciphertext / Base64 input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Encrypted Field or Record
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                record.encrypted.privateKey / mnemonic / Base64
              </span>
            </div>
            <textarea
              id="input-ciphertext"
              rows={4}
              value={inputCiphertext}
              onChange={(e) => setInputCiphertext(e.target.value)}
              placeholder="Paste encrypted Base64 string (or the entire JSON document containing encrypted.privateKey / encrypted.mnemonic)..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{error}</p>
                <p className="text-[11px] text-red-600">
                  Tip: Make sure you copied the exact Base64 value from <code className="font-mono bg-red-100 px-1 py-0.5 rounded">record.encrypted.privateKey</code> or <code className="font-mono bg-red-100 px-1 py-0.5 rounded">record.encrypted.mnemonic</code>, or paste the whole JSON document and the system will auto-extract it.
                </p>
              </div>
            </div>
          )}

          {/* Result Banner */}
          {result && result.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Decryption Successful</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  AES-256-GCM Verified
                </span>
              </div>

              {/* Multi-field results if detected */}
              {result.fieldResults && Object.keys(result.fieldResults).length > 1 ? (
                <div className="space-y-2">
                  {Object.entries(result.fieldResults).map(([field, val]) => (
                    <div key={field} className="p-2.5 bg-white rounded-lg border border-emerald-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="font-mono text-emerald-700">{field}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(val), field)}
                          className="flex items-center space-x-1 text-slate-500 hover:text-emerald-700 text-xs cursor-pointer"
                        >
                          {copiedField === field ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === field ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-xs text-slate-900 break-all select-all bg-slate-50 p-2 rounded">
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Decrypted Plaintext</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(result.plaintext || '')}
                      className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 text-xs cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy Plaintext'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 font-mono text-xs text-slate-900 break-all select-all leading-relaxed">
                    {result.plaintext}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Footer & Trigger */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-mono">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>Local Node Decrypt Ready</span>
        </div>

        <button
          id="btn-run-dvra-decrypt"
          type="button"
          onClick={() => handleDecrypt()}
          disabled={isDecrypting}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>{isDecrypting ? 'Decrypting...' : 'Decrypt'}</span>
        </button>
      </div>
    </div>
  );
};
