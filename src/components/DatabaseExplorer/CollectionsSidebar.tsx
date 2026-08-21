import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  Search,
  RefreshCw,
  Layers,
  ChevronRight,
  Database,
} from 'lucide-react';
import { FirestoreCollectionInfo } from '../../types';

interface CollectionsSidebarProps {
  collections: FirestoreCollectionInfo[];
  selectedCollectionPath: string | null;
  onSelectCollection: (path: string) => void;
  onOpenCreateCollectionModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const CollectionsSidebar: React.FC<CollectionsSidebarProps> = ({
  collections,
  selectedCollectionPath,
  onSelectCollection,
  onOpenCreateCollectionModal,
  onRefresh,
  isLoading,
}) => {
  const [search, setSearch] = useState('');

  const filteredCollections = collections.filter((c) =>
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Collections
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {collections.length}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh Collections"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="btn-open-create-collection-modal"
            onClick={onOpenCreateCollectionModal}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            title="Create New Root Collection"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Search Collections */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter collections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>

      {/* Collections Tree List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
        {filteredCollections.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {search ? 'No matching collections.' : 'No collections found.'}
          </div>
        ) : (
          filteredCollections.map((col) => {
            const isSelected = selectedCollectionPath === col.path;
            return (
              <button
                key={col.path}
                onClick={() => onSelectCollection(col.path)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Folder
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-white' : 'text-emerald-400'
                    }`}
                  />
                  <span className="font-mono truncate">{col.id}</span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {col.documentCount !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? 'bg-emerald-700/60 text-emerald-100'
                          : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      {col.documentCount}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 ${
                      isSelected ? 'text-white' : 'text-slate-600'
                    }`}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
