import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Trash2,
  Plus,
  Lock,
  Unlock,
  Code2,
  Layers,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  CornerDownRight,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { FirestoreDocument, FirestoreFieldType } from '../../types';
import { FieldCryptoModal } from './FieldCryptoModal';

interface DocumentEditorProps {
  document: FirestoreDocument | null;
  onSave: (path: string, docId: string, data: Record<string, any>) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
  onNavigateSubcollection?: (parentPath: string, subcollectionId: string) => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  onSave,
  onDelete,
  onNavigateSubcollection,
}) => {
  const [data, setData] = useState<Record<string, any>>({});
  const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual');
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // New field state
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState<FirestoreFieldType>('string');
  const [newValue, setNewValue] = useState('');

  // Field crypto modal state
  const [cryptoModalConfig, setCryptoModalConfig] = useState<{
    isOpen: boolean;
    mode: 'encrypt' | 'decrypt';
    fieldName: string;
    fieldValue: any;
  }>({
    isOpen: false,
    mode: 'encrypt',
    fieldName: '',
    fieldValue: null,
  });

  useEffect(() => {
    if (document) {
      setData(document.data || {});
      setRawJson(JSON.stringify(document.data || {}, null, 2));
      setJsonError(null);
      setSaveSuccess(false);
    } else {
      setData({});
      setRawJson('{}');
    }
  }, [document]);

  if (!document) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px] text-slate-500">
        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300">No Document Selected</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select a document from the list on the left to inspect its fields, edit attributes, or perform field-level AES-256 encryption.
        </p>
      </div>
    );
  }

  // Detect if a field value looks like an AES encrypted object
  const isAesEncryptedField = (val: any): boolean => {
    if (!val || typeof val !== 'object') return false;
    return (
      (val.ciphertext && val.iv) ||
      val.cipher?.startsWith('AES-') ||
      val.format === 'json_envelope_v1'
    );
  };

  const handleUpdateFieldValue = (key: string, val: any, type: FirestoreFieldType) => {
    let converted = val;
    if (type === 'number') converted = Number(val);
    else if (type === 'boolean') converted = val === true || val === 'true';
    else if (type === 'null') converted = null;

    const updated = { ...data, [key]: converted };
    setData(updated);
    setRawJson(JSON.stringify(updated, null, 2));
  };

  const handleDeleteField = (key: string) => {
    const updated = { ...data };
    delete updated[key];
    setData(updated);
    setRawJson(JSON.stringify(updated, null, 2));
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    let initialVal: any = newValue;
    if (newType === 'number') initialVal = Number(newValue) || 0;
    else if (newType === 'boolean') initialVal = newValue === 'true';
    else if (newType === 'null') initialVal = null;
    else if (newType === 'array') initialVal = [];
    else if (newType === 'map') initialVal = {};
    else if (newType === 'timestamp') initialVal = new Date().toISOString();

    const updated = { ...data, [newKey.trim()]: initialVal };
    setData(updated);
    setRawJson(JSON.stringify(updated, null, 2));
    setNewKey('');
    setNewValue('');
  };

  const handleRawJsonChange = (val: string) => {
    setRawJson(val);
    try {
      const parsed = JSON.parse(val);
      setData(parsed);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleSaveDocument = async () => {
    if (jsonError) return;
    setIsSaving(true);
    try {
      const parts = document.path.split('/');
      const colPath = parts.slice(0, -1).join('/');
      await onSave(colPath, document.id, data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert('Save Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (confirm(`Are you sure you want to permanently delete document "${document.id}"?`)) {
      await onDelete(document.path);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(document.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full space-y-4">
      {/* Header with Path, Timestamp & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold text-slate-100">{document.id}</span>
            <button
              onClick={handleCopyPath}
              className="p-1 rounded text-slate-400 hover:text-slate-200"
              title="Copy Document Path"
            >
              {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
            <span>{document.path}</span>
            {document.updateTime && (
              <span className="text-slate-500">
                • Updated: {new Date(document.updateTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setEditorMode('visual')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                editorMode === 'visual'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fields Tree
            </button>
            <button
              onClick={() => setEditorMode('json')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                editorMode === 'json'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw JSON
            </button>
          </div>

          <button
            onClick={handleDeleteDocument}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Delete Document"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            id="btn-save-document-changes"
            onClick={handleSaveDocument}
            disabled={isSaving || !!jsonError}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {editorMode === 'visual' ? (
          <div className="space-y-3">
            {/* Fields List */}
            <div className="space-y-2">
              {Object.keys(data).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                  Document has no fields. Add a field below.
                </div>
              ) : (
                Object.entries(data).map(([key, val]) => {
                  const isEncrypted = isAesEncryptedField(val);
                  const valType: FirestoreFieldType = isEncrypted
                    ? 'encrypted_aes'
                    : typeof val === 'number'
                    ? 'number'
                    : typeof val === 'boolean'
                    ? 'boolean'
                    : val === null
                    ? 'null'
                    : Array.isArray(val)
                    ? 'array'
                    : typeof val === 'object'
                    ? 'map'
                    : 'string';

                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border transition-all ${
                        isEncrypted
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-semibold text-slate-200">
                            {key}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
                              isEncrypted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {valType}
                          </span>
                        </div>

                        {/* Field Actions: Encrypt / Decrypt & Delete */}
                        <div className="flex items-center space-x-1">
                          {isEncrypted ? (
                            <button
                              onClick={() =>
                                setCryptoModalConfig({
                                  isOpen: true,
                                  mode: 'decrypt',
                                  fieldName: key,
                                  fieldValue: val,
                                })
                              }
                              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-medium border border-emerald-500/40 transition-colors"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Decrypt Value</span>
                            </button>
                          ) : typeof val === 'string' ? (
                            <button
                              onClick={() =>
                                setCryptoModalConfig({
                                  isOpen: true,
                                  mode: 'encrypt',
                                  fieldName: key,
                                  fieldValue: val,
                                })
                              }
                              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-[11px] transition-colors"
                              title="Encrypt with AES-256"
                            >
                              <Lock className="w-3 h-3 text-emerald-400" />
                              <span>AES Encrypt</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleDeleteField(key)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Field Value Input / Display */}
                      {isEncrypted ? (
                        <div className="p-2 bg-slate-950 rounded-lg text-[11px] font-mono text-emerald-400/90 break-all space-y-1">
                          <div>
                            <span className="text-slate-500">Cipher:</span> {(val as any)?.cipher || 'AES-256'}
                          </div>
                          <div>
                            <span className="text-slate-500">Ciphertext:</span> {(val as any)?.ciphertext || (val as any)?.encrypted_payload?.ciphertext}
                          </div>
                          {(val as any)?.tag && (
                            <div>
                              <span className="text-slate-500">Tag:</span> {(val as any)?.tag}
                            </div>
                          )}
                        </div>
                      ) : valType === 'boolean' ? (
                        <select
                          value={String(val)}
                          onChange={(e) =>
                            handleUpdateFieldValue(key, e.target.value === 'true', 'boolean')
                          }
                          className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : valType === 'number' ? (
                        <input
                          type="number"
                          value={val}
                          onChange={(e) =>
                            handleUpdateFieldValue(key, e.target.value, 'number')
                          }
                          className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      ) : valType === 'map' || valType === 'array' ? (
                        <textarea
                          rows={3}
                          value={JSON.stringify(val, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleUpdateFieldValue(key, parsed, valType);
                            } catch {
                              // keep raw in state
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-emerald-500 leading-relaxed"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(val || '')}
                          onChange={(e) =>
                            handleUpdateFieldValue(key, e.target.value, 'string')
                          }
                          className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Field Form */}
            <form
              onSubmit={handleAddField}
              className="p-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl space-y-2 text-xs"
            >
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add New Field</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Field Name (Key)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="sm:col-span-4 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />

                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="sm:col-span-3 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="timestamp">timestamp</option>
                  <option value="map">map (JSON)</option>
                  <option value="array">array (JSON)</option>
                  <option value="null">null</option>
                </select>

                <input
                  type="text"
                  placeholder="Initial Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="sm:col-span-4 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={!newKey.trim()}
                  className="sm:col-span-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center font-bold"
                  title="Add Field"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="h-full flex flex-col space-y-2">
            <textarea
              rows={15}
              value={rawJson}
              onChange={(e) => handleRawJsonChange(e.target.value)}
              className="w-full h-full min-h-[300px] p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
            {jsonError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>JSON Syntax Error: {jsonError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Field Crypto Modal */}
      {cryptoModalConfig.isOpen && (
        <FieldCryptoModal
          isOpen={cryptoModalConfig.isOpen}
          onClose={() => setCryptoModalConfig({ ...cryptoModalConfig, isOpen: false })}
          mode={cryptoModalConfig.mode}
          fieldName={cryptoModalConfig.fieldName}
          fieldValue={cryptoModalConfig.fieldValue}
          onApply={(updatedVal) => {
            const updated = { ...data, [cryptoModalConfig.fieldName]: updatedVal };
            setData(updated);
            setRawJson(JSON.stringify(updated, null, 2));
          }}
        />
      )}
    </div>
  );
};
