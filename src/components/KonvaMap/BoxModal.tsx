import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaTrash } from 'react-icons/fa';
import type { MapBoxData } from './MapBox';

interface BoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<MapBoxData, 'id' | 'created_by' | 'is_active'>) => void;
  onDelete?: () => void;
  editingBox?: MapBoxData | null;
  defaultPosition?: { x: number; y: number };
}

const presetColors = [
  '#ea2127', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

const BoxModal: React.FC<BoxModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingBox,
  defaultPosition,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [color, setColor] = useState('#ea2127');

  useEffect(() => {
    if (editingBox) {
      setName(editingBox.name);
      setDescription(editingBox.description || '');
      setLinkUrl(editingBox.link_url || '');
      setColor(editingBox.color);
    } else {
      setName('');
      setDescription('');
      setLinkUrl('');
      setColor('#ea2127');
    }
  }, [editingBox, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const position = editingBox
      ? { x_position: editingBox.x_position, y_position: editingBox.y_position }
      : defaultPosition
        ? { x_position: defaultPosition.x, y_position: defaultPosition.y }
        : { x_position: 0.1, y_position: 0.1 };

    const size = editingBox
      ? { width: editingBox.width, height: editingBox.height }
      : { width: 0.15, height: 0.08 };

    onSave({
      name: name.trim(),
      description: description.trim() || null,
      link_url: linkUrl.trim(),
      ...position,
      ...size,
      color,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#141418]/95 backdrop-blur-xl border border-[#2a2a35] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[fadeSlideIn_0.2s_ease-out]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ea2127]/50 to-transparent" />

        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: color }}
              >
                {name ? name.charAt(0).toUpperCase() : '?'}
              </div>
              {editingBox ? 'Edit Box' : 'New Box'}
            </h2>
            <button
              onClick={onClose}
              className="text-[#6b6b7a] hover:text-white transition-colors p-2 hover:bg-[#2a2a35] rounded-lg"
            >
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name - Required */}
            <div>
              <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                required
                placeholder="Enter box name"
                autoFocus
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-lg transition-all ${
                      color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Description - Optional */}
            <div>
              <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all resize-none"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            {/* URL - Optional */}
            <div>
              <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Link URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                placeholder="https://... (optional)"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {editingBox && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this box?')) {
                      onDelete();
                      onClose();
                    }
                  }}
                  className="px-4 py-3 bg-[#ea2127]/20 hover:bg-[#ea2127]/30 text-[#ea2127] rounded-xl font-medium transition-all border border-[#ea2127]/30"
                >
                  <FaTrash />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[#1a1a1f] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-all border border-[#2a2a35]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#ea2127] to-[#d11920] hover:from-[#ff3b42] hover:to-[#ea2127] disabled:from-[#3a3a48] disabled:to-[#3a3a48] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#ea2127]/20 disabled:shadow-none flex items-center justify-center gap-2"
              >
                <FaSave />
                <span>{editingBox ? 'Save' : 'Create'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BoxModal;
