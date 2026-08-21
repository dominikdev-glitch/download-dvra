import {
  AesMode,
  KeyDerivationMethod,
  AesEncryptionConfig,
  EncryptionResult,
  DecryptionResult,
  AesEncryptedEnvelope,
} from '../types';

// Helper: ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const cleanBase64 = base64.trim().replace(/\s+/g, '');
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper: ArrayBuffer to Hex
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Hex to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.trim().replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hexadecimal string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Generate Secure Random Bytes
export function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// Generate Secure 256-bit Key (32 bytes)
export function generate256BitKeyHex(): string {
  return bufferToHex(generateRandomBytes(32));
}

export function generate256BitKeyBase64(): string {
  return bufferToBase64(generateRandomBytes(32));
}

export function generateSecurePassphrase(wordCount = 4): string {
  const words = [
    'falcon', 'quantum', 'cipher', 'nexus', 'aurora', 'vertex', 'granite',
    'horizon', 'pulsar', 'beacon', 'zenith', 'cascade', 'cobalt', 'matrix',
    'shield', 'vortex', 'timber', 'monolith', 'stellar', 'plasma', 'ember',
    'titan', 'echo', 'prism', 'solace', 'glacier', 'phantom', 'hyper'
  ];
  const selected: string[] = [];
  const randomBytes = generateRandomBytes(wordCount * 2);
  for (let i = 0; i < wordCount; i++) {
    const idx = (randomBytes[i * 2] * 256 + randomBytes[i * 2 + 1]) % words.length;
    selected.push(words[idx]);
  }
  const suffix = (randomBytes[0] % 900 + 100).toString();
  return selected.join('-') + '-' + suffix;
}

// Key Derivation using PBKDF2 (SHA-256)
async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
  algorithm: 'AES-GCM' | 'AES-CBC'
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: algorithm, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Import Raw 256-bit Key directly
async function importRawKey(
  rawBytes: Uint8Array,
  algorithm: 'AES-GCM' | 'AES-CBC'
): Promise<CryptoKey> {
  if (rawBytes.length !== 32) {
    throw new Error(`AES-256 requires exactly 32 bytes (256 bits). Provided: ${rawBytes.length} bytes.`);
  }
  return crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: algorithm, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * AES-256 Standard Encryption
 */
export async function encryptTextAes(
  plaintext: string,
  config: AesEncryptionConfig
): Promise<EncryptionResult> {
  const startTime = performance.now();
  const encoder = new TextEncoder();
  const plainBytes = encoder.encode(plaintext);

  const isGcm = config.mode === 'AES-256-GCM';
  const algoName = isGcm ? 'AES-GCM' : 'AES-CBC';

  // 1. Prepare Salt & Key
  let salt: Uint8Array | undefined;
  let cryptoKey: CryptoKey;

  if (config.keyDerivation === 'PBKDF2') {
    if (config.customSaltHex) {
      salt = hexToBuffer(config.customSaltHex);
    } else {
      salt = generateRandomBytes(16); // 128-bit salt
    }
    cryptoKey = await deriveKeyFromPassphrase(
      config.passphraseOrKey,
      salt,
      config.pbkdf2Iterations || 100000,
      algoName
    );
  } else if (config.keyDerivation === 'RAW_256_HEX') {
    const raw = hexToBuffer(config.passphraseOrKey);
    cryptoKey = await importRawKey(raw, algoName);
  } else {
    const raw = base64ToBuffer(config.passphraseOrKey);
    cryptoKey = await importRawKey(raw, algoName);
  }

  // 2. Prepare IV (Initialization Vector)
  // GCM recommended standard: 12 bytes (96 bits)
  // CBC standard: 16 bytes (128 bits)
  let iv: Uint8Array;
  if (config.customIvHex) {
    iv = hexToBuffer(config.customIvHex);
  } else {
    iv = generateRandomBytes(isGcm ? 12 : 16);
  }

  // 3. Perform Encryption
  let encryptedBuffer: ArrayBuffer;
  let tagBase64: string | undefined;

  if (isGcm) {
    // Web Crypto API appends the 16-byte (128-bit) authentication tag at the end of the ciphertext buffer for AES-GCM
    encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      cryptoKey,
      plainBytes
    );

    const fullEncBytes = new Uint8Array(encryptedBuffer);
    // Split tag for clear envelope inspection
    const tagBytes = fullEncBytes.slice(fullEncBytes.length - 16);
    tagBase64 = bufferToBase64(tagBytes);
  } else {
    encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-CBC',
        iv: iv,
      },
      cryptoKey,
      plainBytes
    );
  }

  const cipherBytes = new Uint8Array(encryptedBuffer);

  // 4. Create Envelope
  const envelope: AesEncryptedEnvelope = {
    cipher: config.mode,
    ciphertext: bufferToBase64(cipherBytes),
    iv: bufferToBase64(iv),
    salt: salt ? bufferToBase64(salt) : undefined,
    tag: tagBase64,
    iterations: config.keyDerivation === 'PBKDF2' ? config.pbkdf2Iterations : undefined,
    format: 'json_envelope_v1',
    timestamp: new Date().toISOString(),
  };

  // 5. Format Output
  let formattedOutput = '';
  if (config.outputFormat === 'JSON_ENVELOPE') {
    formattedOutput = JSON.stringify(envelope, null, 2);
  } else if (config.outputFormat === 'HEX') {
    formattedOutput = bufferToHex(cipherBytes);
  } else {
    // PACKED_BASE64: [Magic Header 1B (0x01 = GCM, 0x02 = CBC)] [Salt Len 1B] [Salt] [IV Len 1B] [IV] [Ciphertext]
    const saltLen = salt ? salt.length : 0;
    const packedLen = 1 + 1 + saltLen + 1 + iv.length + cipherBytes.length;
    const packed = new Uint8Array(packedLen);
    let offset = 0;
    packed[offset++] = isGcm ? 0x01 : 0x02;
    packed[offset++] = saltLen;
    if (salt) {
      packed.set(salt, offset);
      offset += saltLen;
    }
    packed[offset++] = iv.length;
    packed.set(iv, offset);
    offset += iv.length;
    packed.set(cipherBytes, offset);

    formattedOutput = bufferToBase64(packed);
  }

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    formattedOutput,
    envelope,
    rawStats: {
      plaintextBytes: plainBytes.length,
      ciphertextBytes: cipherBytes.length,
      durationMs,
      keyBits: 256,
      mode: config.mode,
    },
  };
}

/**
 * AES-256 Standard Decryption
 */
export async function decryptTextAes(
  inputPayload: string,
  passphraseOrKey: string,
  options?: {
    forcedMode?: AesMode;
    forcedDerivation?: KeyDerivationMethod;
    customIterations?: number;
    customIv?: string;
    customSalt?: string;
  }
): Promise<DecryptionResult> {
  const startTime = performance.now();
  const trimmed = inputPayload.trim();

  try {
    let mode: AesMode = options?.forcedMode || 'AES-256-GCM';
    let salt: Uint8Array | undefined;
    let iv: Uint8Array;
    let cipherBytes: Uint8Array;
    let detectedFormat = 'Custom';
    let iterations = options?.customIterations || 100000;

    // Check if input is JSON envelope
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.ciphertext && parsed.iv) {
          detectedFormat = 'JSON Envelope (v1)';
          mode = (parsed.cipher as AesMode) || mode;
          cipherBytes = base64ToBuffer(parsed.ciphertext);
          iv = base64ToBuffer(parsed.iv);
          if (parsed.salt) {
            salt = base64ToBuffer(parsed.salt);
          }
          if (parsed.iterations) {
            iterations = parsed.iterations;
          }
        } else {
          throw new Error('JSON does not contain ciphertext and iv fields.');
        }
      } catch (err: any) {
        throw new Error(`Invalid JSON Envelope format: ${err.message}`);
      }
    } else {
      // Try Packed Binary Base64
      let isPacked = false;
      try {
        const rawBytes = base64ToBuffer(trimmed);
        if (rawBytes.length > 20 && (rawBytes[0] === 0x01 || rawBytes[0] === 0x02)) {
          isPacked = true;
          detectedFormat = 'Packed Base64 Package';
          mode = rawBytes[0] === 0x01 ? 'AES-256-GCM' : 'AES-256-CBC';
          let offset = 1;
          const saltLen = rawBytes[offset++];
          if (saltLen > 0) {
            salt = rawBytes.slice(offset, offset + saltLen);
            offset += saltLen;
          }
          const ivLen = rawBytes[offset++];
          iv = rawBytes.slice(offset, offset + ivLen);
          offset += ivLen;
          cipherBytes = rawBytes.slice(offset);
        }
      } catch {
        isPacked = false;
      }

      if (!isPacked) {
        // Fallback: Check if Hex or Raw Base64
        if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
          detectedFormat = 'Hexadecimal';
          cipherBytes = hexToBuffer(trimmed);
        } else {
          detectedFormat = 'Raw Base64';
          cipherBytes = base64ToBuffer(trimmed);
        }

        if (options?.customIv) {
          iv = hexToBuffer(options.customIv);
        } else {
          iv = new Uint8Array(mode === 'AES-256-GCM' ? 12 : 16); // Fallback zero IV if missing
        }

        if (options?.customSalt) {
          salt = hexToBuffer(options.customSalt);
        }
      }
    }

    const isGcm = mode === 'AES-256-GCM';
    const algoName = isGcm ? 'AES-GCM' : 'AES-CBC';

    // Derive or import Key
    let cryptoKey: CryptoKey;
    const derivation = options?.forcedDerivation || (salt ? 'PBKDF2' : 'PBKDF2');

    if (derivation === 'PBKDF2') {
      const activeSalt = salt || new Uint8Array(16);
      cryptoKey = await deriveKeyFromPassphrase(
        passphraseOrKey,
        activeSalt,
        iterations,
        algoName
      );
    } else if (derivation === 'RAW_256_HEX') {
      cryptoKey = await importRawKey(hexToBuffer(passphraseOrKey), algoName);
    } else {
      cryptoKey = await importRawKey(base64ToBuffer(passphraseOrKey), algoName);
    }

    // Decrypt
    let decryptedBuffer: ArrayBuffer;
    if (isGcm) {
      decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv!,
          tagLength: 128,
        },
        cryptoKey,
        cipherBytes!
      );
    } else {
      decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-CBC',
          iv: iv!,
        },
        cryptoKey,
        cipherBytes!
      );
    }

    const decoder = new TextDecoder('utf-8', { fatal: true });
    const plaintext = decoder.decode(decryptedBuffer);

    let isJson = false;
    let parsedJson: any = null;
    try {
      if (plaintext.startsWith('{') || plaintext.startsWith('[')) {
        parsedJson = JSON.parse(plaintext);
        isJson = true;
      }
    } catch {
      isJson = false;
    }

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      success: true,
      plaintext,
      detectedFormat,
      mode,
      durationMs,
      isJson,
      parsedJson,
      authVerified: isGcm,
    };
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      success: false,
      plaintext: '',
      detectedFormat: 'Unknown',
      mode: options?.forcedMode || 'AES-256-GCM',
      durationMs,
      isJson: false,
      authVerified: false,
      error:
        err.name === 'OperationError' || err.message?.includes('tag')
          ? 'Decryption failed: Authentication tag mismatch or incorrect key/passphrase.'
          : err.message || 'Decryption error.',
    };
  }
}

/**
 * DVRA Format:
 * - Algorithm: AES-256-GCM
 * - Key: SHA-256(UTF-8 of FIREBASE_RECOVERY_KEY)
 * - Base64 Layout: [16 bytes IV] [16 bytes GCM Auth Tag] [Ciphertext]
 */
export async function decryptSingleDvraBase64(
  base64Payload: string,
  recoveryKey: string = 'dvra-wallet-recovery-v1'
): Promise<string> {
  const clean = base64Payload.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  if (!clean) throw new Error('Empty payload');

  const rawBytes = base64ToBuffer(clean);
  if (rawBytes.length < 32) {
    throw new Error(`Payload is too short (${rawBytes.length} bytes, minimum 32 bytes required for 16B IV + 16B Tag)`);
  }

  const iv = rawBytes.slice(0, 16);
  const tag = rawBytes.slice(16, 32);
  const ciphertext = rawBytes.slice(32);

  // WebCrypto AES-GCM expects ciphertext + tag combined in the data parameter
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  // Key = SHA-256(recoveryKey)
  const enc = new TextEncoder();
  const keyHash = await crypto.subtle.digest('SHA-256', enc.encode(recoveryKey));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    cryptoKey,
    combined
  );

  return new TextDecoder('utf-8').decode(decrypted);
}

export interface DvraDecryptionResult {
  success: boolean;
  plaintext?: string;
  fieldResults?: Record<string, string>;
  error?: string;
  details?: {
    keyUsed: string;
    fieldsFound?: string[];
  };
}

/**
 * Multi-field / Document Auto-detecting DVRA Decryptor
 */
export async function decryptDvraPayload(
  rawInput: string,
  recoveryKey: string = 'dvra-wallet-recovery-v1'
): Promise<DvraDecryptionResult> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { success: false, error: 'Please enter a base64 encrypted string or Firestore record.' };
  }

  // 1. Check if user pasted a JSON record (e.g. whole Firestore document)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const results: Record<string, string> = {};
      const fieldsFound: string[] = [];

      // Look for common DVRA fields: record.encrypted.privateKey, record.encrypted.mnemonic, etc.
      const searchTargets: Array<{ key: string; value: any }> = [];

      if (parsed.encrypted && typeof parsed.encrypted === 'object') {
        Object.entries(parsed.encrypted).forEach(([k, v]) => {
          if (typeof v === 'string') searchTargets.push({ key: `encrypted.${k}`, value: v });
        });
      }

      if (parsed.record?.encrypted && typeof parsed.record.encrypted === 'object') {
        Object.entries(parsed.record.encrypted).forEach(([k, v]) => {
          if (typeof v === 'string') searchTargets.push({ key: `record.encrypted.${k}`, value: v });
        });
      }

      // Check root level fields if none in .encrypted
      if (searchTargets.length === 0) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string' && (k.toLowerCase().includes('key') || k.toLowerCase().includes('mnemonic') || k.toLowerCase().includes('cipher') || v.length > 40)) {
            searchTargets.push({ key: k, value: v });
          }
        });
      }

      if (searchTargets.length > 0) {
        let anySuccess = false;
        let lastError = '';

        for (const target of searchTargets) {
          try {
            const dec = await decryptSingleDvraBase64(target.value, recoveryKey);
            results[target.key] = dec;
            fieldsFound.push(target.key);
            anySuccess = true;
          } catch (err: any) {
            results[target.key] = `[Decryption Failed: ${err.message}]`;
            lastError = err.message;
          }
        }

        if (anySuccess) {
          // If only 1 field decrypted, set plaintext to it, else format json summary
          const successfulKeys = Object.keys(results).filter(k => !results[k].startsWith('[Decryption Failed'));
          const mainPlaintext = successfulKeys.length === 1 ? results[successfulKeys[0]] : JSON.stringify(results, null, 2);

          return {
            success: true,
            plaintext: mainPlaintext,
            fieldResults: results,
            details: {
              keyUsed: recoveryKey,
              fieldsFound,
            },
          };
        } else {
          return {
            success: false,
            error: `Failed to decrypt fields (${fieldsFound.join(', ')}): ${lastError}. Check if key matches.`,
            fieldResults: results,
          };
        }
      }
    } catch {
      // Not valid JSON, proceed as raw string
    }
  }

  // 2. Direct single field string decrypt
  try {
    const dec = await decryptSingleDvraBase64(trimmed, recoveryKey);
    return {
      success: true,
      plaintext: dec,
      details: {
        keyUsed: recoveryKey,
      },
    };
  } catch (err: any) {
    // Also try server-side Node crypto fallback in case of subtle crypto variation
    try {
      const res = await fetch('/api/dvra/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: trimmed, key: recoveryKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          plaintext: data.decrypted,
          details: { keyUsed: recoveryKey },
        };
      }
    } catch {}

    return {
      success: false,
      error: `Decryption failed: ${err.message}. Ensure you pasted the Base64 value of record.encrypted.privateKey or record.encrypted.mnemonic, and that key matches.`,
    };
  }
}
