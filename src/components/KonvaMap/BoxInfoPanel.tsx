import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPencilAlt, FaTrash } from 'react-icons/fa';
import type { MapBoxData, BoxLink } from './MapBox';
import ConfirmDialog from './ConfirmDialog';
import LinkManager, { detectLinkType } from './LinkManager';

const presetColors = [
  '#ea2127', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#6366f1', '#f43f5e', '#14b8a6', '#64748b', '#a855f7'
];

interface BoxInfoPanelProps {
  box: MapBoxData | null;
  isOpen: boolean;
  isEditing?: boolean;
  onClose: () => void;
  onEdit?: (box: MapBoxData) => void;
  onDelete?: (box: MapBoxData) => void;
  onChange?: (boxId: string, attrs: Partial<MapBoxData>) => void;
  onCancelEdit?: () => void;
  canEdit: boolean;
}

const BoxInfoPanel: React.FC<BoxInfoPanelProps> = ({
  box,
  isOpen,
  isEditing = false,
  onClose,
  onEdit,
  onDelete,
  onChange,
  onCancelEdit,
  canEdit,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLinks, setEditLinks] = useState<BoxLink[]>([]);
  const [editColor, setEditColor] = useState('#ea2127');

  // Track which box we initialized edit state for (prevents re-init on prop updates)
  const initializedBoxIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);

  // Initialize edit fields ONLY when entering edit mode for a new box
  useEffect(() => {
    if (box && isEditing) {
      // Only initialize if this is a different box than we already initialized
      if (initializedBoxIdRef.current !== box.id) {
        initializedBoxIdRef.current = box.id;
        isDirtyRef.current = false; // Reset dirty flag on init

        setEditName(box.name);
        setEditDescription(box.description || '');
        // Use links array, or convert legacy link_url if links is empty
        if (box.links && box.links.length > 0) {
          setEditLinks(box.links);
        } else if (box.link_url) {
          setEditLinks([{ url: box.link_url, type: detectLinkType(box.link_url) }]);
        } else {
          setEditLinks([]);
        }
        setEditColor(box.color);
      }
    } else {
      // Reset when exiting edit mode
      initializedBoxIdRef.current = null;
      isDirtyRef.current = false;
    }
  }, [box, isEditing]);

  // Get current text size (default to 4 if null/auto)
  const currentTextSize = box?.text_size ?? 4;

  // Sync edits to pending changes whenever fields change (only when dirty)
  useEffect(() => {
    // Only sync if we're editing and have actual user changes
    if (!isEditing || !isDirtyRef.current || !initializedBoxIdRef.current) {
      return;
    }

    if (box && editName.trim() && initializedBoxIdRef.current === box.id) {
      onChange?.(box.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        links: editLinks,
        color: editColor,
      });
    }
  }, [editName, editDescription, editLinks, editColor, box, isEditing, onChange]);

  if (!box) return null;

  return (
    <>
      {/* Panel - starts from 15% down, goes to bottom */}
      <div
        className={`absolute top-[15%] right-0 bottom-0 w-80 max-w-[85vw] bg-[#141418] border-l border-t border-[#2a2a35] rounded-tl-2xl z-40 flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a35] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
              style={{ backgroundColor: isEditing ? editColor : box.color }}
            >
              {(isEditing ? editName : box.name).charAt(0).toUpperCase() || '?'}
            </div>
            <h2 className="text-lg font-bold text-white truncate max-w-[180px]">
              {isEditing ? 'Edit Box' : box.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {isEditing ? (
            <>
              {/* Name Input */}
              <div>
                <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { isDirtyRef.current = true; setEditName(e.target.value); }}
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
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
                      onClick={() => { isDirtyRef.current = true; setEditColor(c); }}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        editColor === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  {/* Custom color picker */}
                  <label
                    className={`relative w-8 h-8 rounded-lg cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                      !presetColors.includes(editColor) ? 'ring-2 ring-white scale-110' : ''
                    }`}
                    style={{ backgroundColor: editColor }}
                  >
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => { isDirtyRef.current = true; setEditColor(e.target.value); }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/20 to-transparent">
                      <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  onChange={(e) => { isDirtyRef.current = true; setEditDescription(e.target.value); }}
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all resize-none"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              {/* Links */}
              <LinkManager
                links={editLinks}
                onChange={(links) => { isDirtyRef.current = true; setEditLinks(links); }}
                isEditing={true}
              />

              {/* Text Size Control */}
              <div>
                <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                  Text Size
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="2"
                    max="24"
                    step="1"
                    value={currentTextSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value, 10);
                      onChange?.(box.id, { text_size: newSize });
                    }}
                    className="flex-1 h-2 bg-[#2a2a35] rounded-lg appearance-none cursor-pointer accent-[#ea2127]"
                  />
                  <span className="text-[#8b8b9a] text-sm font-mono w-8 text-right">
                    {currentTextSize}px
                  </span>
                </div>
                <button
                  onClick={() => onChange?.(box.id, { text_size: null })}
                  className="mt-2 text-xs text-[#6b6b7a] hover:text-[#ea2127] transition-colors"
                >
                  Reset to Auto
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Description */}
              {box.description && (
                <div>
                  <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <p className="text-[#b8b8c4] text-sm leading-relaxed">
                    {box.description}
                  </p>
                </div>
              )}

              {/* Links */}
              <LinkManager
                links={
                  box.links && box.links.length > 0
                    ? box.links
                    : box.link_url
                    ? [{ url: box.link_url, type: detectLinkType(box.link_url) }]
                    : []
                }
                onChange={() => {}}
                isEditing={false}
              />

              {/* Color indicator */}
              <div>
                <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg shadow-inner"
                    style={{ backgroundColor: box.color }}
                  />
                  <span className="text-[#8b8b9a] text-sm font-mono uppercase">
                    {box.color}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {canEdit && (
          <div className="p-4 border-t border-[#2a2a35] mt-auto">
            <div className="flex gap-2">
              {!isEditing && (
                <button
                  onClick={() => onEdit?.(box)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1f] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-all border border-[#2a2a35]"
                >
                  <FaPencilAlt className="w-4 h-4" />
                  <span>Edit Data</span>
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => onCancelEdit?.()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1f] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-all border border-[#2a2a35]"
                >
                  <FaTimes className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`${isEditing ? '' : ''} px-4 py-3 bg-[#ea2127]/20 hover:bg-[#ea2127]/30 text-[#ea2127] rounded-xl font-medium transition-all border border-[#ea2127]/30`}
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
            {isEditing && (
              <p className="mt-3 text-xs text-[#6b6b7a] text-center">
                Use the Save button in the toolbar to save changes
              </p>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Box"
        message={`Are you sure you want to delete "${box.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete?.(box);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default BoxInfoPanel;
