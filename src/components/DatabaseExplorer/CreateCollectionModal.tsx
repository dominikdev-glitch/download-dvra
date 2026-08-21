import React, { useState } from 'react';
import { X, FolderPlus, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (collectionName: string, initialDocId: string, initialData: any) => Promise<void>;
}

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [collectionName, setCollectionName] = useState('');
  const [initialDocId, setInitialDocId] = useState('');
  const [jsonData, setJsonData] = useState(
    JSON.stringify(
      {
        _seed: true,
        created_at: new Date().toISOString(),
        description: 'First record in collection',
      },
      null,
      2
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionName.trim()) {
      setError('Collection name is required.');
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
    } catch (err: any) {
      setError('Invalid JSON: ' + err.message);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(collectionName.trim(), initialDocId.trim(), parsed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FolderPlus className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Create New Collection</h3>
              <p className="text-xs text-slate-400">Firestore requires an initial document to initialize a collection.</p>
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
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Collection ID / Name:
            </label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g. customers, products, tokens"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Initial Document ID (Optional, leave blank for auto-ID):
            </label>
            <input
              type="text"
              value={initialDocId}
              onChange={(e) => setInitialDocId(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-600/40 rounded-xl text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
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
              <span>{isSubmitting ? 'Creating...' : 'Create Collection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
