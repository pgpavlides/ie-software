import React from 'react';
import { FaPencilAlt, FaExternalLinkAlt, FaTrash, FaSearch } from 'react-icons/fa';
import type { MapBoxData } from './MapBox';

interface ListViewProps {
  boxes: MapBoxData[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEditBox: (box: MapBoxData) => void;
  onDeleteBox: (box: MapBoxData) => void;
  canEdit: boolean;
}

const ListView: React.FC<ListViewProps> = ({
  boxes,
  searchQuery,
  onSearchChange,
  onEditBox,
  onDeleteBox,
  canEdit,
}) => {
  const filteredBoxes = boxes.filter((box) => {
    const query = searchQuery.toLowerCase();
    return (
      box.name.toLowerCase().includes(query) ||
      (box.description?.toLowerCase().includes(query) ?? false) ||
      box.link_url.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col bg-[#0f0f12]">
      {/* Search bar */}
      <div className="p-4 border-b border-[#1f1f28]">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a5a68]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search boxes..."
            className="w-full pl-12 pr-4 py-3 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
          />
        </div>
      </div>

      {/* Box list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBoxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
              <FaSearch className="w-6 h-6 text-[#3a3a48]" />
            </div>
            <p className="text-[#6b6b7a] mb-2">
              {searchQuery ? 'No boxes match your search' : 'No boxes yet'}
            </p>
            {!searchQuery && canEdit && (
              <p className="text-[#4a4a58] text-sm">
                Click "Add Box" to create one
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredBoxes.map((box) => (
              <div
                key={box.id}
                className="flex items-center justify-between p-4 bg-[#141418] border border-[#1f1f28] rounded-xl hover:border-[#2a2a35] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {/* Color indicator */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-lg"
                    style={{ backgroundColor: box.color }}
                  >
                    {box.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Box info */}
                  <div>
                    <h3 className="font-medium text-white">{box.name}</h3>
                    {box.description && (
                      <p className="text-sm text-[#8b8b9a] line-clamp-1">{box.description}</p>
                    )}
                    {box.link_url && (
                      <a
                        href={box.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#3b82f6] hover:text-[#60a5fa] mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FaExternalLinkAlt className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{box.link_url}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditBox(box)}
                      className="p-2 text-[#6b6b7a] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-colors"
                      title="Edit box"
                    >
                      <FaPencilAlt />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${box.name}"?`)) {
                          onDeleteBox(box);
                        }
                      }}
                      className="p-2 text-[#6b6b7a] hover:text-[#ea2127] hover:bg-[#ea2127]/10 rounded-lg transition-colors"
                      title="Delete box"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-4 border-t border-[#1f1f28] flex items-center justify-between">
        <span className="text-sm text-[#6b6b7a]">
          {filteredBoxes.length} of {boxes.length} boxes
        </span>
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="text-sm text-[#ea2127] hover:text-[#ff3b42] transition-colors"
          >
            Clear search
          </button>
        )}
      </div>
    </div>
  );
};

export default ListView;
