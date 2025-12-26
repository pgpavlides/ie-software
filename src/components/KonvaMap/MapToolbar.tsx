import React from 'react';
import { FaMousePointer, FaPencilAlt, FaPlus, FaList, FaMap } from 'react-icons/fa';

interface MapToolbarProps {
  canEdit: boolean;
  selectedTool: 'select' | 'edit';
  onToolChange: (tool: 'select' | 'edit') => void;
  onAddBox: () => void;
  boxCount: number;
  showListView: boolean;
  onToggleView: () => void;
}

const MapToolbar: React.FC<MapToolbarProps> = ({
  canEdit,
  selectedTool,
  onToolChange,
  onAddBox,
  boxCount,
  showListView,
  onToggleView,
}) => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#141418]/95 backdrop-blur-xl border border-[#2a2a35] rounded-2xl shadow-2xl shadow-black/50">
        {/* Tool buttons */}
        <div className="flex items-center gap-1 bg-[#0f0f12] rounded-xl p-1">
          <button
            onClick={() => onToolChange('select')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedTool === 'select'
                ? 'bg-[#3b82f6] text-white'
                : 'text-[#6b6b7a] hover:text-white hover:bg-[#1a1a1f]'
            }`}
            title="Select mode - Click boxes to open links"
          >
            <FaMousePointer className="w-4 h-4" />
            <span className="hidden sm:inline">Select</span>
          </button>

          {canEdit && (
            <button
              onClick={() => onToolChange('edit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedTool === 'edit'
                  ? 'bg-[#ea2127] text-white'
                  : 'text-[#6b6b7a] hover:text-white hover:bg-[#1a1a1f]'
              }`}
              title="Edit mode - Drag, resize, and manage boxes"
            >
              <FaPencilAlt className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#2a2a35]" />

        {/* Add button */}
        {canEdit && selectedTool === 'edit' && (
          <button
            onClick={onAddBox}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea2127] to-[#d11920] hover:from-[#ff3b42] hover:to-[#ea2127] text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-[#ea2127]/20"
            title="Add new box"
          >
            <FaPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Box</span>
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-[#2a2a35]" />

        {/* View toggle */}
        <button
          onClick={onToggleView}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            showListView
              ? 'bg-[#1a1a1f] text-white'
              : 'text-[#6b6b7a] hover:text-white hover:bg-[#1a1a1f]'
          }`}
          title={showListView ? 'Show map view' : 'Show list view'}
        >
          {showListView ? <FaMap className="w-4 h-4" /> : <FaList className="w-4 h-4" />}
          <span className="hidden sm:inline">{showListView ? 'Map' : 'List'}</span>
        </button>

        {/* Box count */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f0f12] rounded-lg">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[#8b8b9a] text-sm font-medium">{boxCount} boxes</span>
        </div>

        {/* Edit access badge */}
        {canEdit && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#ea2127]/10 border border-[#ea2127]/20 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ea2127]" />
            <span className="text-[#ea2127] text-xs font-medium">Edit Access</span>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="text-center mt-2">
        <span className="text-xs text-[#5a5a68]">
          {selectedTool === 'select'
            ? 'Click boxes to open links'
            : canEdit
              ? 'Drag to move, corners to resize, double-click to edit'
              : 'View only mode'
          }
        </span>
      </div>
    </div>
  );
};

export default MapToolbar;
