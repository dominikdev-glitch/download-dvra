import React, { useState } from 'react';
import {
  X,
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { encryptTextAes, decryptTextAes, generateSecurePassphrase } from '../../utils/crypto';

interface FieldCryptoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'encrypt' | 'decrypt';
  fieldName: string;
  fieldValue: any;
  onApply: (updatedValue: any) => void;
}

export const FieldCryptoModal: React.FC<FieldCryptoModalProps> = ({
  isOpen,
  onClose,
  mode,
  fieldName,
  fieldValue,
  onApply,
}) => {
  const [passphrase, setPassphrase] = useState('MySuperSecretPassphrase-2026!');
  const [inputVal, setInputVal] = useState(
    typeof fieldValue === 'object' ? JSON.stringify(fieldValue, null, 2) : String(fieldValue || '')
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (!passphrase.trim()) {
      setError('Passphrase is required.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      if (mode === 'encrypt') {
        const encRes = await encryptTextAes(inputVal, {
          mode: 'AES-256-GCM',
          keyDerivation: 'PBKDF2',
          passphraseOrKey: passphrase,
          pbkdf2Iterations: 100000,
          outputFormat: 'JSON_ENVELOPE',
        });
        setResult(encRes.envelope);
      } else {
        const payloadToDecrypt =
          typeof fieldValue === 'object'
            ? JSON.stringify(fieldValue)
            : String(inputVal);

        const decRes = await decryptTextAes(payloadToDecrypt, passphrase);
        if (decRes.success) {
          setResult(decRes.isJson ? decRes.parsedJson : decRes.plaintext);
        } else {
          setError(decRes.error || 'Decryption failed.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Operation error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToDoc = () => {
    if (result === null) return;
    onApply(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span
              className={`p-1.5 rounded-lg ${
                mode === 'encrypt'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-teal-500/10 text-teal-400'
              }`}
            >
              {mode === 'encrypt' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {mode === 'encrypt' ? 'Encrypt Field with AES-256-GCM' : 'Decrypt AES-256 Field'}
              </h3>
              <p className="text-xs text-slate-400">
                Target Field: <code className="text-emerald-400 font-mono">{fieldName}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Plaintext / Cipher Input */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              {mode === 'encrypt' ? 'Plaintext Value to Encrypt:' : 'Encrypted Field Value / JSON:'}
            </label>
            <textarea
              rows={4}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Passphrase */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-slate-300 flex items-center space-x-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Passphrase / Key:</span>
              </label>
              {mode === 'encrypt' && (
                <button
                  type="button"
                  onClick={() => setPassphrase(generateSecurePassphrase(4))}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter secret passphrase..."
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Result preview if any */}
          {result && (
            <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{mode === 'encrypt' ? 'Ciphertext Generated' : 'Plaintext Recovered'}</span>
              </div>
              <pre className="font-mono text-[11px] text-slate-200 max-h-32 overflow-auto whitespace-pre-wrap">
                {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
              </pre>
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-600/40 rounded-xl text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{mode === 'encrypt' ? 'Execute Encrypt' : 'Execute Decrypt'}</span>
            </button>

            {result !== null && (
              <button
                onClick={handleSaveToDoc}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply to Field</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
