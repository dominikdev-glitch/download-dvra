import React, { useState, useEffect } from 'react';
import {
  Unlock,
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Code2,
} from 'lucide-react';
import { AesMode, KeyDerivationMethod, DecryptionResult } from '../../types';
import { decryptTextAes, decryptDvraPayload } from '../../utils/crypto';

interface AesDecryptPanelProps {
  initialCiphertext?: string;
  initialKey?: string;
}

export const AesDecryptPanel: React.FC<AesDecryptPanelProps> = ({
  initialCiphertext = '',
  initialKey = '',
}) => {
  const [ciphertext, setCiphertext] = useState(initialCiphertext);
  const [passphraseOrKey, setPassphraseOrKey] = useState(initialKey || 'dvra-wallet-recovery-v1');
  const [showKey, setShowKey] = useState(false);
  const [forcedMode, setForcedMode] = useState<AesMode | 'auto' | 'DVRA'>('DVRA');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [result, setResult] = useState<DecryptionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'text' | 'json'>('text');

  useEffect(() => {
    if (initialCiphertext) setCiphertext(initialCiphertext);
    if (initialKey) setPassphraseOrKey(initialKey);
  }, [initialCiphertext, initialKey]);

  const handleDecrypt = async () => {
    if (!ciphertext.trim() || !passphraseOrKey.trim()) return;
    setIsDecrypting(true);
    setResult(null);

    try {
      if (forcedMode === 'DVRA' || passphraseOrKey === 'dvra-wallet-recovery-v1') {
        const dvraRes = await decryptDvraPayload(ciphertext, passphraseOrKey);
        if (dvraRes.success && dvraRes.plaintext) {
          setResult({
            success: true,
            plaintext: dvraRes.plaintext,
            detectedFormat: 'DVRA (16B IV + 16B Tag + Ciphertext)',
            mode: 'AES-256-GCM',
            durationMs: 1.0,
            isJson: dvraRes.plaintext.startsWith('{') || dvraRes.plaintext.startsWith('['),
            authVerified: true,
          });
          setViewMode(dvraRes.plaintext.startsWith('{') ? 'json' : 'text');
          return;
        } else if (forcedMode === 'DVRA') {
          throw new Error(dvraRes.error || 'DVRA Decryption failed.');
        }
      }

      const res = await decryptTextAes(
        ciphertext,
        passphraseOrKey,
        forcedMode === 'auto' || forcedMode === 'DVRA' ? undefined : { forcedMode }
      );
      setResult(res);
      if (res.isJson) {
        setViewMode('json');
      } else {
        setViewMode('text');
      }
    } catch (err: any) {
      setResult({
        success: false,
        plaintext: '',
        detectedFormat: 'Error',
        mode: 'AES-256-GCM',
        durationMs: 0,
        isJson: false,
        authVerified: false,
        error: err.message,
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCopy = () => {
    if (!result || !result.plaintext) return;
    navigator.clipboard.writeText(result.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPlaintext = () => {
    if (!result || !result.plaintext) return;
    const blob = new Blob([result.plaintext], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decrypted-secret-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Input Ciphertext & Key Controls (7 cols) */}
      <div className="lg:col-span-7 space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <Unlock className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-slate-100">
                Encrypted Ciphertext / Envelope Input
              </h3>
            </div>
            <button
              onClick={() => {
                setCiphertext('');
                setResult(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          </div>

          <textarea
            id="decrypt-ciphertext-input"
            rows={8}
            value={ciphertext}
            onChange={(e) => setCiphertext(e.target.value)}
            placeholder="Paste standard JSON envelope, packed Base64 payload, or Hexadecimal encrypted string..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Format:{' '}
              <strong className="text-slate-300">
                {ciphertext.trim().startsWith('{')
                  ? 'JSON Envelope detected'
                  : ciphertext.length > 0
                  ? 'Base64 / Hex String'
                  : 'Waiting for input'}
              </strong>
            </span>
          </div>
        </div>

        {/* Passphrase & Decrypt Action */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="decrypt-key-input" className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Decryption Passphrase or 256-bit Key</span>
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showKey ? 'Hide Key' : 'Reveal Key'}</span>
              </button>
            </div>

            <input
              id="decrypt-key-input"
              type={showKey ? 'text' : 'password'}
              value={passphraseOrKey}
              onChange={(e) => setPassphraseOrKey(e.target.value)}
              placeholder="Enter the exact secret passphrase or key used for encryption..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-400">Mode Override:</label>
              <select
                value={forcedMode}
                onChange={(e) => setForcedMode(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="DVRA">DVRA Format (AES-256-GCM + SHA256 Key)</option>
                <option value="auto">Auto-Detect standard Envelope</option>
                <option value="AES-256-GCM">Force AES-256-GCM</option>
                <option value="AES-256-CBC">Force AES-256-CBC</option>
              </select>
            </div>
          </div>

          <button
            id="btn-perform-decrypt"
            onClick={handleDecrypt}
            disabled={!ciphertext || !passphraseOrKey || isDecrypting}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-teal-950/40 transition-all cursor-pointer"
          >
            {isDecrypting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Decrypting Payload...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Decrypt & Verify Integrity (AES-256)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right: Decrypted Plaintext & Integrity Status (5 cols) */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full min-h-[480px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <FileCode className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-slate-100">
                Decrypted Plaintext
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              {result && (
                <button
                  onClick={() => setResult(null)}
                  className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  title="Lock and hide decrypted output"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Lock</span>
                </button>
              )}

              {result && result.success && result.isJson && (
                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      viewMode === 'text'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Raw
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      viewMode === 'json'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    JSON Tree
                  </button>
                </div>
              )}
            </div>
          </div>

          {result ? (
            result.success ? (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Integrity Badge */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center space-x-2 text-xs text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-emerald-200">Decryption Succeeded!</span>
                    <span className="text-emerald-400/80 ml-1">
                      {result.authVerified
                        ? '(128-bit GCM Authentication Tag Verified: Untampered)'
                        : '(AES-CBC Decryption Verified)'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400">{result.durationMs}ms</span>
                </div>

                {/* Plaintext Area */}
                <div className="relative flex-1">
                  {viewMode === 'json' && result.parsedJson ? (
                    <pre className="w-full h-full min-h-[220px] p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-auto leading-relaxed">
                      {JSON.stringify(result.parsedJson, null, 2)}
                    </pre>
                  ) : (
                    <textarea
                      readOnly
                      rows={10}
                      value={result.plaintext}
                      className="w-full h-full min-h-[220px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none resize-none leading-relaxed"
                    />
                  )}
                </div>

                {/* Meta details */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Detected Format:</span>
                    <span className="font-mono text-slate-200">{result.detectedFormat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cipher Mode:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{result.mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Decrypted Bytes:</span>
                    <span className="font-mono text-slate-300">{new Blob([result.plaintext]).size} bytes</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    id="btn-copy-decrypted-plaintext"
                    onClick={handleCopy}
                    className="flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Plaintext'}</span>
                  </button>

                  <button
                    id="btn-download-decrypted-txt"
                    onClick={handleDownloadPlaintext}
                    className="flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-950/40 border border-rose-600/40 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-sm font-semibold text-rose-300">Decryption Failed</p>
                  <p className="text-xs text-rose-400/90 leading-relaxed">{result.error}</p>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs pt-2">
                  Verify that the key or passphrase is exact and matches the ciphertext. AES-GCM automatically rejects data if even a single byte or bit was modified.
                </p>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
                <Unlock className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-slate-400">No Decryption Output</p>
              <p className="text-[11px] text-slate-600 max-w-xs mt-1">
                Enter your encrypted ciphertext payload and secret passphrase on the left, then click Decrypt to recover the original plaintext.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
