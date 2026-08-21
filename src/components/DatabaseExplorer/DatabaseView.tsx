import React, { useState, useEffect } from 'react';
import {
  Home,
  ChevronRight,
  Info,
  MoreVertical,
  Plus,
  SlidersHorizontal,
  FileText,
  FolderPlus,
  Edit2,
  Trash2,
  Check,
  Copy,
  ChevronDown,
  Unlock,
  Lock,
  KeyRound,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Search,
  Database,
  ArrowLeft,
} from 'lucide-react';
import {
  ConnectionStatus,
  FirestoreCollectionInfo,
  FirestoreDocument,
} from '../../types';
import {
  INITIAL_SANDBOX_COLLECTIONS,
  INITIAL_SANDBOX_DOCUMENTS,
} from '../../utils/sampleData';
import { decryptSingleDvraBase64 } from '../../utils/crypto';
import { authFetch } from '../../lib/api';

interface DatabaseViewProps {
  connectionStatus: ConnectionStatus;
  onOpenServiceAccountModal: () => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  connectionStatus,
  onOpenServiceAccountModal,
}) => {
  const [collections, setCollections] = useState<FirestoreCollectionInfo[]>(INITIAL_SANDBOX_COLLECTIONS);
  const [selectedCollectionPath, setSelectedCollectionPath] = useState<string>('walletRecovery');
  const [documents, setDocuments] = useState<FirestoreDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<FirestoreDocument | null>(null);
  const [mobileTab, setMobileTab] = useState<'collections' | 'documents' | 'fields'>('collections');

  // Expanded tree nodes (e.g. "encrypted" map)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    encrypted: true,
  });

  // Hovered field
  const [hoveredFieldPath, setHoveredFieldPath] = useState<string | null>('encrypted.mnemonic');

  // Decrypted values cache: { [fieldPath]: plaintext }
  const [decryptedFields, setDecryptedFields] = useState<Record<string, string>>({});
  const [decryptingField, setDecryptingField] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string>('dvra-wallet-recovery-v1');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // Copied state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals / Editors
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocId, setNewDocId] = useState('');
  const [isAddColOpen, setIsAddColOpen] = useState(false);
  const [newColId, setNewColId] = useState('');
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');

  // Edit Field Modal
  const [editingField, setEditingField] = useState<{ path: string; key: string; value: any; type: string } | null>(null);

  // Local sandbox data store
  const [sandboxDocs, setSandboxDocs] = useState<Record<string, FirestoreDocument[]>>(
    INITIAL_SANDBOX_DOCUMENTS
  );

  const [isLoading, setIsLoading] = useState(false);

  // Fetch Collections
  const fetchCollections = async () => {
    if (connectionStatus.mode === 'sandbox' || !connectionStatus.connected) {
      setCollections(
        Object.keys(sandboxDocs).map((colId) => ({
          id: colId,
          path: colId,
          documentCount: sandboxDocs[colId]?.length || 0,
        }))
      );
      return;
    }

    try {
      const res = await authFetch('/api/firebase/collections');
      const data = await res.json();
      if (res.ok && data.collections) {
        setCollections(data.collections);
        const exists = data.collections.some((c: any) => c.path === selectedCollectionPath);
        if (data.collections.length > 0 && (!selectedCollectionPath || !exists)) {
          setSelectedCollectionPath(data.collections[0].path);
        }
      }
    } catch {}
  };

  // Fetch Documents
  const fetchDocuments = async (colPath: string) => {
    if (connectionStatus.mode === 'sandbox' || !connectionStatus.connected) {
      const docs = sandboxDocs[colPath] || [];
      setDocuments(docs);
      if (docs.length > 0) {
        // Keep selected document if it exists in docs, otherwise default to first
        const matched = docs.find((d) => d.id === selectedDocument?.id);
        setSelectedDocument(matched || docs[0]);
      } else {
        setSelectedDocument(null);
      }
      return;
    }

    setIsLoading(true);
    try {
      const res = await authFetch('/api/firebase/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPath: colPath, limit: 50 }),
      });
      const data = await res.json();
      if (res.ok && data.documents) {
        setDocuments(data.documents);
        if (data.documents.length > 0) {
          const matched = data.documents.find((d: any) => d.id === selectedDocument?.id);
          setSelectedDocument(matched || data.documents[0]);
        } else {
          setSelectedDocument(null);
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [connectionStatus.connected, connectionStatus.mode]);

  useEffect(() => {
    if (selectedCollectionPath) {
      fetchDocuments(selectedCollectionPath);
    }
    // Auto re-encrypt: wipe decrypted cache when switching tables / collections
    setDecryptedFields({});
    setDecryptError(null);
  }, [selectedCollectionPath, connectionStatus.connected, connectionStatus.mode]);

  // Auto re-encrypt: wipe decrypted cache when switching between documents / emails
  useEffect(() => {
    setDecryptedFields({});
    setDecryptError(null);
  }, [selectedDocument?.id]);

  // Lock / Re-encrypt a field manually
  const handleLockField = (docId: string, fieldKey: string) => {
    const cacheKey = `${docId}:${fieldKey}`;
    setDecryptedFields((prev) => {
      const updated = { ...prev };
      delete updated[cacheKey];
      return updated;
    });
  };

  // Toggle map expansion
  const toggleNode = (nodePath: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodePath]: !prev[nodePath] }));
  };

  // Copy text to clipboard
  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(idKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Decrypt DVRA field inline (scoped by docId to avoid leaking across documents)
  const handleDecryptField = async (docId: string, fieldKey: string, encryptedBase64: string) => {
    const cacheKey = `${docId}:${fieldKey}`;
    setDecryptingField(cacheKey);
    setDecryptError(null);
    const keyToUse = recoveryKey.trim() || 'dvra-wallet-recovery-v1';
    try {
      const plaintext = await decryptSingleDvraBase64(encryptedBase64, keyToUse);
      setDecryptedFields((prev) => ({ ...prev, [cacheKey]: plaintext }));
    } catch (err: any) {
      // Fallback try API endpoint
      try {
        const res = await authFetch('/api/dvra/decrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: encryptedBase64, key: keyToUse }),
        });
        const d = await res.json();
        if (res.ok && d.success) {
          setDecryptedFields((prev) => ({ ...prev, [cacheKey]: d.decrypted }));
          return;
        }
      } catch {}
      setDecryptError(`Failed to decrypt ${fieldKey}: ${err.message}`);
    } finally {
      setDecryptingField(null);
    }
  };

  // Add Document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollectionPath || !newDocId.trim()) return;

    const newDoc: FirestoreDocument = {
      id: newDocId.trim(),
      path: `${selectedCollectionPath}/${newDocId.trim()}`,
      data: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };

    if (connectionStatus.mode === 'sandbox' || !connectionStatus.connected) {
      const existing = sandboxDocs[selectedCollectionPath] || [];
      const updated = [newDoc, ...existing];
      setSandboxDocs({ ...sandboxDocs, [selectedCollectionPath]: updated });
      setDocuments(updated);
      setSelectedDocument(newDoc);
    } else {
      await authFetch('/api/firebase/document/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPath: selectedCollectionPath,
          docId: newDocId.trim(),
          data: newDoc.data,
        }),
      });
      await fetchDocuments(selectedCollectionPath);
    }

    setNewDocId('');
    setIsAddDocOpen(false);
  };

  // Add Collection
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColId.trim()) return;

    const colName = newColId.trim();
    const sampleDoc: FirestoreDocument = {
      id: 'default_doc',
      path: `${colName}/default_doc`,
      data: { createdAt: new Date().toISOString() },
      createTime: new Date().toISOString(),
    };

    if (connectionStatus.mode === 'sandbox' || !connectionStatus.connected) {
      const updatedSandbox = { ...sandboxDocs, [colName]: [sampleDoc] };
      setSandboxDocs(updatedSandbox);
      setCollections(
        Object.keys(updatedSandbox).map((id) => ({
          id,
          path: id,
          documentCount: updatedSandbox[id]?.length || 0,
        }))
      );
      setSelectedCollectionPath(colName);
      setDocuments([sampleDoc]);
      setSelectedDocument(sampleDoc);
    } else {
      await authFetch('/api/firebase/collection/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: colName,
          initialDocId: 'default_doc',
          initialData: { createdAt: new Date().toISOString() },
        }),
      });
      await fetchCollections();
      setSelectedCollectionPath(colName);
    }

    setNewColId('');
    setIsAddColOpen(false);
  };

  // Add Field to current Document
  const handleAddFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument || !newFieldName.trim()) return;

    let parsedVal: any = newFieldValue;
    if (newFieldType === 'number') parsedVal = Number(newFieldValue);
    else if (newFieldType === 'boolean') parsedVal = newFieldValue === 'true';
    else if (newFieldType === 'map') {
      try {
        parsedVal = JSON.parse(newFieldValue);
      } catch {
        parsedVal = {};
      }
    }

    const updatedData = {
      ...(selectedDocument.data || {}),
      [newFieldName.trim()]: parsedVal,
    };

    if (connectionStatus.mode === 'sandbox' || !connectionStatus.connected) {
      const existing = sandboxDocs[selectedCollectionPath] || [];
      const updatedDocs = existing.map((d) =>
        d.id === selectedDocument.id ? { ...d, data: updatedData } : d
      );
      setSandboxDocs({ ...sandboxDocs, [selectedCollectionPath]: updatedDocs });
      setDocuments(updatedDocs);
      setSelectedDocument({ ...selectedDocument, data: updatedData });
    } else {
      await authFetch('/api/firebase/document/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPath: selectedCollectionPath,
          docId: selectedDocument.id,
          data: updatedData,
        }),
      });
      await fetchDocuments(selectedCollectionPath);
    }

    setNewFieldName('');
    setNewFieldValue('');
    setIsAddFieldOpen(false);
  };

  // Save edited field
  const handleSaveFieldEdit = async () => {
    if (!editingField || !selectedDocument) return;

    const { path, value, type } = editingField;
    let converted = value;
    if (type === 'number') converted = Number(value);
    else if (type === 'boolean') converted = value === 'true' || value === true;

    const keys = path.split('.');
    const updatedData = JSON.parse(JSON.stringify(selectedDocument.data || {}));

    if (keys.length === 1) {
      updatedData[keys[0]] = converted;
    } else if (keys.length === 2) {
      if (!updatedData[keys[0]]) updatedData[keys[0]] = {};
      updatedData[keys[0]][keys[1]] = converted;
    }

    if (connectionStatus.mode === 'sandbox' || !connectionStatus.connected) {
      const existing = sandboxDocs[selectedCollectionPath] || [];
      const updatedDocs = existing.map((d) =>
        d.id === selectedDocument.id ? { ...d, data: updatedData } : d
      );
      setSandboxDocs({ ...sandboxDocs, [selectedCollectionPath]: updatedDocs });
      setDocuments(updatedDocs);
      setSelectedDocument({ ...selectedDocument, data: updatedData });
    } else {
      await authFetch('/api/firebase/document/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPath: selectedCollectionPath,
          docId: selectedDocument.id,
          data: updatedData,
        }),
      });
      await fetchDocuments(selectedCollectionPath);
    }

    setEditingField(null);
  };

  // Delete field
  const handleDeleteField = async (fieldPath: string) => {
    if (!selectedDocument) return;
    const keys = fieldPath.split('.');
    const updatedData = JSON.parse(JSON.stringify(selectedDocument.data || {}));

    if (keys.length === 1) {
      delete updatedData[keys[0]];
    } else if (keys.length === 2 && updatedData[keys[0]]) {
      delete updatedData[keys[0]][keys[1]];
    }

    if (connectionStatus.mode === 'sandbox' || !connectionStatus.connected) {
      const existing = sandboxDocs[selectedCollectionPath] || [];
      const updatedDocs = existing.map((d) =>
        d.id === selectedDocument.id ? { ...d, data: updatedData } : d
      );
      setSandboxDocs({ ...sandboxDocs, [selectedCollectionPath]: updatedDocs });
      setDocuments(updatedDocs);
      setSelectedDocument({ ...selectedDocument, data: updatedData });
    } else {
      await authFetch('/api/firebase/document/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPath: selectedCollectionPath,
          docId: selectedDocument.id,
          data: updatedData,
        }),
      });
      await fetchDocuments(selectedCollectionPath);
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden flex flex-col font-sans text-[#202124]">
      {/* 1. Authentic Top Breadcrumb Header Bar */}
      <div className="border-b border-slate-200 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs bg-white select-none">
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-slate-700 overflow-x-auto max-w-full py-0.5">
          <button
            onClick={() => setMobileTab('collections')}
            className="p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-600 shrink-0"
            title="Root Database"
          >
            {/* Outline Home Icon */}
            <svg
              className="w-4 h-4 text-slate-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          <button
            onClick={() => setMobileTab('documents')}
            className="font-medium text-slate-800 hover:text-blue-600 cursor-pointer shrink-0 truncate max-w-[120px] sm:max-w-none"
          >
            {selectedCollectionPath || 'walletRecovery'}
          </button>

          {selectedDocument && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                onClick={() => setMobileTab('fields')}
                className="font-medium text-slate-800 hover:text-blue-600 truncate max-w-[110px] sm:max-w-[200px] shrink-0"
              >
                {selectedDocument.id}
              </button>
            </>
          )}
        </div>

        {/* Right side connection / switch info */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[11px] font-medium text-blue-700 cursor-pointer transition-colors"
            title="Configure Recovery Key / Password used by the Decrypt button"
          >
            <KeyRound className="w-3 h-3 text-blue-600" />
            <span className="hidden sm:inline">Key: </span>
            <span className="font-mono text-slate-800 max-w-[90px] sm:max-w-none truncate">{recoveryKey}</span>
          </button>

          <button
            onClick={onOpenServiceAccountModal}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 cursor-pointer"
            title="Configure Firestore credentials"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus.connected ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="max-w-[100px] sm:max-w-none truncate">{connectionStatus.connected ? connectionStatus.projectId : 'Interactive Sandbox'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Step Navigator (Visible on small screens) */}
      <div className="md:hidden flex items-center border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
        <button
          onClick={() => setMobileTab('collections')}
          className={`flex-1 py-2 px-2 text-center border-b-2 transition-colors ${
            mobileTab === 'collections'
              ? 'border-blue-600 text-blue-700 bg-white font-semibold'
              : 'border-transparent hover:bg-slate-100'
          }`}
        >
          1. Collections
        </button>
        <button
          onClick={() => setMobileTab('documents')}
          className={`flex-1 py-2 px-2 text-center border-b-2 transition-colors ${
            mobileTab === 'documents'
              ? 'border-blue-600 text-blue-700 bg-white font-semibold'
              : 'border-transparent hover:bg-slate-100'
          }`}
        >
          2. Documents ({documents.length})
        </button>
        <button
          onClick={() => setMobileTab('fields')}
          className={`flex-1 py-2 px-2 text-center border-b-2 transition-colors ${
            mobileTab === 'fields'
              ? 'border-blue-600 text-blue-700 bg-white font-semibold'
              : 'border-transparent hover:bg-slate-100'
          }`}
        >
          3. Fields
        </button>
      </div>

      {/* Decryption Notification / Error if any */}
      {decryptError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{decryptError}</span>
          </div>
          <button onClick={() => setDecryptError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Three Column Firestore Console Layout (Responsive) */}
      <div className="grid grid-cols-12 md:divide-x divide-slate-200 min-h-[480px] sm:min-h-[540px] text-xs">
        {/* ================= COLUMN 1: Root / Collections (3 cols) ================= */}
        <div className={`col-span-12 md:col-span-3 flex-col bg-white ${mobileTab === 'collections' ? 'flex' : 'hidden md:flex'}`}>
          {/* Header */}
          <div className="h-11 px-3 border-b border-slate-200 flex items-center justify-between text-slate-800 font-medium">
            <div className="flex items-center space-x-2">
              {/* Stacked DB layers icon */}
              <svg
                className="w-4 h-4 text-slate-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3-3.58-3-8-3-8 1.34-8 3" />
                <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
                <path d="M4 18c0 1.66 3.58 3 8 3s8-1.34 8-3" />
              </svg>
              <span>(default)</span>
              <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </div>
          </div>

          {/* Action Row */}
          <div className="border-b border-slate-100 px-3 py-2">
            <button
              id="btn-start-collection"
              onClick={() => setIsAddColOpen(true)}
              className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-700 font-medium text-xs py-1 px-1.5 rounded hover:bg-blue-50/60 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Start collection</span>
            </button>
          </div>

          {/* Collections List */}
          <div className="flex-1 overflow-y-auto py-1 divide-y md:divide-y-0 divide-slate-100">
            {collections.map((col) => {
              const isSelected = selectedCollectionPath === col.path;
              return (
                <button
                  key={col.path}
                  onClick={() => {
                    setSelectedCollectionPath(col.path);
                    setMobileTab('documents');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 text-left transition-colors font-mono cursor-pointer ${
                    isSelected
                      ? 'bg-[#f1f3f4] text-[#202124] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{col.id}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= COLUMN 2: Documents List (4 cols) ================= */}
        <div className={`col-span-12 md:col-span-4 flex-col bg-white border-t md:border-t-0 border-slate-200 ${mobileTab === 'documents' ? 'flex' : 'hidden md:flex'}`}>
          {/* Header */}
          <div className="h-11 px-3 border-b border-slate-200 flex items-center justify-between text-slate-800 font-medium">
            <div className="flex items-center space-x-2 truncate">
              {/* Document Sheet Icon */}
              <svg
                className="w-4 h-4 text-slate-600 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="truncate">{selectedCollectionPath}</span>
            </div>

            <div className="flex items-center space-x-1 text-slate-500">
              <button
                className="p-1 rounded hover:bg-slate-100"
                title="Filter documents"
              >
                {/* 3 lines filter icon */}
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded hover:bg-slate-100">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="border-b border-slate-100 px-3 py-2 flex items-center justify-between">
            <button
              id="btn-add-document"
              onClick={() => setIsAddDocOpen(true)}
              className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-700 font-medium text-xs py-1 px-1.5 rounded hover:bg-blue-50/60 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add document</span>
            </button>

            <button
              onClick={() => setMobileTab('collections')}
              className="md:hidden text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Collections</span>
            </button>
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto py-1 divide-y md:divide-y-0 divide-slate-100">
            {documents.length === 0 ? (
              <div className="p-4 text-slate-400 text-center">No documents found.</div>
            ) : (
              documents.map((doc) => {
                const isSelected = selectedDocument?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocument(doc);
                      setMobileTab('fields');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 text-left transition-colors font-mono cursor-pointer ${
                      isSelected
                        ? 'bg-[#f1f3f4] text-[#202124] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate text-xs">{doc.id}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUMN 3: Document Fields Tree Inspector (5 cols) ================= */}
        <div className={`col-span-12 md:col-span-5 flex-col bg-white border-t md:border-t-0 border-slate-200 ${mobileTab === 'fields' ? 'flex' : 'hidden md:flex'}`}>
          {selectedDocument ? (
            <>
              {/* Header */}
              <div className="h-11 px-3 border-b border-slate-200 flex items-center justify-between text-slate-800 font-medium">
                <div className="flex items-center space-x-2 truncate">
                  <button
                    onClick={() => setMobileTab('documents')}
                    className="md:hidden p-1 mr-1 text-slate-500 hover:text-slate-800"
                    title="Back to documents"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  {/* Document Sheet Icon */}
                  <svg
                    className="w-4 h-4 text-slate-600 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="truncate font-mono text-xs">{selectedDocument.id}</span>
                </div>

                <div className="flex items-center space-x-1 text-slate-500">
                  <button className="p-1 rounded hover:bg-slate-100">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="border-b border-slate-100 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <button
                    onClick={() => setIsAddColOpen(true)}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-xs py-1 px-1 rounded hover:bg-blue-50/60 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Start collection</span>
                  </button>

                  <button
                    id="btn-add-field"
                    onClick={() => setIsAddFieldOpen(true)}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-xs py-1 px-1 rounded hover:bg-blue-50/60 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add field</span>
                  </button>
                </div>

                <button
                  onClick={() => setMobileTab('documents')}
                  className="md:hidden text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Docs</span>
                </button>
              </div>

              {/* Field Tree Listing */}
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 select-text">
                {/* 1. address */}
                {selectedDocument.data?.address && (
                  <div
                    onMouseEnter={() => setHoveredFieldPath('address')}
                    onMouseLeave={() => setHoveredFieldPath(null)}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-100 group"
                  >
                    <div className="truncate">
                      <span className="text-slate-700">address: </span>
                      <span className="text-slate-900 font-medium select-all">
                        "{selectedDocument.data.address}"
                      </span>
                    </div>
                    <div className="hidden group-hover:flex items-center space-x-1 pl-2">
                      <button
                        onClick={() => handleCopy(selectedDocument.data.address, 'address')}
                        className="p-1 text-slate-500 hover:text-blue-600"
                        title="Copy value"
                      >
                        {copiedKey === 'address' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() =>
                          setEditingField({
                            path: 'address',
                            key: 'address',
                            value: selectedDocument.data.address,
                            type: 'string',
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-800"
                        title="Edit field"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteField('address')}
                        className="p-1 text-slate-500 hover:text-red-600"
                        title="Delete field"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. createdAt */}
                {selectedDocument.data?.createdAt && (
                  <div
                    onMouseEnter={() => setHoveredFieldPath('createdAt')}
                    onMouseLeave={() => setHoveredFieldPath(null)}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-100 group"
                  >
                    <div className="truncate">
                      <span className="text-slate-700">createdAt: </span>
                      <span className="text-slate-900 font-medium select-all">
                        "{selectedDocument.data.createdAt}"
                      </span>
                    </div>
                    <div className="hidden group-hover:flex items-center space-x-1 pl-2">
                      <button
                        onClick={() => handleCopy(selectedDocument.data.createdAt, 'createdAt')}
                        className="p-1 text-slate-500 hover:text-blue-600"
                      >
                        {copiedKey === 'createdAt' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() =>
                          setEditingField({
                            path: 'createdAt',
                            key: 'createdAt',
                            value: selectedDocument.data.createdAt,
                            type: 'string',
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-800"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteField('createdAt')}
                        className="p-1 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. email */}
                {selectedDocument.data?.email && (
                  <div
                    onMouseEnter={() => setHoveredFieldPath('email')}
                    onMouseLeave={() => setHoveredFieldPath(null)}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-100 group"
                  >
                    <div className="truncate">
                      <span className="text-slate-700">email: </span>
                      <span className="text-slate-900 font-medium select-all">
                        "{selectedDocument.data.email}"
                      </span>
                    </div>
                    <div className="hidden group-hover:flex items-center space-x-1 pl-2">
                      <button
                        onClick={() => handleCopy(selectedDocument.data.email, 'email')}
                        className="p-1 text-slate-500 hover:text-blue-600"
                      >
                        {copiedKey === 'email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() =>
                          setEditingField({
                            path: 'email',
                            key: 'email',
                            value: selectedDocument.data.email,
                            type: 'string',
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-800"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteField('email')}
                        className="p-1 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. emailUid */}
                {selectedDocument.data?.emailUid && (
                  <div
                    onMouseEnter={() => setHoveredFieldPath('emailUid')}
                    onMouseLeave={() => setHoveredFieldPath(null)}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-100 group"
                  >
                    <div className="truncate">
                      <span className="text-slate-700">emailUid: </span>
                      <span className="text-slate-900 font-medium select-all">
                        "{selectedDocument.data.emailUid.length > 36
                          ? selectedDocument.data.emailUid.substring(0, 36) + '...'
                          : selectedDocument.data.emailUid}"
                      </span>
                    </div>
                    <div className="hidden group-hover:flex items-center space-x-1 pl-2">
                      <button
                        onClick={() => handleCopy(selectedDocument.data.emailUid, 'emailUid')}
                        className="p-1 text-slate-500 hover:text-blue-600"
                        title="Copy full UID"
                      >
                        {copiedKey === 'emailUid' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() =>
                          setEditingField({
                            path: 'emailUid',
                            key: 'emailUid',
                            value: selectedDocument.data.emailUid,
                            type: 'string',
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-800"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteField('emailUid')}
                        className="p-1 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. encrypted (Nested Map Object) */}
                {selectedDocument.data?.encrypted && (
                  <div className="space-y-1">
                    {/* Disclosure Triangle Header */}
                    <div
                      onClick={() => toggleNode('encrypted')}
                      className="flex items-center space-x-1 py-1 px-1 rounded hover:bg-slate-100 cursor-pointer font-semibold text-slate-800 select-none"
                    >
                      {expandedNodes['encrypted'] ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>encrypted</span>
                    </div>

                    {/* Nested items under encrypted */}
                    {expandedNodes['encrypted'] && (
                      <div className="pl-6 space-y-1 border-l border-slate-200 ml-2">
                        {/* 5a. encrypted.mnemonic */}
                        {selectedDocument.data.encrypted.mnemonic && (
                          <div
                            onMouseEnter={() => setHoveredFieldPath('encrypted.mnemonic')}
                            onMouseLeave={() => setHoveredFieldPath(null)}
                            className={`flex flex-col py-1 px-2 rounded transition-colors group ${
                              hoveredFieldPath === 'encrypted.mnemonic' ? 'bg-[#f1f3f4]' : 'hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="truncate flex items-center space-x-1">
                                <span className="text-slate-700">mnemonic: </span>
                                <span className="text-slate-900 font-medium select-all">
                                  "{selectedDocument.data.encrypted.mnemonic.length > 28
                                    ? selectedDocument.data.encrypted.mnemonic.substring(0, 28) + '...'
                                    : selectedDocument.data.encrypted.mnemonic}"
                                </span>
                                <span className="text-slate-500 text-[11px] ml-1">(string)</span>
                              </div>

                              <div className="flex items-center space-x-1 pl-2">
                                {/* Decrypt / Lock Button */}
                                {decryptedFields[`${selectedDocument.id}:mnemonic`] ? (
                                  <button
                                    id="btn-lock-mnemonic"
                                    onClick={() => handleLockField(selectedDocument.id, 'mnemonic')}
                                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold transition-colors cursor-pointer border border-amber-200"
                                    title="Re-encrypt / Hide mnemonic"
                                  >
                                    <Lock className="w-3 h-3 text-amber-700" />
                                    <span>Lock</span>
                                  </button>
                                ) : (
                                  <button
                                    id="btn-decrypt-mnemonic"
                                    onClick={() =>
                                      handleDecryptField(
                                        selectedDocument.id,
                                        'mnemonic',
                                        selectedDocument.data.encrypted.mnemonic
                                      )
                                    }
                                    disabled={decryptingField === `${selectedDocument.id}:mnemonic`}
                                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                    title="Decrypt with DVRA key"
                                  >
                                    <Unlock className="w-3 h-3" />
                                    <span>{decryptingField === `${selectedDocument.id}:mnemonic` ? '...' : 'Decrypt'}</span>
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    handleCopy(selectedDocument.data.encrypted.mnemonic, 'enc.mnemonic')
                                  }
                                  className="p-1 text-slate-500 hover:text-blue-600"
                                  title="Copy Base64 payload"
                                >
                                  {copiedKey === 'enc.mnemonic' ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>

                                <button
                                  onClick={() =>
                                    setEditingField({
                                      path: 'encrypted.mnemonic',
                                      key: 'mnemonic',
                                      value: selectedDocument.data.encrypted.mnemonic,
                                      type: 'string',
                                    })
                                  }
                                  className="p-1 text-slate-500 hover:text-slate-800"
                                  title="Edit field"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteField('encrypted.mnemonic')}
                                  className="p-1 text-slate-500 hover:text-red-600"
                                  title="Delete field"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Show Decrypted Plaintext if decrypted */}
                            {decryptedFields[`${selectedDocument.id}:mnemonic`] && (
                              <div className="mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 font-mono text-[11px] select-all flex items-center justify-between">
                                <div className="break-all">
                                  <span className="font-bold">Mnemonic Phrase: </span>
                                  <span>{decryptedFields[`${selectedDocument.id}:mnemonic`]}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                                  <button
                                    onClick={() => handleCopy(decryptedFields[`${selectedDocument.id}:mnemonic`], 'dec.mnemonic')}
                                    className="text-emerald-700 hover:text-emerald-900 font-sans text-[10px] flex items-center space-x-1 bg-white/80 hover:bg-white border border-emerald-200 px-2 py-0.5 rounded transition-colors"
                                  >
                                    {copiedKey === 'dec.mnemonic' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>Copy</span>
                                  </button>
                                  <button
                                    onClick={() => handleLockField(selectedDocument.id, 'mnemonic')}
                                    className="text-amber-800 hover:text-amber-950 font-sans text-[10px] flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded transition-colors"
                                    title="Re-encrypt / Hide"
                                  >
                                    <Lock className="w-3 h-3 text-amber-700" />
                                    <span>Lock</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5b. encrypted.privateKey */}
                        {selectedDocument.data.encrypted.privateKey && (
                          <div
                            onMouseEnter={() => setHoveredFieldPath('encrypted.privateKey')}
                            onMouseLeave={() => setHoveredFieldPath(null)}
                            className={`flex flex-col py-1 px-2 rounded transition-colors group ${
                              hoveredFieldPath === 'encrypted.privateKey' ? 'bg-[#f1f3f4]' : 'hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="truncate flex items-center space-x-1">
                                <span className="text-slate-700">privateKey: </span>
                                <span className="text-slate-900 font-medium select-all">
                                  "{selectedDocument.data.encrypted.privateKey.length > 28
                                    ? selectedDocument.data.encrypted.privateKey.substring(0, 28) + '...'
                                    : selectedDocument.data.encrypted.privateKey}"
                                </span>
                              </div>

                              <div className="flex items-center space-x-1 pl-2">
                                {/* Decrypt / Lock Button */}
                                {decryptedFields[`${selectedDocument.id}:privateKey`] ? (
                                  <button
                                    id="btn-lock-privateKey"
                                    onClick={() => handleLockField(selectedDocument.id, 'privateKey')}
                                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold transition-colors cursor-pointer border border-amber-200"
                                    title="Re-encrypt / Hide private key"
                                  >
                                    <Lock className="w-3 h-3 text-amber-700" />
                                    <span>Lock</span>
                                  </button>
                                ) : (
                                  <button
                                    id="btn-decrypt-privateKey"
                                    onClick={() =>
                                      handleDecryptField(
                                        selectedDocument.id,
                                        'privateKey',
                                        selectedDocument.data.encrypted.privateKey
                                      )
                                    }
                                    disabled={decryptingField === `${selectedDocument.id}:privateKey`}
                                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                    title="Decrypt with DVRA key"
                                  >
                                    <Unlock className="w-3 h-3" />
                                    <span>{decryptingField === `${selectedDocument.id}:privateKey` ? '...' : 'Decrypt'}</span>
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    handleCopy(selectedDocument.data.encrypted.privateKey, 'enc.privateKey')
                                  }
                                  className="p-1 text-slate-500 hover:text-blue-600"
                                  title="Copy Base64 payload"
                                >
                                  {copiedKey === 'enc.privateKey' ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>

                                <button
                                  onClick={() =>
                                    setEditingField({
                                      path: 'encrypted.privateKey',
                                      key: 'privateKey',
                                      value: selectedDocument.data.encrypted.privateKey,
                                      type: 'string',
                                    })
                                  }
                                  className="p-1 text-slate-500 hover:text-slate-800"
                                  title="Edit field"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteField('encrypted.privateKey')}
                                  className="p-1 text-slate-500 hover:text-red-600"
                                  title="Delete field"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Show Decrypted Plaintext if decrypted */}
                            {decryptedFields[`${selectedDocument.id}:privateKey`] && (
                              <div className="mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 font-mono text-[11px] select-all flex items-center justify-between">
                                <div className="break-all">
                                  <span className="font-bold">Private Key: </span>
                                  <span>{decryptedFields[`${selectedDocument.id}:privateKey`]}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                                  <button
                                    onClick={() => handleCopy(decryptedFields[`${selectedDocument.id}:privateKey`], 'dec.privateKey')}
                                    className="text-emerald-700 hover:text-emerald-900 font-sans text-[10px] flex items-center space-x-1 bg-white/80 hover:bg-white border border-emerald-200 px-2 py-0.5 rounded transition-colors"
                                  >
                                    {copiedKey === 'dec.privateKey' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>Copy</span>
                                  </button>
                                  <button
                                    onClick={() => handleLockField(selectedDocument.id, 'privateKey')}
                                    className="text-amber-800 hover:text-amber-950 font-sans text-[10px] flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded transition-colors"
                                    title="Re-encrypt / Hide"
                                  >
                                    <Lock className="w-3 h-3 text-amber-700" />
                                    <span>Lock</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. ownerUid */}
                {selectedDocument.data?.ownerUid && (
                  <div
                    onMouseEnter={() => setHoveredFieldPath('ownerUid')}
                    onMouseLeave={() => setHoveredFieldPath(null)}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-100 group"
                  >
                    <div className="truncate">
                      <span className="text-slate-700">ownerUid: </span>
                      <span className="text-slate-900 font-medium select-all">
                        "{selectedDocument.data.ownerUid}"
                      </span>
                    </div>
                    <div className="hidden group-hover:flex items-center space-x-1 pl-2">
                      <button
                        onClick={() => handleCopy(selectedDocument.data.ownerUid, 'ownerUid')}
                        className="p-1 text-slate-500 hover:text-blue-600"
                      >
                        {copiedKey === 'ownerUid' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() =>
                          setEditingField({
                            path: 'ownerUid',
                            key: 'ownerUid',
                            value: selectedDocument.data.ownerUid,
                            type: 'string',
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-800"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteField('ownerUid')}
                        className="p-1 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. updatedAt */}
                {selectedDocument.data?.updatedAt && (
                  <div
                    onMouseEnter={() => setHoveredFieldPath('updatedAt')}
                    onMouseLeave={() => setHoveredFieldPath(null)}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-100 group"
                  >
                    <div className="truncate">
                      <span className="text-slate-700">updatedAt: </span>
                      <span className="text-slate-900 font-medium select-all">
                        "{selectedDocument.data.updatedAt}"
                      </span>
                    </div>
                    <div className="hidden group-hover:flex items-center space-x-1 pl-2">
                      <button
                        onClick={() => handleCopy(selectedDocument.data.updatedAt, 'updatedAt')}
                        className="p-1 text-slate-500 hover:text-blue-600"
                      >
                        {copiedKey === 'updatedAt' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() =>
                          setEditingField({
                            path: 'updatedAt',
                            key: 'updatedAt',
                            value: selectedDocument.data.updatedAt,
                            type: 'string',
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-800"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteField('updatedAt')}
                        className="p-1 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Render any other custom / dynamically added fields */}
                {Object.entries(selectedDocument.data || {}).map(([k, v]) => {
                  if (['address', 'createdAt', 'email', 'emailUid', 'encrypted', 'ownerUid', 'updatedAt'].includes(k)) {
                    return null;
                  }
                  return (
                    <div
                      key={k}
                      onMouseEnter={() => setHoveredFieldPath(k)}
                      onMouseLeave={() => setHoveredFieldPath(null)}
                      className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-100 group"
                    >
                      <div className="truncate">
                        <span className="text-slate-700">{k}: </span>
                        <span className="text-slate-900 font-medium select-all">
                          {typeof v === 'object' ? JSON.stringify(v) : `"${String(v)}"`}
                        </span>
                      </div>
                      <div className="hidden group-hover:flex items-center space-x-1 pl-2">
                        <button
                          onClick={() => handleCopy(typeof v === 'object' ? JSON.stringify(v) : String(v), k)}
                          className="p-1 text-slate-500 hover:text-blue-600"
                        >
                          {copiedKey === k ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() =>
                            setEditingField({
                              path: k,
                              key: k,
                              value: typeof v === 'object' ? JSON.stringify(v) : String(v),
                              type: typeof v,
                            })
                          }
                          className="p-1 text-slate-500 hover:text-slate-800"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteField(k)}
                          className="p-1 text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 text-center">
              <FileText className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs">No document selected</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Authentic Bottom Status Bar */}
      <div className="border-t border-slate-200 px-4 py-2 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 select-none">
        <div>Database location: nam5</div>
        <div className="text-[11px] text-slate-400">Firebase Firestore Console Mode</div>
      </div>

      {/* ================= MODALS ================= */}

      {/* Add Document Modal */}
      {isAddDocOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add document to {selectedCollectionPath}</h3>
              <button onClick={() => setIsAddDocOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document ID (e.g. user email or custom ID)
                </label>
                <input
                  type="text"
                  required
                  value={newDocId}
                  onChange={(e) => setNewDocId(e.target.value)}
                  placeholder="e.g. user@example.com or auto-generated"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDocOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Collection Modal */}
      {isAddColOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Start a collection</h3>
              <button onClick={() => setIsAddColOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection ID
                </label>
                <input
                  type="text"
                  required
                  value={newColId}
                  onChange={(e) => setNewColId(e.target.value)}
                  placeholder="e.g. walletRecovery or users"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddColOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Field Modal */}
      {isAddFieldOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add field</h3>
              <button onClick={() => setIsAddFieldOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleAddFieldSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Field name</label>
                <input
                  type="text"
                  required
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. status or notes"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="map">map (JSON)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
                <input
                  type="text"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  placeholder="Field value..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFieldOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recovery Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">DVRA Decryption Password / Key</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                The Decrypt buttons on the field view use this password/key to decrypt AES-256-GCM recovery payloads (same algorithm as the Decrypt page):
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recovery Password / Key
                </label>
                <input
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => {
                    setRecoveryKey(e.target.value);
                    setDecryptedFields({});
                  }}
                  placeholder="e.g. dvra-wallet-recovery-v1"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryKey('dvra-wallet-recovery-v1');
                    setDecryptedFields({});
                  }}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                >
                  Reset to Default
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Field Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Edit {editingField.key}</h3>
              <button onClick={() => setEditingField(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
                <textarea
                  rows={3}
                  value={editingField.value}
                  onChange={(e) =>
                    setEditingField({ ...editingField, value: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFieldEdit}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
