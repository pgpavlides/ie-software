import React, { useState, useEffect } from 'react';
import { FaTimes, FaExternalLinkAlt, FaPencilAlt, FaTrash, FaSave } from 'react-icons/fa';
import type { MapBoxData } from './MapBox';
import ConfirmDialog from './ConfirmDialog';

const presetColors = [
  '#ea2127', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

interface BoxInfoPanelProps {
  box: MapBoxData | null;
  isOpen: boolean;
  isEditing?: boolean;
  onClose: () => void;
  onEdit?: (box: MapBoxData) => void;
  onDelete?: (box: MapBoxData) => void;
  onChange?: (boxId: string, attrs: Partial<MapBoxData>) => void;
  onSaveEdit?: () => void;
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
  onSaveEdit,
  canEdit,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editColor, setEditColor] = useState('#ea2127');

  // Sync edit fields when box changes or editing starts
  useEffect(() => {
    if (box && isEditing) {
      setEditName(box.name);
      setEditDescription(box.description || '');
      setEditLinkUrl(box.link_url || '');
      setEditColor(box.color);
    }
  }, [box, isEditing]);

  // Get current text size (default to 4 if null/auto)
  const currentTextSize = box?.text_size ?? 4;

  if (!box) return null;

  const handleSaveChanges = () => {
    if (!editName.trim()) return;
    onChange?.(box.id, {
      name: editName.trim(),
      description: editDescription.trim() || null,
      link_url: editLinkUrl.trim(),
      color: editColor,
    });
    onSaveEdit?.();
  };

  return (
    <>
      {/* Panel - starts from middle, goes to bottom */}
      <div
        className={`absolute top-1/2 right-0 bottom-0 w-80 max-w-[85vw] bg-[#141418] border-l border-t border-[#2a2a35] rounded-tl-2xl z-40 flex flex-col transform transition-transform duration-300 ease-out ${
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
                  onChange={(e) => setEditName(e.target.value)}
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
                      onClick={() => setEditColor(c)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        editColor === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
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
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all resize-none"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              {/* Link URL Input */}
              <div>
                <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                  Link URL
                </label>
                <input
                  type="url"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                  placeholder="https://... (optional)"
                />
              </div>

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

              {/* Link */}
              {box.link_url && (
                <div>
                  <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
                    Link
                  </label>
                  <a
                    href={box.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#ea2127] to-[#d11920] hover:from-[#ff3b42] hover:to-[#ea2127] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#ea2127]/20 group"
                  >
                    <FaExternalLinkAlt className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    <span>Open Link</span>
                  </a>
                  <p className="mt-2 text-xs text-[#5a5a68] truncate">
                    {box.link_url}
                  </p>
                </div>
              )}

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

              {/* Text Size Control */}
              {canEdit && (
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
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {canEdit && (
          <div className="p-4 border-t border-[#2a2a35] mt-auto">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-3 bg-[#ea2127]/20 hover:bg-[#ea2127]/30 text-[#ea2127] rounded-xl font-medium transition-all border border-[#ea2127]/30"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={!editName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] disabled:from-[#3a3a48] disabled:to-[#3a3a48] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#10b981]/20 disabled:shadow-none"
                >
                  <FaSave className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit?.(box)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1f] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-all border border-[#2a2a35]"
                >
                  <FaPencilAlt className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-3 bg-[#ea2127]/20 hover:bg-[#ea2127]/30 text-[#ea2127] rounded-xl font-medium transition-all border border-[#ea2127]/30"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
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
