export type DatabaseMode = 'real' | 'sandbox';

export interface FirebaseCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  mode: DatabaseMode;
  projectId?: string;
  clientEmail?: string;
  error?: string;
  connectedAt?: string;
}

export type FirestoreFieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'timestamp' 
  | 'null' 
  | 'array' 
  | 'map' 
  | 'geopoint' 
  | 'reference'
  | 'encrypted_aes';

export interface FirestoreField {
  key: string;
  value: any;
  type: FirestoreFieldType;
}

export interface FirestoreDocument {
  id: string;
  path: string;
  data: Record<string, any>;
  createTime?: string;
  updateTime?: string;
  hasSubcollections?: boolean;
}

export interface FirestoreCollectionInfo {
  id: string;
  path: string;
  documentCount?: number;
}

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains';
  value: any;
  valueType: 'string' | 'number' | 'boolean';
}

export interface QueryOptions {
  collectionPath: string;
  limit?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: QueryFilter[];
  startAfterId?: string;
}

// AES-256 Types
export type AesMode = 'AES-256-GCM' | 'AES-256-CBC';
export type KeyDerivationMethod = 'PBKDF2' | 'RAW_256_HEX' | 'RAW_256_BASE64';
export type OutputFormat = 'JSON_ENVELOPE' | 'PACKED_BASE64' | 'HEX';

export interface AesEncryptionConfig {
  mode: AesMode;
  keyDerivation: KeyDerivationMethod;
  passphraseOrKey: string;
  pbkdf2Iterations: number;
  outputFormat: OutputFormat;
  customSaltHex?: string;
  customIvHex?: string;
}

export interface AesEncryptedEnvelope {
  cipher: string; // e.g. "AES-256-GCM" or "AES-256-CBC"
  ciphertext: string; // Base64 or Hex
  iv: string; // Base64 or Hex
  salt?: string; // Base64 or Hex (if PBKDF2 used)
  tag?: string; // Base64 or Hex (for GCM authentication)
  iterations?: number;
  format: 'json_envelope_v1';
  timestamp: string;
}

export interface EncryptionResult {
  formattedOutput: string;
  envelope: AesEncryptedEnvelope;
  rawStats: {
    plaintextBytes: number;
    ciphertextBytes: number;
    durationMs: number;
    keyBits: number;
    mode: AesMode;
  };
}

export interface DecryptionResult {
  success: boolean;
  plaintext: string;
  detectedFormat: string;
  mode: AesMode;
  durationMs: number;
  isJson: boolean;
  parsedJson?: any;
  authVerified: boolean;
  error?: string;
}

// Chat Admin Types
export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'visitor' | 'admin';
  senderName: string;
  senderEmail?: string;
  content: string;
  timestamp: string;
  read?: boolean;
}

export interface ChatConversation {
  sessionId: string;
  visitorName: string;
  visitorEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messageCount: number;
}
