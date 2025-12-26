import React from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const accentColor = variant === 'danger' ? '#ea2127' : '#f59e0b';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <FaExclamationTriangle
                className="w-6 h-6"
                style={{ color: accentColor }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
              <p className="text-[#8b8b9a] text-sm">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors flex-shrink-0"
            >
              <FaTimes />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-[#1a1a1f] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-all border border-[#2a2a35]"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all shadow-lg"
              style={{
                background: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`,
                boxShadow: `0 4px 14px ${accentColor}40`,
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmDialog;
