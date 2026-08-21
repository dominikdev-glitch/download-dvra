import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  Lock,
  ChevronRight,
  SlidersHorizontal,
  X,
  Sparkles,
} from 'lucide-react';
import { FirestoreDocument, QueryFilter } from '../../types';

interface DocumentsListProps {
  collectionPath: string;
  documents: FirestoreDocument[];
  selectedDocId: string | null;
  onSelectDoc: (doc: FirestoreDocument) => void;
  onOpenCreateDocModal: () => void;
  onRefresh: () => void;
  onApplyQuery: (filters: QueryFilter[], orderByField?: string, orderDir?: 'asc' | 'desc', limit?: number) => void;
  isLoading: boolean;
}

export const DocumentsList: React.FC<DocumentsListProps> = ({
  collectionPath,
  documents,
  selectedDocId,
  onSelectDoc,
  onOpenCreateDocModal,
  onRefresh,
  onApplyQuery,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [filterField, setFilterField] = useState('');
  const [filterOp, setFilterOp] = useState<QueryFilter['operator']>('==');
  const [filterVal, setFilterVal] = useState('');
  const [filterType, setFilterType] = useState<'string' | 'number' | 'boolean'>('string');
  const [activeFilters, setActiveFilters] = useState<QueryFilter[]>([]);

  const [orderByField, setOrderByField] = useState('');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');
  const [limit, setLimit] = useState(50);

  // Client-side quick search filtering
  const filteredDocs = documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (doc.id.toLowerCase().includes(q)) return true;
    const stringified = JSON.stringify(doc.data || {}).toLowerCase();
    return stringified.includes(q);
  });

  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterField.trim() || filterVal === '') return;

    const newFilter: QueryFilter = {
      field: filterField.trim(),
      operator: filterOp,
      value: filterVal,
      valueType: filterType,
    };

    const updated = [...activeFilters, newFilter];
    setActiveFilters(updated);
    onApplyQuery(updated, orderByField || undefined, orderDir, limit);
    setFilterField('');
    setFilterVal('');
  };

  const handleRemoveFilter = (index: number) => {
    const updated = activeFilters.filter((_, i) => i !== index);
    setActiveFilters(updated);
    onApplyQuery(updated, orderByField || undefined, orderDir, limit);
  };

  const handleExportJson = () => {
    const exportData = documents.map((d) => ({
      id: d.id,
      path: d.path,
      data: d.data,
      createTime: d.createTime,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-${collectionPath.replace(/\//g, '_')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full space-y-3">
      {/* Top Bar: Collection Path, Actions, Search */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-100 font-mono truncate max-w-[160px]">
            {collectionPath}
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {documents.length} docs
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showFilterBar || activeFilters.length > 0
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Query & Filter Builder"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh Documents"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportJson}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Export Collection as JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-open-create-doc-modal"
            onClick={onOpenCreateDocModal}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Doc</span>
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter documents by ID or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>

      {/* Query Filter Builder Drawer */}
      {showFilterBar && (
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
          <form onSubmit={handleAddFilter} className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
            <input
              type="text"
              placeholder="Field name"
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="sm:col-span-4 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
            />
            <select
              value={filterOp}
              onChange={(e) => setFilterOp(e.target.value as any)}
              className="sm:col-span-3 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
            >
              <option value="==">==</option>
              <option value="!=">!=</option>
              <option value="<">&lt;</option>
              <option value="<=">&lt;=</option>
              <option value=">">&gt;</option>
              <option value=">=">&gt;=</option>
              <option value="array-contains">contains</option>
            </select>
            <input
              type="text"
              placeholder="Value"
              value={filterVal}
              onChange={(e) => setFilterVal(e.target.value)}
              className="sm:col-span-4 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
            />
            <button
              type="submit"
              disabled={!filterField.trim()}
              className="sm:col-span-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Active Filter Badges */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeFilters.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-emerald-300 border border-slate-700"
                >
                  <span>
                    {f.field} {f.operator} "{f.value}"
                  </span>
                  <button
                    onClick={() => handleRemoveFilter(i)}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents List View */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {searchQuery ? 'No documents matched search filter.' : 'No documents in this collection.'}
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            const keys = Object.keys(doc.data || {});
            const hasEncrypted = keys.some(
              (k) =>
                doc.data[k] &&
                (typeof doc.data[k] === 'object'
                  ? doc.data[k].ciphertext || doc.data[k].cipher?.startsWith('AES')
                  : false)
            );

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 text-slate-100 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-semibold text-emerald-400 truncate max-w-[170px]">
                    {doc.id}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {hasEncrypted && (
                      <span
                        className="p-0.5 rounded bg-emerald-500/20 text-emerald-400"
                        title="Contains AES-256 Encrypted Field"
                      >
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Snippet of fields */}
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  {keys.slice(0, 3).map((k) => `${k}: ${String(doc.data[k])}`).join(' | ')}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
