import React, { useState } from 'react';
import { X, FilePlus2, Sparkles, CheckCircle2, AlertTriangle, Code2 } from 'lucide-react';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionPath: string;
  onCreate: (docId: string, data: Record<string, any>) => Promise<void>;
}

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  onClose,
  collectionPath,
  onCreate,
}) => {
  const [docId, setDocId] = useState('');
  const [isAutoId, setIsAutoId] = useState(true);
  const [jsonData, setJsonData] = useState(
    JSON.stringify(
      {
        name: 'New Item Record',
        created_at: new Date().toISOString(),
        is_active: true,
        status: 'pending',
      },
      null,
      2
    )
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Document root must be a JSON object.');
      }
    } catch (err: any) {
      setParseError('Invalid JSON: ' + err.message);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(isAutoId ? '' : docId.trim(), parsed);
      onClose();
    } catch (err: any) {
      setParseError(err.message || 'Failed to create document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FilePlus2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Add New Document</h3>
              <p className="text-xs text-slate-400">
                Target Collection: <code className="text-emerald-400 font-mono">{collectionPath}</code>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Document ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-slate-300">Document ID:</label>
              <button
                type="button"
                onClick={() => setIsAutoId(!isAutoId)}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                {isAutoId ? 'Custom Document ID' : 'Auto-Generate Firestore ID'}
              </button>
            </div>
            {isAutoId ? (
              <div className="px-3 py-2 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-mono flex items-center justify-between">
                <span>[Auto-generated 20-character Firestore ID]</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
            ) : (
              <input
                type="text"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                placeholder="e.g. user_89124 or custom_doc_id"
                required={!isAutoId}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-emerald-500 text-xs"
              />
            )}
          </div>

          {/* Initial JSON fields */}
          <div>
            <label className="block font-medium text-slate-300 mb-1 flex items-center space-x-1">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Initial Document Fields (JSON):</span>
            </label>
            <textarea
              rows={8}
              value={jsonData}
              onChange={(e) => {
                setJsonData(e.target.value);
                setParseError(null);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200 focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
            />
          </div>

          {parseError && (
            <div className="p-3 bg-rose-950/40 border border-rose-600/40 rounded-xl text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
