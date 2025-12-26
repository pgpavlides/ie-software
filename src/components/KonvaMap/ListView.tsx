import React, { useState, useEffect } from 'react';
import { FaPencilAlt, FaTrash, FaSearch, FaTimes, FaLink, FaBoxes, FaExternalLinkAlt, FaSave, FaMapMarkerAlt, FaQrcode } from 'react-icons/fa';
import type { MapBoxData, BoxLink } from './MapBox';
import ConfirmDialog from './ConfirmDialog';
import LinkManager, { detectLinkType } from './LinkManager';
import QRCodeModal from './QRCodeModal';

// Link type detection and logos
type LinkType = 'trello' | 'clickup' | 'google_drive' | 'generic';

const LINK_LOGOS: Record<LinkType, string | null> = {
  trello: '/map/trelo_logo.png',
  clickup: '/map/clickup_logo.png',
  google_drive: '/map/google_drive_logo.png',
  generic: null,
};

const getLinkTypeName = (type: LinkType): string => {
  switch (type) {
    case 'trello': return 'Trello';
    case 'clickup': return 'ClickUp';
    case 'google_drive': return 'Google Drive';
    default: return 'Link';
  }
};

const presetColors = [
  '#ea2127', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#6366f1', '#f43f5e', '#14b8a6', '#64748b', '#a855f7'
];

interface ListViewProps {
  boxes: MapBoxData[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEditBox: (box: MapBoxData) => void;
  onSaveBox: (box: MapBoxData) => void;
  onDeleteBox: (box: MapBoxData) => void;
  onLocateBox: (box: MapBoxData) => void;
  canEdit: boolean;
}

const ListView: React.FC<ListViewProps> = ({
  boxes,
  searchQuery,
  onSearchChange,
  onSaveBox,
  onDeleteBox,
  onLocateBox,
  canEdit,
}) => {
  const [boxToDelete, setBoxToDelete] = useState<MapBoxData | null>(null);
  const [selectedBox, setSelectedBox] = useState<MapBoxData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#ea2127');
  const [editLinks, setEditLinks] = useState<BoxLink[]>([]);

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditing && selectedBox) {
      setEditName(selectedBox.name);
      setEditDescription(selectedBox.description || '');
      setEditColor(selectedBox.color);
      if (selectedBox.links && selectedBox.links.length > 0) {
        setEditLinks(selectedBox.links);
      } else if (selectedBox.link_url) {
        setEditLinks([{ url: selectedBox.link_url, type: detectLinkType(selectedBox.link_url) }]);
      } else {
        setEditLinks([]);
      }
    }
  }, [isEditing, selectedBox]);

  // Update selectedBox when boxes change (after save)
  useEffect(() => {
    if (selectedBox) {
      const updatedBox = boxes.find(b => b.id === selectedBox.id);
      if (updatedBox) {
        setSelectedBox(updatedBox);
      }
    }
  }, [boxes]);

  const filteredBoxes = boxes.filter((box) => {
    const query = searchQuery.toLowerCase();
    return (
      box.name.toLowerCase().includes(query) ||
      (box.description?.toLowerCase().includes(query) ?? false) ||
      box.link_url.toLowerCase().includes(query)
    );
  });

  // Get all links for a box (combine links array and legacy link_url)
  const getBoxLinks = (box: MapBoxData): BoxLink[] => {
    if (box.links && box.links.length > 0) {
      return box.links;
    }
    if (box.link_url) {
      return [{ url: box.link_url, type: detectLinkType(box.link_url) }];
    }
    return [];
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!selectedBox || !editName.trim()) return;

    const updatedBox: MapBoxData = {
      ...selectedBox,
      name: editName.trim(),
      description: editDescription.trim() || null,
      color: editColor,
      links: editLinks,
    };

    onSaveBox(updatedBox);
    setIsEditing(false);
  };

  const handleSelectBox = (box: MapBoxData) => {
    if (isEditing) {
      // If editing, cancel edit first
      setIsEditing(false);
    }
    setSelectedBox(box);
  };

  return (
    <div className="h-full flex bg-gradient-to-b from-[#0f0f12] to-[#0a0a0d]">
      {/* Left side - List (70%) */}
      <div className="w-[70%] flex flex-col border-r border-[#1f1f28]">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea2127] to-[#b91c1c] flex items-center justify-center shadow-lg shadow-[#ea2127]/20">
                <FaBoxes className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Map Boxes</h2>
                <p className="text-sm text-[#6b6b7a]">{boxes.length} total items</p>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a5a68] w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, description, or link..."
              className="w-full pl-12 pr-12 py-3.5 bg-[#141418] border border-[#2a2a35] rounded-2xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a5a68] hover:text-white transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Box list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredBoxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a1a1f] to-[#141418] flex items-center justify-center border border-[#2a2a35]">
                  <FaSearch className="w-8 h-8 text-[#3a3a48]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#ea2127] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">0</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? 'No results found' : 'No boxes yet'}
              </h3>
              <p className="text-[#6b6b7a] text-sm max-w-xs">
                {searchQuery
                  ? `No boxes match "${searchQuery}". Try a different search term.`
                  : 'Switch to map view and click "Add Box" to create your first box.'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredBoxes.map((box) => {
                const links = getBoxLinks(box);
                const isSelected = selectedBox?.id === box.id;

                return (
                  <div
                    key={box.id}
                    onClick={() => handleSelectBox(box)}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all group border-2 ${
                      isSelected
                        ? 'bg-[#1a1a1f] border-[#ea2127]'
                        : 'bg-[#141418] border-[#1f1f28] hover:border-[#2a2a35] hover:bg-[#161619]'
                    }`}
                  >
                    {/* Color accent bar */}
                    <div
                      className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                      style={{ backgroundColor: box.color }}
                    />

                    <div className="flex items-center gap-4 pl-3">
                      {/* Color indicator with initial */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0"
                        style={{
                          backgroundColor: box.color,
                          boxShadow: `0 4px 14px ${box.color}30`
                        }}
                      >
                        {box.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Box info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate">{box.name}</h3>
                        {box.description && (
                          <p className="text-xs text-[#8b8b9a] truncate">{box.description}</p>
                        )}
                      </div>

                      {/* Link count badge */}
                      {links.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1f] rounded-lg">
                          <FaLink className="w-3 h-3 text-[#6b6b7a]" />
                          <span className="text-xs text-[#6b6b7a]">{links.length}</span>
                        </div>
                      )}

                      {/* Locate on map button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onLocateBox(box); }}
                        className="p-2 text-[#6b6b7a] hover:text-[#10b981] hover:bg-[#10b981]/10 rounded-lg transition-colors"
                        title="Show on map"
                      >
                        <FaMapMarkerAlt className="w-3.5 h-3.5" />
                      </button>

                      {/* Actions - show on hover */}
                      {canEdit && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelectBox(box); setIsEditing(true); }}
                            className="p-2 text-[#6b6b7a] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-colors"
                            title="Edit box"
                          >
                            <FaPencilAlt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setBoxToDelete(box); }}
                            className="p-2 text-[#6b6b7a] hover:text-[#ea2127] hover:bg-[#ea2127]/10 rounded-lg transition-colors"
                            title="Delete box"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="p-4 border-t border-[#1f1f28] bg-[#0f0f12]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6b6b7a]">
              Showing <span className="text-white font-medium">{filteredBoxes.length}</span> of <span className="text-white font-medium">{boxes.length}</span>
            </span>
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="flex items-center gap-2 text-sm text-[#ea2127] hover:text-[#ff3b42] transition-colors"
              >
                <FaTimes className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Details/Edit (30%) */}
      <div className="w-[30%] flex flex-col bg-[#0a0a0d]">
        {selectedBox ? (
          isEditing ? (
            /* Edit Mode */
            <>
              {/* Edit Header */}
              <div className="p-6 border-b border-[#1f1f28]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0"
                    style={{
                      backgroundColor: editColor,
                      boxShadow: `0 4px 20px ${editColor}40`
                    }}
                  >
                    {editName.charAt(0).toUpperCase() || '?'}
                  </div>
                  <h2 className="text-lg font-bold text-white">Edit Box</h2>
                </div>
              </div>

              {/* Edit Form */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Name Input */}
                <div>
                  <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                    placeholder="Enter box name"
                    autoFocus
                  />
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                    Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {presetColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-7 h-7 rounded-lg transition-all ${
                          editColor === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <label
                      className={`relative w-7 h-7 rounded-lg cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                        !presetColors.includes(editColor) ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: editColor }}
                    >
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/20 to-transparent">
                        <svg className="w-3 h-3 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all resize-none"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>

                {/* Links */}
                <LinkManager
                  links={editLinks}
                  onChange={setEditLinks}
                  isEditing={true}
                />
              </div>

              {/* Edit Footer Actions */}
              <div className="p-4 border-t border-[#1f1f28]">
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#141418] hover:bg-[#1a1a1f] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-colors border border-[#2a2a35]"
                  >
                    <FaTimes className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] disabled:from-[#3a3a48] disabled:to-[#3a3a48] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#10b981]/20 disabled:shadow-none"
                  >
                    <FaSave className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* View Mode */
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-[#1f1f28]">
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0"
                    style={{
                      backgroundColor: selectedBox.color,
                      boxShadow: `0 4px 20px ${selectedBox.color}40`
                    }}
                  >
                    {selectedBox.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white mb-1 truncate">{selectedBox.name}</h2>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedBox.color }}
                      />
                      <span className="text-xs text-[#6b6b7a] uppercase font-mono">{selectedBox.color}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Description */}
                {selectedBox.description && (
                  <div>
                    <h4 className="text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-sm text-[#b8b8c4] leading-relaxed">{selectedBox.description}</p>
                  </div>
                )}

                {/* Links */}
                {(() => {
                  const links = getBoxLinks(selectedBox);
                  if (links.length === 0) return null;

                  return (
                    <div>
                      <h4 className="text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-3">
                        Links ({links.length})
                      </h4>
                      <div className="space-y-2">
                        {links.map((link, index) => {
                          const linkType = link.type || detectLinkType(link.url);
                          const logo = LINK_LOGOS[linkType];

                          return (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-[#141418] hover:bg-[#1a1a1f] border border-[#1f1f28] rounded-xl transition-colors group"
                            >
                              {logo ? (
                                <img src={logo} alt={getLinkTypeName(linkType)} className="w-6 h-6 object-contain" />
                              ) : (
                                <div className="w-6 h-6 rounded-lg bg-[#2a2a35] flex items-center justify-center">
                                  <FaLink className="w-3 h-3 text-[#6b6b7a]" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{getLinkTypeName(linkType)}</p>
                                <p className="text-xs text-[#5a5a68] truncate">{link.url}</p>
                              </div>
                              <FaExternalLinkAlt className="w-3.5 h-3.5 text-[#5a5a68] group-hover:text-white transition-colors" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Detail Footer Actions */}
              <div className="p-4 border-t border-[#1f1f28]">
                {/* QR Code Button */}
                <button
                  onClick={() => setShowQRCode(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#141418] hover:bg-[#1a1a1f] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-colors border border-[#2a2a35] mb-2"
                >
                  <FaQrcode className="w-4 h-4" />
                  Generate QR Code
                </button>

                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleStartEdit}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#141418] hover:bg-[#1a1a1f] text-white rounded-xl font-medium transition-colors border border-[#2a2a35]"
                    >
                      <FaPencilAlt className="w-4 h-4" />
                      Edit Data
                    </button>
                    <button
                      onClick={() => setBoxToDelete(selectedBox)}
                      className="px-4 py-3 bg-[#ea2127]/10 hover:bg-[#ea2127]/20 text-[#ea2127] rounded-xl transition-colors border border-[#ea2127]/20"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )
        ) : (
          /* Empty state when no box selected */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#141418] border border-[#1f1f28] flex items-center justify-center mb-4">
              <FaBoxes className="w-7 h-7 text-[#3a3a48]" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">No Box Selected</h3>
            <p className="text-sm text-[#6b6b7a] max-w-[200px]">
              Click on a box from the list to view its details here
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={boxToDelete !== null}
        title="Delete Box"
        message={boxToDelete ? `Are you sure you want to delete "${boxToDelete.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (boxToDelete) {
            onDeleteBox(boxToDelete);
            if (selectedBox?.id === boxToDelete.id) {
              setSelectedBox(null);
            }
            setBoxToDelete(null);
          }
        }}
        onCancel={() => setBoxToDelete(null)}
      />

      {/* QR Code Modal */}
      {selectedBox && (
        <QRCodeModal
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          box={selectedBox}
        />
      )}
    </div>
  );
};

export default ListView;
