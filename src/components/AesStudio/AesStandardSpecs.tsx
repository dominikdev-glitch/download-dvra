import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck,
  Layers,
  Cpu,
  Lock,
} from 'lucide-react';
import { hexToBuffer, bufferToHex } from '../../utils/crypto';

// Official NIST SP 800-38D AES-GCM 256-bit Test Vector (Test Case 13/14)
const NIST_KAT_VECTOR = {
  name: 'NIST SP 800-38D AES-256-GCM Test Vector #1',
  keyHex: '0000000000000000000000000000000000000000000000000000000000000000',
  ivHex: '000000000000000000000000',
  plaintextHex: '00000000000000000000000000000000',
  expectedCiphertextHex: 'cea7403d4d606b6e074ec5d3baf39d18',
  expectedTagHex: 'd0d1c8a799996bf02223879f5462ee32',
};

export const AesStandardSpecs: React.FC = () => {
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');
  const [actualCipherHex, setActualCipherHex] = useState<string | null>(null);
  const [actualTagHex, setActualTagHex] = useState<string | null>(null);

  const runNistValidation = async () => {
    setTestStatus('running');
    try {
      const keyBytes = hexToBuffer(NIST_KAT_VECTOR.keyHex);
      const ivBytes = hexToBuffer(NIST_KAT_VECTOR.ivHex);
      const ptBytes = hexToBuffer(NIST_KAT_VECTOR.plaintextHex);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes,
          tagLength: 128,
        },
        cryptoKey,
        ptBytes
      );

      const fullBytes = new Uint8Array(encrypted);
      const cipherOnly = fullBytes.slice(0, fullBytes.length - 16);
      const tagOnly = fullBytes.slice(fullBytes.length - 16);

      const cipherHex = bufferToHex(cipherOnly);
      const tagHex = bufferToHex(tagOnly);

      setActualCipherHex(cipherHex);
      setActualTagHex(tagHex);

      if (
        cipherHex.toLowerCase() === NIST_KAT_VECTOR.expectedCiphertextHex.toLowerCase() &&
        tagHex.toLowerCase() === NIST_KAT_VECTOR.expectedTagHex.toLowerCase()
      ) {
        setTestStatus('passed');
      } else {
        setTestStatus('failed');
      }
    } catch {
      setTestStatus('failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              AES-256 Cryptographic Standards & Specifications
            </h3>
            <p className="text-xs text-slate-400">
              FIPS PUB 197 & NIST SP 800-38D compliance, parameters, and live mathematical validation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs text-slate-400 font-medium">Key Length</div>
            <div className="text-sm font-semibold text-emerald-400 font-mono">256 Bits (32 Bytes)</div>
            <p className="text-[11px] text-slate-500">2^256 theoretical combinations; quantum-resistant security ceiling.</p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs text-slate-400 font-medium">Block Size & Rounds</div>
            <div className="text-sm font-semibold text-cyan-400 font-mono">128-bit / 14 Rounds</div>
            <p className="text-[11px] text-slate-500">14 iterative substitution-permutation network (SPN) transformations.</p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs text-slate-400 font-medium">Authentication Tag</div>
            <div className="text-sm font-semibold text-indigo-400 font-mono">128-bit GHASH MAC</div>
            <p className="text-[11px] text-slate-500">Guarantees cryptographic integrity; defeats padding oracle attacks.</p>
          </div>
        </div>
      </div>

      {/* Live NIST KAT (Known Answer Test) Runner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-semibold text-slate-100">
              Live NIST SP 800-38D Test Vector Verification
            </h4>
          </div>

          <button
            onClick={runNistValidation}
            disabled={testStatus === 'running'}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{testStatus === 'passed' ? 'Re-Verify Vector' : 'Run NIST Test Vector'}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">Standard Test:</span>
            <span className="text-slate-300 font-semibold">{NIST_KAT_VECTOR.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Key (256-bit zeros):</span>
            <span className="text-slate-400 truncate max-w-[260px]">{NIST_KAT_VECTOR.keyHex}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Expected Cipher:</span>
            <span className="text-emerald-400">{NIST_KAT_VECTOR.expectedCiphertextHex}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Expected Tag:</span>
            <span className="text-cyan-400">{NIST_KAT_VECTOR.expectedTagHex}</span>
          </div>

          {actualCipherHex && (
            <div className="pt-2 border-t border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Actual Engine Cipher:</span>
                <span className={actualCipherHex === NIST_KAT_VECTOR.expectedCiphertextHex ? 'text-emerald-400' : 'text-rose-400'}>
                  {actualCipherHex}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Actual Engine Tag:</span>
                <span className={actualTagHex === NIST_KAT_VECTOR.expectedTagHex ? 'text-cyan-400' : 'text-rose-400'}>
                  {actualTagHex}
                </span>
              </div>
            </div>
          )}
        </div>

        {testStatus === 'passed' && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center space-x-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>100% Mathematical Compliance Verified:</strong> Browser Web Crypto engine output matches NIST SP 800-38D standard specification byte-for-byte.
            </span>
          </div>
        )}
      </div>

      {/* Security Architecture Best Practices */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>AES-256 Storage & Deployment Best Practices</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
            <h5 className="font-semibold text-slate-100 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Never Reuse an IV/Nonce in GCM</span>
            </h5>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              For AES-GCM, the 96-bit IV must NEVER be repeated with the same key. Repeating an IV destroys authentication security. Our engine automatically draws a fresh CSPRNG IV for every encryption call.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
            <h5 className="font-semibold text-slate-100 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>PBKDF2 Iteration Hardening</span>
            </h5>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              When generating keys from human passphrases, we utilize PBKDF2 with SHA-256 and a 128-bit cryptographic salt over 100,000 rounds to resist GPU/ASIC dictionary attacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
