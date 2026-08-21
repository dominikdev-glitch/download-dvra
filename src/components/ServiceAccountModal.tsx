import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileJson,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';
import { FirebaseCredentials } from '../types';

interface ServiceAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (serviceAccountJson: string) => Promise<{ success: boolean; error?: string }>;
  onUseSandbox: () => void;
  currentProjectId?: string;
}

export const ServiceAccountModal: React.FC<ServiceAccountModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  onUseSandbox,
  currentProjectId,
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedCreds, setParsedCreds] = useState<FirebaseCredentials | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleJsonChange = (val: string) => {
    setJsonInput(val);
    setConnectionError(null);
    if (!val.trim()) {
      setParsedCreds(null);
      setParseError(null);
      return;
    }

    try {
      const parsed = JSON.parse(val);
      if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
        setParseError('Missing required Service Account fields (project_id, private_key, client_email).');
        setParsedCreds(null);
      } else {
        setParsedCreds(parsed);
        setParseError(null);
      }
    } catch (err: any) {
      setParseError('Invalid JSON format: ' + err.message);
      setParsedCreds(null);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleJsonChange(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleConnectSubmit = async () => {
    if (!jsonInput.trim()) return;
    setIsLoading(true);
    setConnectionError(null);
    try {
      const result = await onConnect(jsonInput);
      if (result.success) {
        onClose();
      } else {
        setConnectionError(result.error || 'Failed to authenticate service account.');
      }
    } catch (err: any) {
      setConnectionError(err.message || 'Connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="service-account-modal"
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Connect Firebase Service Account
              </h2>
              <p className="text-xs text-slate-400">
                Provide your Firebase Service Account Key JSON to view and manage live Firestore databases.
              </p>
            </div>
          </div>
          <button
            id="btn-close-service-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Info Notice */}
          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-medium text-slate-200">
                How to get your Firebase Service Account Key:
              </p>
              <p className="text-slate-400 leading-relaxed">
                1. Go to Firebase Console → Project Settings → <strong>Service Accounts</strong> tab.
                <br />
                2. Click <strong>Generate new private key</strong> and download the JSON file.
                <br />
                3. Upload or paste it below. Keys are maintained in memory for your session only.
              </p>
            </div>
          </div>

          {/* Drag & Drop File Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-950/20'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-200">
              Drag & Drop your <code className="text-emerald-400 font-mono">serviceAccountKey.json</code> here
            </p>
            <p className="text-xs text-slate-400 mt-1">or click to browse files from your computer</p>
            <input
              type="file"
              id="file-upload-service-account"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <label
              htmlFor="file-upload-service-account"
              className="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer border border-slate-700 transition-colors"
            >
              <FileJson className="w-3.5 h-3.5 text-emerald-400" />
              <span>Browse JSON File</span>
            </label>
          </div>

          {/* Paste JSON Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="service-account-json-input" className="text-xs font-semibold text-slate-300">
                Or Paste Service Account JSON Directly:
              </label>
              {parsedCreds && (
                <span className="text-xs text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid Service Key Structure</span>
                </span>
              )}
            </div>
            <textarea
              id="service-account-json-input"
              rows={6}
              value={jsonInput}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder='{\n  "type": "service_account",\n  "project_id": "your-firebase-project",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...",\n  "client_email": "firebase-adminsdk-xxx@..."\n}'
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {parseError && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{parseError}</span>
              </p>
            )}
          </div>

          {/* Credential Inspector Preview */}
          {parsedCreds && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/30 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Project ID:</span>
                <span className="font-mono text-emerald-400 font-medium">{parsedCreds.project_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Client Email:</span>
                <span className="font-mono text-slate-200 truncate max-w-[320px]">{parsedCreds.client_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Private Key:</span>
                <span className="text-slate-300">
                  {parsedCreds.private_key ? '2048-bit RSA Private Key Attached' : 'Missing'}
                </span>
              </div>
            </div>
          )}

          {/* Connection Error */}
          {connectionError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Connection Failed</p>
                <p className="text-rose-400 text-xs mt-0.5">{connectionError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            id="btn-switch-to-sandbox"
            onClick={() => {
              onUseSandbox();
              onClose();
            }}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Use Demo Sandbox DB</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              id="btn-cancel-service-modal"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-submit-connect-service-account"
              onClick={handleConnectSubmit}
              disabled={!parsedCreds || isLoading}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authenticate & Load Database</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
