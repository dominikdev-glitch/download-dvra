import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  Sparkles,
  Copy,
  Check,
  Download,
  ArrowRight,
  RefreshCw,
  Sliders,
  Database,
  FileCode,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { AesMode, KeyDerivationMethod, OutputFormat, EncryptionResult } from '../../types';
import {
  encryptTextAes,
  generate256BitKeyHex,
  generateSecurePassphrase,
} from '../../utils/crypto';

interface AesEncryptPanelProps {
  onSendToDecrypt: (ciphertext: string, key: string) => void;
  onSaveToDatabase?: (encryptedData: any) => void;
}

const TEMPLATE_PRESETS = [
  {
    label: 'API Key & Secret',
    text: 'sk_live_99812401824091823901823091824098',
  },
  {
    label: 'User PII Record (JSON)',
    text: JSON.stringify(
      {
        fullName: 'Alexander Wright',
        ssn: '982-12-8491',
        dob: '1988-04-12',
        creditCard: {
          number: '4532-8891-2390-1124',
          cvv: '942',
          exp: '09/29',
        },
      },
      null,
      2
    ),
  },
  {
    label: 'Database Connection String',
    text: 'postgresql://master_admin:Xk9#mP2$Lq8@prod-db-cluster.internal:5432/primary_vault?sslmode=verify-full',
  },
];

export const AesEncryptPanel: React.FC<AesEncryptPanelProps> = ({
  onSendToDecrypt,
  onSaveToDatabase,
}) => {
  const [plaintext, setPlaintext] = useState('');
  const [mode, setMode] = useState<AesMode>('AES-256-GCM');
  const [keyDerivation, setKeyDerivation] = useState<KeyDerivationMethod>('PBKDF2');
  const [passphraseOrKey, setPassphraseOrKey] = useState('MySuperSecretPassphrase-2026!');
  const [iterations, setIterations] = useState<number>(100000);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('JSON_ENVELOPE');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSalt, setCustomSalt] = useState('');
  const [customIv, setCustomIv] = useState('');

  const [result, setResult] = useState<EncryptionResult | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateRandomKey = () => {
    if (keyDerivation === 'PBKDF2') {
      setPassphraseOrKey(generateSecurePassphrase(4));
    } else {
      setPassphraseOrKey(generate256BitKeyHex());
    }
  };

  const handleEncrypt = async () => {
    if (!plaintext) return;
    setIsEncrypting(true);
    try {
      const res = await encryptTextAes(plaintext, {
        mode,
        keyDerivation,
        passphraseOrKey,
        pbkdf2Iterations: iterations,
        outputFormat,
        customSaltHex: customSalt ? customSalt.trim() : undefined,
        customIvHex: customIv ? customIv.trim() : undefined,
      });
      setResult(res);
    } catch (err: any) {
      alert('Encryption Error: ' + err.message);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.formattedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.formattedOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aes-256-encrypted-${Date.now()}.enc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left / Top: Plaintext & Key Controls (7 cols) */}
      <div className="lg:col-span-7 space-y-5">
        {/* Plaintext Input Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Lock className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-slate-100">
                Sensitive Plaintext Input
              </h3>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-400">Presets:</span>
              {TEMPLATE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setPlaintext(preset.text)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
                >
                  {preset.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <textarea
            id="encrypt-plaintext-input"
            rows={7}
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            placeholder="Type or paste the sensitive text, token, API credentials, or JSON payload to encrypt using standard AES-256..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Length: <strong className="text-slate-200">{plaintext.length}</strong> characters (
              <strong className="text-slate-200">{new Blob([plaintext]).size}</strong> bytes)
            </span>
            {plaintext && (
              <button
                onClick={() => setPlaintext('')}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Clear Input
              </button>
            )}
          </div>
        </div>

        {/* Cryptographic Parameters Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                AES-256 Cipher Parameters
              </h3>
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Advanced' : 'Advanced Parameters'}</span>
            </button>
          </div>

          {/* Mode & Derivation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Cipher Mode (FIPS 197 / NIST SP 800-38)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('AES-256-GCM')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all ${
                    mode === 'AES-256-GCM'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-100 flex items-center justify-between">
                    <span>AES-256-GCM</span>
                    <span className="text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-400">
                      Standard
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Authenticated AEAD with 128-bit MAC Tag
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('AES-256-CBC')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all ${
                    mode === 'AES-256-CBC'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-100">AES-256-CBC</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Cipher Block Chaining with PKCS#7 Padding
                  </div>
                </button>
              </div>
            </div>

            {/* Key Derivation Type */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Key Derivation Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKeyDerivation('PBKDF2');
                    if (passphraseOrKey.length === 64) {
                      setPassphraseOrKey(generateSecurePassphrase(4));
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all ${
                    keyDerivation === 'PBKDF2'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-100">PBKDF2 (SHA-256)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Passphrase + 128-bit Salt Derivation
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setKeyDerivation('RAW_256_HEX');
                    setPassphraseOrKey(generate256BitKeyHex());
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all ${
                    keyDerivation === 'RAW_256_HEX'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-100">Direct 256-bit Key</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    32-Byte Raw Hexadecimal Key
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Passphrase / Key Input with Generate Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="encrypt-key-input" className="text-xs font-medium text-slate-300">
                {keyDerivation === 'PBKDF2'
                  ? 'Secret Passphrase / Password'
                  : '256-Bit Hexadecimal Key (64 hex characters / 32 bytes)'}
              </label>
              <button
                type="button"
                onClick={handleGenerateRandomKey}
                className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Strong Key</span>
              </button>
            </div>

            <div className="relative">
              <input
                id="encrypt-key-input"
                type="text"
                value={passphraseOrKey}
                onChange={(e) => setPassphraseOrKey(e.target.value)}
                placeholder="Enter secret passphrase or key..."
                className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Advanced: PBKDF2 Iterations & Custom Salt/IV */}
          {showAdvanced && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  PBKDF2 Iteration Count: <span className="font-mono text-emerald-400">{iterations.toLocaleString()}</span> rounds
                </label>
                <span className="text-[11px] text-slate-400">OWASP recommends ≥100,000</span>
              </div>
              <input
                type="range"
                min="10000"
                max="250000"
                step="10000"
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Custom Salt (Hex, leave empty for CSPRNG random):
                  </label>
                  <input
                    type="text"
                    value={customSalt}
                    onChange={(e) => setCustomSalt(e.target.value)}
                    placeholder="e.g. 1a2b3c4d..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Custom IV (Hex, leave empty for CSPRNG random):
                  </label>
                  <input
                    type="text"
                    value={customIv}
                    onChange={(e) => setCustomIv(e.target.value)}
                    placeholder="e.g. fe82c091..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Output Format Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Envelope & Output Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOutputFormat('JSON_ENVELOPE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                  outputFormat === 'JSON_ENVELOPE'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                JSON Envelope
              </button>
              <button
                type="button"
                onClick={() => setOutputFormat('PACKED_BASE64')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                  outputFormat === 'PACKED_BASE64'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Packed Base64
              </button>
              <button
                type="button"
                onClick={() => setOutputFormat('HEX')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                  outputFormat === 'HEX'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Hex String
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            id="btn-perform-encrypt"
            onClick={handleEncrypt}
            disabled={!plaintext || !passphraseOrKey || isEncrypting}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            {isEncrypting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Encrypting AES-256...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Encrypt Sensitive Payload with AES-256</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right / Bottom: Encrypted Output & Diagnostic Inspector (5 cols) */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full min-h-[480px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <FileCode className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-slate-100">
                Encrypted Ciphertext Output
              </h3>
            </div>
            {result && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">
                {result.rawStats.durationMs}ms
              </span>
            )}
          </div>

          {result ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Cipher Output Text Area */}
              <div className="relative flex-1">
                <textarea
                  readOnly
                  rows={10}
                  value={result.formattedOutput}
                  className="w-full h-full min-h-[200px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Cryptographic Telemetry Stats */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Algorithm:</span>
                  <span className="font-mono text-slate-200 font-semibold">{result.rawStats.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Key Length:</span>
                  <span className="font-mono text-emerald-400">256 bits (32 bytes)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Initialization Vector (IV):</span>
                  <span className="font-mono text-slate-300 truncate max-w-[200px]">{result.envelope.iv}</span>
                </div>
                {result.envelope.tag && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Auth Tag (128-bit MAC):</span>
                    <span className="font-mono text-cyan-400 truncate max-w-[200px]">{result.envelope.tag}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Ciphertext Size:</span>
                  <span className="font-mono text-slate-300">{result.rawStats.ciphertextBytes} bytes</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  id="btn-copy-encrypted"
                  onClick={handleCopy}
                  className="flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Ciphertext'}</span>
                </button>

                <button
                  id="btn-download-enc-file"
                  onClick={handleDownload}
                  className="flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download .enc</span>
                </button>
              </div>

              <button
                id="btn-send-to-decrypt-tab"
                onClick={() => onSendToDecrypt(result.formattedOutput, passphraseOrKey)}
                className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-colors"
              >
                <span>Verify in Decrypt Tab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {onSaveToDatabase && (
                <button
                  id="btn-save-to-database-direct"
                  onClick={() => onSaveToDatabase(result.envelope)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  <span>Store Directly in Firestore Vault</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
                <Lock className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-slate-400">No Ciphertext Generated</p>
              <p className="text-[11px] text-slate-600 max-w-xs mt-1">
                Enter your sensitive text and secret key on the left, then click Encrypt to generate standard AES-256 ciphertext.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
