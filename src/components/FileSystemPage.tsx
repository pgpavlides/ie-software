import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFolder,
  FiFile,
  FiImage,
  FiVideo,
  FiFileText,
  FiCode,
  FiBox,
  FiGrid,
  FiList,
  FiSearch,
  FiChevronRight,
  FiChevronLeft,
  FiUpload,
  FiArrowLeft,
  FiHome,
  FiLayers,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiLoader,
  FiMove,
  FiDroplet,
  FiDownload,
  FiEye,
  FiZoomIn,
  FiZoomOut,
  FiLink,
} from 'react-icons/fi';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Types matching Supabase schema
interface FileFolder {
  id: string;
  name: string;
  description: string | null;
  category: 'mindtrap' | 'agentfactory' | 'mindgolf' | 'custom';
  parent_id: string | null;
  path: string;
  depth: number;
  color: string;
  icon: string;
  sort_order: number;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FileItem {
  id: string;
  name: string;
  original_name: string;
  folder_id: string | null;
  storage_path: string;
  file_type: string;
  mime_type: string | null;
  size_bytes: number | null;
  metadata: Record<string, unknown>;
  thumbnail_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// File type config
const FILE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  folder: { icon: <FiFolder />, color: '#f59e0b', label: 'Folder' },
  image: { icon: <FiImage />, color: '#10b981', label: 'Image' },
  video: { icon: <FiVideo />, color: '#ef4444', label: 'Video' },
  document: { icon: <FiFileText />, color: '#f59e0b', label: 'Document' },
  code: { icon: <FiCode />, color: '#22c55e', label: 'Code' },
  '3d': { icon: <FiBox />, color: '#3b82f6', label: '3D Model' },
  blueprint: { icon: <FiLayers />, color: '#8b5cf6', label: 'Blueprint' },
  other: { icon: <FiFile />, color: '#6b7280', label: 'File' },
};

// Available folder icons organized by category
const FOLDER_ICON_CATEGORIES: Record<string, { label: string; icons: string[] }> = {
  files: {
    label: 'Files & Folders',
    icons: ['folder', 'folders', 'file', 'file-code', 'file-music', 'file-analytics', 'archive', 'box-multiple'],
  },
  media: {
    label: 'Media',
    icons: ['photo', 'video', 'camera', 'book', 'music', 'microphone'],
  },
  places: {
    label: 'Places & Buildings',
    icons: ['home', 'briefcase', 'building-broadcast-tower', 'building', 'door'],
  },
  time: {
    label: 'Time & Calendar',
    icons: ['calendar', 'clock', 'alarm', 'hourglass'],
  },
  awards: {
    label: 'Awards & Achievements',
    icons: ['star', 'heart', 'crown', 'trophy', 'gift', 'diamond', 'medal', 'certificate'],
  },
  security: {
    label: 'Security & Settings',
    icons: ['lock', 'key', 'shield', 'eye', 'settings', 'fingerprint'],
  },
  communication: {
    label: 'Communication',
    icons: ['mail', 'message', 'user', 'users', 'phone', 'at'],
  },
  location: {
    label: 'Location & World',
    icons: ['globe', 'map-pin', 'flag', 'compass', 'map'],
  },
  data: {
    label: 'Charts & Data',
    icons: ['chart-pie', 'cloud', 'code-circle', 'database', 'server', 'cpu'],
  },
  layout: {
    label: 'Layout & Structure',
    icons: ['stack', 'apps', 'puzzle', 'grid', 'layout'],
  },
  tools: {
    label: 'Tools & Creative',
    icons: ['bulb', 'paint', 'tag', 'bookmark', 'clipboard', 'tool', 'wand', 'palette'],
  },
  gaming: {
    label: 'Gaming & Entertainment',
    icons: ['device-gamepad', 'cards', 'dice-5', 'ghost', 'target', 'rocket'],
  },
  shapes: {
    label: 'Shapes',
    icons: ['square', 'circle', 'triangle', 'hexagon', 'octagon', 'pentagon'],
  },
  science: {
    label: 'Science & Nature',
    icons: ['flask', 'atom', 'leaf', 'sun', 'moon', 'bolt'],
  },
};

// Flat list of all icons for backward compatibility
const FOLDER_ICONS = Object.values(FOLDER_ICON_CATEGORIES).flatMap(cat => cat.icons);

// Legacy icon names mapping for backward compatibility with old database entries
const LEGACY_ICONS: Record<string, string> = {
  target: 'star',
  layers: 'stack',
  map: 'map-pin',
  box: 'box-multiple',
  users: 'user',
};

// Render icon from library or fallback to react-icons
const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
  // Handle legacy icon names from old database entries
  const normalizedName = LEGACY_ICONS[iconName] || iconName;
  const iconPath = `/icons/folder_icon_library/icons/filled/${normalizedName}.svg`;

  // For icons that exist in our library
  if (FOLDER_ICONS.includes(normalizedName)) {
    return (
      <img
        src={iconPath}
        alt={normalizedName}
        className={className}
        style={{ filter: 'brightness(0) invert(1)' }}
      />
    );
  }

  // Fallback to default folder icon
  return <FiFolder className={className} />;
};

// Helper to determine file type from mime type
const getFileType = (mimeType: string | null): string => {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return 'document';
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('text/')) return 'code';
  if (mimeType.includes('gltf') || mimeType.includes('model')) return '3d';
  return 'other';
};

// Format file size
const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Components
interface FolderTreeItemProps {
  folder: FileFolder;
  allFolders: FileFolder[];
  depth: number;
  selectedFolderId: string | null;
  onSelect: (folder: FileFolder) => void;
  expandedFolders: Set<string>;
  onToggleExpand: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, folder: FileFolder) => void;
  canEditFolder?: (folderId: string) => boolean;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  allFolders,
  depth,
  selectedFolderId,
  onSelect,
  expandedFolders,
  onToggleExpand,
  onContextMenu,
  canEditFolder,
}) => {
  const canEdit = canEditFolder ? canEditFolder(folder.id) : false;
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const children = allFolders.filter((f) => f.parent_id === folder.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <motion.button
        onClick={() => {
          onSelect(folder);
          if (hasChildren) {
            onToggleExpand(folder.id);
          }
        }}
        onContextMenu={(e) => {
          if (canEdit && onContextMenu && !folder.is_system) {
            e.preventDefault();
            onContextMenu(e, folder);
          }
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all group ${
          isSelected
            ? 'bg-gradient-to-r from-[#ea2127]/20 to-transparent text-white'
            : 'text-[#8b8b9a] hover:text-white hover:bg-[#1a1a1f]'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        {hasChildren && (
          <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#5a5a68]"
          >
            <FiChevronRight className="w-3 h-3" />
          </motion.span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span style={{ color: isSelected ? folder.color : undefined }} className="transition-colors">
          {renderIcon(folder.icon, "w-5 h-5")}
        </span>
        <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
        {isSelected && (
          <motion.div
            layoutId="folder-indicator"
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: folder.color }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {isExpanded && children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children
              .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
              .map((child) => (
                <FolderTreeItem
                  key={child.id}
                  folder={child}
                  allFolders={allFolders}
                  depth={depth + 1}
                  selectedFolderId={selectedFolderId}
                  onSelect={onSelect}
                  expandedFolders={expandedFolders}
                  onToggleExpand={onToggleExpand}
                  onContextMenu={onContextMenu}
                  canEditFolder={canEditFolder}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FileCardProps {
  item: FileFolder | FileItem;
  isFolder: boolean;
  viewMode: 'grid' | 'list';
  index: number;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  canEdit: boolean;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragTarget: boolean;
  selectionMode: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}

const FileCard: React.FC<FileCardProps> = ({
  item, isFolder, viewMode, index, onOpen, onRename, onDelete, canEdit,
  isSelected, onSelect, onDragStart, onDragOver, onDragLeave, onDrop, isDragTarget, selectionMode,
  onContextMenu
}) => {
  const [showActions, setShowActions] = useState(false);

  const folderItem = item as FileFolder;
  const folderColor = isFolder ? (folderItem.color || '#f59e0b') : '#6b7280';
  const folderIcon = isFolder ? folderItem.icon : 'file';

  const config = isFolder
    ? { icon: renderIcon(folderIcon, "text-lg"), color: folderColor, label: 'Folder' }
    : FILE_TYPE_CONFIG[getFileType((item as FileItem).mime_type)] || FILE_TYPE_CONFIG.other;

  const isSystem = isFolder && (item as FileFolder).is_system;

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        draggable={canEdit && !isSystem}
        onDragStartCapture={onDragStart}
        onDragOverCapture={isFolder ? onDragOver : undefined}
        onDragLeaveCapture={isFolder ? onDragLeave : undefined}
        onDropCapture={isFolder ? onDrop : undefined}
        onClick={onSelect}
        onDoubleClick={onOpen}
        onContextMenu={onContextMenu}
        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group cursor-pointer ${
          isDragTarget
            ? 'bg-[#ea2127]/20 border-2 border-[#ea2127] border-dashed'
            : isSelected
            ? 'bg-[#ea2127]/10 border border-[#ea2127]/50'
            : 'bg-[#141418]/50 hover:bg-[#1a1a1f] border border-[#1f1f28] hover:border-[#2a2a35]'
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ backgroundColor: `${config.color}15` }}
          >
            <span style={{ color: config.color }} className="text-lg">
              {config.icon}
            </span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-medium text-sm group-hover:text-[#ea2127] transition-colors">
              {item.name}
            </p>
            <p className="text-[#5a5a68] text-xs">{config.label}</p>
          </div>
        </div>

        {!isFolder && (
          <div className="text-right">
            <p className="text-[#6b6b7a] text-sm">{formatFileSize((item as FileItem).size_bytes)}</p>
          </div>
        )}

        {canEdit && !isSystem && showActions && !selectionMode && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onRename(); }}
              className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-[#6b6b7a] hover:text-[#ea2127] hover:bg-[#ea2127]/10 rounded-lg transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <FiChevronRight className="w-4 h-4 text-[#4a4a58] group-hover:text-[#ea2127] transition-colors" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      draggable={canEdit && !isSystem}
      onDragStartCapture={onDragStart}
      onDragOverCapture={isFolder ? onDragOver : undefined}
      onDragLeaveCapture={isFolder ? onDragLeave : undefined}
      onDropCapture={isFolder ? onDrop : undefined}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
      className={`group relative rounded-2xl p-4 transition-all text-left overflow-hidden cursor-pointer ${
        isDragTarget
          ? 'bg-[#ea2127]/20 border-2 border-[#ea2127] border-dashed'
          : isSelected
          ? 'bg-[#ea2127]/10 border-2 border-[#ea2127]/50'
          : 'bg-[#141418]/80 hover:bg-[#1a1a1f] border border-[#1f1f28] hover:border-[#2a2a35]'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Glow border on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          boxShadow: `inset 0 0 20px ${config.color}20, 0 0 30px ${config.color}10`,
        }}
      />

      {/* Actions */}
      {canEdit && !isSystem && showActions && !selectionMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onRename(); }}
            className="p-1.5 text-[#6b6b7a] hover:text-white bg-[#1a1a1f] hover:bg-[#2a2a35] rounded-lg transition-colors"
          >
            <FiEdit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-[#6b6b7a] hover:text-[#ea2127] bg-[#1a1a1f] hover:bg-[#ea2127]/10 rounded-lg transition-colors"
          >
            <FiTrash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="relative w-full text-left">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 group-hover:rotate-3"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <span style={{ color: config.color }} className="text-2xl">
            {config.icon}
          </span>
        </div>

        <h3 className="text-white font-semibold text-sm mb-1 truncate group-hover:text-[#ea2127] transition-colors">
          {item.name}
        </h3>

        <div className="flex items-center justify-between">
          <span
            className="text-xs px-2 py-0.5 rounded-md"
            style={{ backgroundColor: `${config.color}20`, color: config.color }}
          >
            {config.label}
          </span>
          {!isFolder && (item as FileItem).size_bytes && (
            <span className="text-xs text-[#5a5a68]">{formatFileSize((item as FileItem).size_bytes)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface BreadcrumbProps {
  path: FileFolder[];
  onNavigate: (folder: FileFolder | null) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
  return (
    <div className="flex items-center gap-1 text-sm font-mono flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 px-2 py-1 text-[#6b6b7a] hover:text-white hover:bg-[#1a1a1f] rounded transition-colors"
      >
        <FiHome className="w-4 h-4" />
        <span>root</span>
      </button>
      {path.map((folder, index) => (
        <React.Fragment key={folder.id}>
          <span className="text-[#3a3a48]">/</span>
          <button
            onClick={() => onNavigate(folder)}
            className={`px-2 py-1 rounded transition-colors ${
              index === path.length - 1
                ? 'text-[#ea2127] bg-[#ea2127]/10'
                : 'text-[#6b6b7a] hover:text-white hover:bg-[#1a1a1f]'
            }`}
          >
            {folder.name}
          </button>
        </React.Fragment>
      ))}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="text-[#ea2127] ml-1"
      >
        _
      </motion.span>
    </div>
  );
};

// Modal for creating/renaming folders
interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  initialName?: string;
  title: string;
}

const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, onSubmit, initialName = '', title }) => {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a35]">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name..."
            autoFocus
            className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
          />
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d11920] disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiCheck className="w-4 h-4" />}
              <span>{loading ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Delete confirmation modal
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
  isFolder: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, itemName, isFolder }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ea2127]/10 flex items-center justify-center">
          <FiTrash2 className="w-8 h-8 text-[#ea2127]" />
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-2">Delete {isFolder ? 'Folder' : 'File'}</h2>
        <p className="text-[#8b8b9a] text-center mb-6">
          Are you sure you want to delete <span className="text-white font-medium">"{itemName}"</span>?
          {isFolder && ' This will also delete all files inside.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d11920] disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiTrash2 className="w-4 h-4" />}
            <span>{loading ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Hold-to-delete confirmation modal for sidebar folders
interface HoldToDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  folderName: string;
}

const HoldToDeleteModal: React.FC<HoldToDeleteModalProps> = ({ isOpen, onClose, onConfirm, folderName }) => {
  const [loading, setLoading] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdDuration = 3000; // 3 seconds
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartRef = useRef<number | null>(null);

  const handleMouseDown = () => {
    if (loading) return;
    holdStartRef.current = Date.now();
    holdIntervalRef.current = setInterval(() => {
      if (holdStartRef.current) {
        const elapsed = Date.now() - holdStartRef.current;
        const progress = Math.min((elapsed / holdDuration) * 100, 100);
        setHoldProgress(progress);

        if (progress >= 100) {
          handleConfirm();
        }
      }
    }, 50);
  };

  const handleMouseUp = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartRef.current = null;
    if (holdProgress < 100) {
      setHoldProgress(0);
    }
  };

  const handleConfirm = async () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
      setHoldProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setHoldProgress(0);
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ea2127]/10 flex items-center justify-center">
          <FiTrash2 className="w-8 h-8 text-[#ea2127]" />
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-2">Delete Folder</h2>
        <p className="text-[#8b8b9a] text-center mb-6">
          Are you sure you want to delete <span className="text-white font-medium">"{folderName}"</span>?
          This will also delete all files inside.
        </p>

        <div className="mb-4 p-4 bg-[#1a1a1f] rounded-xl border border-[#2a2a35]">
          <p className="text-xs text-[#f59e0b] text-center mb-2">Hold the button for 3 seconds to confirm</p>
          <div className="h-1.5 bg-[#2a2a35] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#ea2127]"
              style={{ width: `${holdProgress}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-white rounded-xl transition-all flex items-center justify-center gap-2 select-none ${
              holdProgress > 0
                ? 'bg-[#ea2127] scale-95'
                : 'bg-[#ea2127] hover:bg-[#d11920]'
            } ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FiTrash2 className="w-4 h-4" />
                <span>{holdProgress > 0 ? 'Hold...' : 'Hold to Delete'}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Move Modal with folder tree picker
interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string) => Promise<void>;
  folders: FileFolder[];
  selectedCount: number;
  excludeFolderIds: Set<string>;
}

const MoveModal: React.FC<MoveModalProps> = ({ isOpen, onClose, onMove, folders, selectedCount, excludeFolderIds }) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Auto-expand root folders
  useEffect(() => {
    if (isOpen) {
      const rootIds = folders.filter(f => f.depth === 0).map(f => f.id);
      setExpandedFolders(new Set(rootIds));
      setSelectedTargetId(null);
    }
  }, [isOpen, folders]);

  const handleMove = async () => {
    if (!selectedTargetId) return;
    setLoading(true);
    try {
      await onMove(selectedTargetId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderFolderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const children = folders.filter(f => f.parent_id === parentId && !excludeFolderIds.has(f.id));
    if (children.length === 0) return null;

    return children.map(folder => {
      const hasChildren = folders.some(f => f.parent_id === folder.id && !excludeFolderIds.has(f.id));
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedTargetId === folder.id;

      return (
        <div key={folder.id}>
          <button
            onClick={() => setSelectedTargetId(folder.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
              isSelected
                ? 'bg-[#ea2127]/20 text-white border border-[#ea2127]/50'
                : 'text-[#8b8b9a] hover:text-white hover:bg-[#1a1a1f]'
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id); }}
                className="text-[#5a5a68] hover:text-white"
              >
                <FiChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <span className="w-3" />
            )}
            <FiFolder className="w-4 h-4" style={{ color: folder.color }} />
            <span className="text-sm truncate flex-1">{folder.name}</span>
            {isSelected && <FiCheck className="w-4 h-4 text-[#ea2127]" />}
          </button>
          {isExpanded && hasChildren && (
            <div>{renderFolderTree(folder.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a35]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ea2127]/10 flex items-center justify-center">
              <FiMove className="w-5 h-5 text-[#ea2127]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Move {selectedCount} item{selectedCount > 1 ? 's' : ''}</h2>
              <p className="text-xs text-[#6b6b7a]">Select destination folder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          <div className="space-y-1">
            {renderFolderTree(null, 0)}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-[#2a2a35]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedTargetId || loading}
            className="flex-1 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d11920] disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiMove className="w-4 h-4" />}
            <span>{loading ? 'Moving...' : 'Move Here'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Main Component
const FileSystemPage: React.FC = () => {
  const { user, hasRole, roles: actualRoles } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<FileFolder | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [initialFolderLoaded, setInitialFolderLoaded] = useState(false);

  // Client/Prospect specific state
  const [isClientUser, setIsClientUser] = useState(false);
  const [isProspectUser, setIsProspectUser] = useState(false);
  const [clientRootFolder, setClientRootFolder] = useState<FileFolder | null>(null);
  const [prospectRootFolder, setProspectRootFolder] = useState<FileFolder | null>(null);

  // Database edit permission
  const [hasDbEditPermission, setHasDbEditPermission] = useState<boolean>(false);
  // Folder-level edit permissions (from user_folder_permissions table)
  const [folderEditPermissions, setFolderEditPermissions] = useState<Set<string>>(new Set());

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<{ item: FileFolder | FileItem; isFolder: boolean } | null>(null);

  // File upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Drag & drop state
  const [draggedItems, setDraggedItems] = useState<{ ids: string[]; isFolder: boolean[] } | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileFolder | FileItem; isFolder: boolean } | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // Sidebar folder context menu state
  const [sidebarContextMenu, setSidebarContextMenu] = useState<{ x: number; y: number; folder: FileFolder } | null>(null);
  const [holdDeleteModalOpen, setHoldDeleteModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FileFolder | null>(null);

  // Media preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; file: FileItem } | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string; file: FileItem } | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{ url: string; name: string; file: FileItem } | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);

  // Get previewable files of each type for navigation
  const previewableFiles = useMemo(() => {
    const images = files.filter(f => getFileType(f.mime_type) === 'image');
    const videos = files.filter(f => getFileType(f.mime_type) === 'video');
    const pdfs = files.filter(f => f.mime_type?.includes('pdf'));
    return { images, videos, pdfs };
  }, [files]);

  // Check if user is a Client or Prospect
  const checkUserType = useCallback(async () => {
    if (!user) return;

    // Check if user is a Client
    const { data: isClient } = await supabase.rpc('is_client_user');
    setIsClientUser(isClient || false);

    // Check if user is a Prospect
    const { data: isProspect } = await supabase.rpc('is_prospect_user');
    setIsProspectUser(isProspect || false);

    // If client, get their root folder
    if (isClient) {
      const { data: clientFolderIds } = await supabase.rpc('get_client_folder_ids');
      if (clientFolderIds && clientFolderIds.length > 0) {
        // Get the root client folder (depth 1, under /Clients)
        const { data: rootFolder } = await supabase
          .from('file_folders')
          .select('*')
          .in('id', clientFolderIds.map((f: { folder_id: string }) => f.folder_id))
          .eq('depth', 1)
          .single();

        if (rootFolder) {
          setClientRootFolder(rootFolder);
        }
      }
    }

    // If prospect, get their root folder (same pattern as client)
    if (isProspect) {
      const { data: prospectFolderIds } = await supabase.rpc('get_prospect_folder_ids');
      if (prospectFolderIds && prospectFolderIds.length > 0) {
        // Get the root prospect folder (depth 1, under /Prospects)
        const { data: rootFolder } = await supabase
          .from('file_folders')
          .select('*')
          .in('id', prospectFolderIds.map((f: { folder_id: string }) => f.folder_id))
          .eq('depth', 1)
          .single();

        if (rootFolder) {
          setProspectRootFolder(rootFolder);
        }
      }
    }
  }, [user]);

  // Fetch folders using the permission-aware function
  const fetchFolders = useCallback(async () => {
    // Use RPC function that respects folder permissions and includes parent folders for tree navigation
    const { data, error } = await supabase.rpc('get_accessible_folders_with_parents');

    if (error) {
      console.error('Error fetching folders:', error);
      // Fallback to empty if function doesn't exist yet
      setFolders([]);
    } else {
      // Sort the results since RPC doesn't guarantee order
      const sorted = (data || []).sort((a: FileFolder, b: FileFolder) => {
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return a.name.localeCompare(b.name);
      });
      setFolders(sorted);
    }
  }, []);

  // Fetch files for current folder
  const fetchFiles = useCallback(async (folderId: string | null) => {
    if (!folderId) {
      setFiles([]);
      return;
    }

    const { data, error } = await supabase
      .from('file_items')
      .select('*')
      .eq('folder_id', folderId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching files:', error);
    } else {
      setFiles(data || []);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await checkUserType();
      await fetchFolders();
      setLoading(false);
    };
    load();
  }, [fetchFolders, checkUserType]);

  // Navigate to folder from URL parameter after folders are loaded
  // For clients: auto-select their folder
  useEffect(() => {
    if (loading || initialFolderLoaded || folders.length === 0) return;

    const folderId = searchParams.get('folder');

    // If client user, auto-navigate to their folder
    if (isClientUser && clientRootFolder && !folderId) {
      setSelectedFolder(clientRootFolder);
      fetchFiles(clientRootFolder.id);
      setExpandedFolders(new Set([clientRootFolder.id]));
      setInitialFolderLoaded(true);
      return;
    }

    // If prospect user, auto-navigate to their folder (same as client)
    if (isProspectUser && prospectRootFolder && !folderId) {
      setSelectedFolder(prospectRootFolder);
      fetchFiles(prospectRootFolder.id);
      setExpandedFolders(new Set([prospectRootFolder.id]));
      setInitialFolderLoaded(true);
      return;
    }

    if (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        // Navigate to the folder
        setSelectedFolder(folder);
        fetchFiles(folder.id);

        // Expand all parent folders in the tree
        const parentIds = new Set<string>();
        let currentFolder: FileFolder | undefined = folder;
        while (currentFolder?.parent_id) {
          parentIds.add(currentFolder.parent_id);
          currentFolder = folders.find(f => f.id === currentFolder?.parent_id);
        }
        setExpandedFolders(prev => new Set([...prev, ...parentIds]));
      }
    }
    setInitialFolderLoaded(true);
  }, [loading, folders, searchParams, initialFolderLoaded, fetchFiles, isClientUser, clientRootFolder, isProspectUser, prospectRootFolder]);

  // Update URL when folder changes
  const navigateToFolder = useCallback((folder: FileFolder | null) => {
    setSelectedFolder(folder);
    if (folder) {
      setSearchParams({ folder: folder.id });
      fetchFiles(folder.id);
    } else {
      setSearchParams({});
      setFiles([]);
    }
  }, [setSearchParams, fetchFiles]);

  // Copy current folder link to clipboard
  const copyFolderLink = useCallback(() => {
    if (!selectedFolder) return;

    const url = `${window.location.origin}/files?folder=${selectedFolder.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [selectedFolder]);

  // Check database edit permission for files section
  useEffect(() => {
    const checkEditPermission = async () => {
      // Super Admin always has edit access
      if (hasRole('Super Admin')) {
        setHasDbEditPermission(true);
        return;
      }

      if (!user) {
        setHasDbEditPermission(false);
        return;
      }

      try {
        // Get user's role IDs
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        if (!userRoles || userRoles.length === 0) {
          setHasDbEditPermission(false);
          return;
        }

        const roleIds = userRoles.map((ur: { role_id: string }) => ur.role_id);

        // Check if any of the user's roles have edit permission for files
        const { data: permissions, error: permError } = await supabase
          .from('role_section_permissions')
          .select('can_edit')
          .eq('section_key', 'files')
          .in('role_id', roleIds)
          .eq('can_edit', true);

        if (permError) throw permError;

        setHasDbEditPermission(permissions && permissions.length > 0);
      } catch (error) {
        console.error('Error checking edit permission:', error);
        setHasDbEditPermission(false);
      }
    };

    checkEditPermission();
  }, [user, hasRole, actualRoles]);

  // Fetch folder-level edit permissions
  useEffect(() => {
    const fetchFolderEditPermissions = async () => {
      if (!user) {
        setFolderEditPermissions(new Set());
        return;
      }

      // Super Admin has all permissions
      if (hasRole('Super Admin')) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_folder_permissions')
          .select('folder_id')
          .eq('user_id', user.id)
          .eq('can_edit', true);

        if (error) throw error;

        const editableFolderIds = new Set((data || []).map((p: { folder_id: string }) => p.folder_id));
        setFolderEditPermissions(editableFolderIds);
      } catch (error) {
        console.error('Error fetching folder edit permissions:', error);
        setFolderEditPermissions(new Set());
      }
    };

    fetchFolderEditPermissions();
  }, [user, hasRole]);

  // Fetch files when folder changes
  useEffect(() => {
    fetchFiles(selectedFolder?.id || null);
  }, [selectedFolder, fetchFiles]);

  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!selectedFolder) return [];
    const path: FileFolder[] = [];
    let current: FileFolder | undefined = selectedFolder;
    while (current) {
      path.unshift(current);
      current = folders.find((f) => f.id === current?.parent_id);
    }
    return path;
  }, [selectedFolder, folders]);

  // Get child folders and files for current view
  const currentItems = useMemo(() => {
    const childFolders = folders.filter((f) => f.parent_id === (selectedFolder?.id || null) && f.depth === (selectedFolder?.depth ?? -1) + 1);
    return { folders: childFolders, files };
  }, [folders, files, selectedFolder]);

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return currentItems;
    const query = searchQuery.toLowerCase();
    return {
      folders: currentItems.folders.filter((f) => f.name.toLowerCase().includes(query)),
      files: currentItems.files.filter((f) => f.name.toLowerCase().includes(query)),
    };
  }, [currentItems, searchQuery]);

  // Root folders for sidebar
  // For clients: show their personal folder as root
  // For prospects: show their personal folder as root (same as clients)
  // For regular users: show depth 0 folders (but hide "Clients" folder)
  const rootFolders = useMemo(() => {
    if (isClientUser) {
      // Client users only see their own folder (or nothing if not created yet)
      return clientRootFolder ? [clientRootFolder] : [];
    }
    if (isProspectUser) {
      // Prospect users only see their own folder (or nothing if not created yet)
      return prospectRootFolder ? [prospectRootFolder] : [];
    }
    // Regular users see all root folders except "Clients" (it's hidden from non-admins)
    // The RLS will handle what's visible
    return folders.filter((f) => f.depth === 0);
  }, [folders, isClientUser, clientRootFolder, isProspectUser, prospectRootFolder]);

  // Handlers
  const handleSelectFolder = (folder: FileFolder) => {
    navigateToFolder(folder);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBreadcrumbNavigate = (folder: FileFolder | null) => {
    navigateToFolder(folder);
  };

  const handleOpenFolder = (folder: FileFolder) => {
    navigateToFolder(folder);
    setExpandedFolders((prev) => new Set([...prev, folder.id]));
  };

  const handleCreateFolder = async (name: string) => {
    if (!selectedFolder) return;

    const newPath = `${selectedFolder.path}/${name.toLowerCase().replace(/\s+/g, '-')}`;

    const { error } = await supabase.from('file_folders').insert({
      name,
      category: selectedFolder.category,
      parent_id: selectedFolder.id,
      path: newPath,
      depth: selectedFolder.depth + 1,
      color: selectedFolder.color,
      icon: 'folder',
      created_by: user?.id,
    });

    if (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    } else {
      await fetchFolders();
    }
  };

  const handleRenameItem = async (name: string) => {
    if (!itemToEdit) return;

    const table = itemToEdit.isFolder ? 'file_folders' : 'file_items';
    const { error } = await supabase
      .from(table)
      .update({ name })
      .eq('id', itemToEdit.item.id);

    if (error) {
      console.error('Error renaming:', error);
      alert('Failed to rename');
    } else {
      if (itemToEdit.isFolder) {
        await fetchFolders();
      } else {
        await fetchFiles(selectedFolder?.id || null);
      }
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToEdit) return;

    if (itemToEdit.isFolder) {
      // Delete folder and all contents
      const { error } = await supabase
        .from('file_folders')
        .delete()
        .eq('id', itemToEdit.item.id);

      if (error) {
        console.error('Error deleting folder:', error);
        alert('Failed to delete folder');
      } else {
        await fetchFolders();
      }
    } else {
      // Delete file from storage and database
      const fileItem = itemToEdit.item as FileItem;
      await supabase.storage.from('project-files').remove([fileItem.storage_path]);

      const { error } = await supabase
        .from('file_items')
        .delete()
        .eq('id', fileItem.id);

      if (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file');
      } else {
        await fetchFiles(selectedFolder?.id || null);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || !selectedFolder) return;

    setUploading(true);

    for (const file of Array.from(uploadedFiles)) {
      const fileName = `${Date.now()}-${file.name}`;
      const storagePath = `${selectedFolder.path}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        continue;
      }

      // Create database record
      const { error: dbError } = await supabase.from('file_items').insert({
        name: file.name,
        original_name: file.name,
        folder_id: selectedFolder.id,
        storage_path: storagePath,
        file_type: getFileType(file.type),
        mime_type: file.type,
        size_bytes: file.size,
        created_by: user?.id,
      });

      if (dbError) {
        console.error('Error creating file record:', dbError);
      }
    }

    setUploading(false);
    await fetchFiles(selectedFolder.id);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clear selection when folder changes
  useEffect(() => {
    setSelectedItems(new Set());
    setSelectionMode(false);
    setLastSelectedIndex(null);
  }, [selectedFolder?.id]);

  // Get all items in order (folders first, then files)
  const allItemsInOrder = useMemo(() => {
    const items: { id: string; isFolder: boolean }[] = [
      ...filteredItems.folders.map(f => ({ id: f.id, isFolder: true })),
      ...filteredItems.files.map(f => ({ id: f.id, isFolder: false })),
    ];
    return items;
  }, [filteredItems]);

  // Handle item selection with shift/ctrl support
  const handleItemSelect = useCallback((itemId: string, _isFolder: boolean, index: number, e: React.MouseEvent) => {
    e.stopPropagation();

    setSelectedItems(prev => {
      const next = new Set(prev);

      if (e.shiftKey && lastSelectedIndex !== null) {
        // Range select
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          next.add(allItemsInOrder[i].id);
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle select
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
      } else {
        // Single select
        if (next.has(itemId) && next.size === 1) {
          next.clear();
        } else {
          next.clear();
          next.add(itemId);
        }
      }

      setSelectionMode(next.size > 0);
      return next;
    });

    setLastSelectedIndex(index);
  }, [lastSelectedIndex, allItemsInOrder]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setSelectionMode(false);
    setLastSelectedIndex(null);
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    const allIds = new Set(allItemsInOrder.map(item => item.id));
    setSelectedItems(allIds);
    setSelectionMode(true);
  }, [allItemsInOrder]);

  // Drag handlers
  const handleDragStart = useCallback((itemId: string, isFolder: boolean, e: React.DragEvent) => {
    // If dragging a selected item, drag all selected items
    // Otherwise, just drag this item
    if (selectedItems.has(itemId)) {
      const draggedIds = Array.from(selectedItems);
      const isFolderArray = draggedIds.map(id => {
        return filteredItems.folders.some(f => f.id === id);
      });
      setDraggedItems({ ids: draggedIds, isFolder: isFolderArray });
      e.dataTransfer.setData('text/plain', draggedIds.join(','));
    } else {
      setDraggedItems({ ids: [itemId], isFolder: [isFolder] });
      e.dataTransfer.setData('text/plain', itemId);
    }
    e.dataTransfer.effectAllowed = 'move';
  }, [selectedItems, filteredItems.folders]);

  const handleDragOver = useCallback((folderId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Don't allow dropping on self or selected items
    if (draggedItems?.ids.includes(folderId)) {
      setDragTargetId(null);
      return;
    }
    setDragTargetId(folderId);
  }, [draggedItems]);

  const handleDragLeave = useCallback(() => {
    setDragTargetId(null);
  }, []);

  const handleDrop = useCallback(async (targetFolderId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragTargetId(null);

    if (!draggedItems || draggedItems.ids.length === 0) return;
    if (draggedItems.ids.includes(targetFolderId)) return;

    await moveItemsToFolder(targetFolderId, draggedItems.ids, draggedItems.isFolder);
    setDraggedItems(null);
    clearSelection();
  }, [draggedItems]);

  // Move items to a folder
  const moveItemsToFolder = async (targetFolderId: string, itemIds: string[], isFolderArray: boolean[]) => {
    const targetFolder = folders.find(f => f.id === targetFolderId);
    if (!targetFolder) return;

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const isFolder = isFolderArray[i];

      if (isFolder) {
        // Get folder to move
        const folderToMove = folders.find(f => f.id === itemId);
        if (!folderToMove) continue;

        // Calculate new path
        const folderSlug = folderToMove.name.toLowerCase().replace(/\s+/g, '-');
        const newPath = `${targetFolder.path}/${folderSlug}`;
        const newDepth = targetFolder.depth + 1;

        // Update folder
        await supabase
          .from('file_folders')
          .update({
            parent_id: targetFolderId,
            path: newPath,
            depth: newDepth,
            category: targetFolder.category,
          })
          .eq('id', itemId);

        // Update all child folders paths recursively
        const childFolders = folders.filter(f => f.path.startsWith(folderToMove.path + '/'));
        for (const child of childFolders) {
          const childNewPath = child.path.replace(folderToMove.path, newPath);
          const childNewDepth = child.depth - folderToMove.depth + newDepth;
          await supabase
            .from('file_folders')
            .update({
              path: childNewPath,
              depth: childNewDepth,
              category: targetFolder.category,
            })
            .eq('id', child.id);
        }
      } else {
        // Move file
        await supabase
          .from('file_items')
          .update({ folder_id: targetFolderId })
          .eq('id', itemId);
      }
    }

    await fetchFolders();
    await fetchFiles(selectedFolder?.id || null);
  };

  // Handle move from modal
  const handleMoveSelected = async (targetFolderId: string) => {
    const itemIds = Array.from(selectedItems);
    const isFolderArray = itemIds.map(id => filteredItems.folders.some(f => f.id === id));
    await moveItemsToFolder(targetFolderId, itemIds, isFolderArray);
    clearSelection();
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const itemIds = Array.from(selectedItems);

    for (const itemId of itemIds) {
      const isFolder = filteredItems.folders.some(f => f.id === itemId);

      if (isFolder) {
        await supabase.from('file_folders').delete().eq('id', itemId);
      } else {
        const file = filteredItems.files.find(f => f.id === itemId);
        if (file) {
          await supabase.storage.from('project-files').remove([file.storage_path]);
          await supabase.from('file_items').delete().eq('id', itemId);
        }
      }
    }

    await fetchFolders();
    await fetchFiles(selectedFolder?.id || null);
    clearSelection();
  };

  // Get excluded folder IDs for move modal (can't move into self or children)
  const excludedFolderIds = useMemo(() => {
    const excluded = new Set<string>();

    for (const itemId of selectedItems) {
      const folder = folders.find(f => f.id === itemId);
      if (folder) {
        excluded.add(folder.id);
        // Also exclude all children
        folders.forEach(f => {
          if (f.path.startsWith(folder.path + '/')) {
            excluded.add(f.id);
          }
        });
      }
    }

    return excluded;
  }, [selectedItems, folders]);

  // Context menu handlers
  const handleContextMenu = useCallback((item: FileFolder | FileItem, isFolder: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item, isFolder });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Sidebar folder context menu handlers
  const handleSidebarContextMenu = useCallback((e: React.MouseEvent, folder: FileFolder) => {
    e.preventDefault();
    setSidebarContextMenu({ x: e.clientX, y: e.clientY, folder });
  }, []);

  const closeSidebarContextMenu = useCallback(() => {
    setSidebarContextMenu(null);
  }, []);

  const handleDeleteSidebarFolder = async () => {
    if (!folderToDelete) return;

    const { error } = await supabase
      .from('file_folders')
      .delete()
      .eq('id', folderToDelete.id);

    if (error) {
      console.error('Error deleting folder:', error);
      alert('Failed to delete folder');
    } else {
      await fetchFolders();
      // If the deleted folder was selected, deselect it
      if (selectedFolder?.id === folderToDelete.id) {
        setSelectedFolder(null);
        setFiles([]);
      }
    }
    setFolderToDelete(null);
  };

  // Close sidebar context menu on click outside
  useEffect(() => {
    const handleClick = () => closeSidebarContextMenu();
    if (sidebarContextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [sidebarContextMenu, closeSidebarContextMenu]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  // Change folder icon
  const handleChangeIcon = async (icon: string) => {
    if (!contextMenu || !contextMenu.isFolder) return;

    const { error } = await supabase
      .from('file_folders')
      .update({ icon })
      .eq('id', contextMenu.item.id);

    if (error) {
      console.error('Error changing icon:', error);
    } else {
      await fetchFolders();
    }
    setIconPickerOpen(false);
    setContextMenu(null);
  };

  // Change folder color
  const handleChangeColor = async (color: string) => {
    if (!contextMenu || !contextMenu.isFolder) return;

    const { error } = await supabase
      .from('file_folders')
      .update({ color })
      .eq('id', contextMenu.item.id);

    if (error) {
      console.error('Error changing color:', error);
    } else {
      await fetchFolders();
    }
    setColorPickerOpen(false);
    setContextMenu(null);
  };

  // Download a single file
  const handleDownloadFile = async (file: FileItem) => {
    try {
      setDownloading(true);
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name || file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Download multiple selected files
  const handleDownloadSelected = async () => {
    const selectedFiles = files.filter(f => selectedItems.has(f.id));
    if (selectedFiles.length === 0) return;

    setDownloading(true);
    try {
      for (const file of selectedFiles) {
        await handleDownloadFile(file);
        // Small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } finally {
      setDownloading(false);
      setSelectedItems(new Set());
    }
  };

  // Preview an image file
  const handlePreviewImage = async (file: FileItem) => {
    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        setPreviewImage({ url: data.signedUrl, name: file.original_name || file.name, file });
        setPreviewZoom(1);
      }
    } catch (error) {
      console.error('Error getting preview URL:', error);
    }
  };

  // Preview a video file
  const handlePreviewVideo = async (file: FileItem) => {
    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        setPreviewVideo({ url: data.signedUrl, name: file.original_name || file.name, file });
      }
    } catch (error) {
      console.error('Error getting video preview URL:', error);
    }
  };

  // Preview a PDF file
  const handlePreviewPdf = async (file: FileItem) => {
    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        setPreviewPdf({ url: data.signedUrl, name: file.original_name || file.name, file });
      }
    } catch (error) {
      console.error('Error getting PDF preview URL:', error);
    }
  };

  // Navigate to next/previous file in preview
  const navigatePreview = useCallback((direction: 'prev' | 'next') => {
    if (previewImage) {
      const currentIndex = previewableFiles.images.findIndex(f => f.id === previewImage.file.id);
      if (currentIndex === -1) return;

      let newIndex: number;
      if (direction === 'next') {
        newIndex = currentIndex + 1 >= previewableFiles.images.length ? 0 : currentIndex + 1;
      } else {
        newIndex = currentIndex - 1 < 0 ? previewableFiles.images.length - 1 : currentIndex - 1;
      }

      const nextFile = previewableFiles.images[newIndex];
      if (nextFile) handlePreviewImage(nextFile);
    } else if (previewVideo) {
      const currentIndex = previewableFiles.videos.findIndex(f => f.id === previewVideo.file.id);
      if (currentIndex === -1) return;

      let newIndex: number;
      if (direction === 'next') {
        newIndex = currentIndex + 1 >= previewableFiles.videos.length ? 0 : currentIndex + 1;
      } else {
        newIndex = currentIndex - 1 < 0 ? previewableFiles.videos.length - 1 : currentIndex - 1;
      }

      const nextFile = previewableFiles.videos[newIndex];
      if (nextFile) handlePreviewVideo(nextFile);
    } else if (previewPdf) {
      const currentIndex = previewableFiles.pdfs.findIndex(f => f.id === previewPdf.file.id);
      if (currentIndex === -1) return;

      let newIndex: number;
      if (direction === 'next') {
        newIndex = currentIndex + 1 >= previewableFiles.pdfs.length ? 0 : currentIndex + 1;
      } else {
        newIndex = currentIndex - 1 < 0 ? previewableFiles.pdfs.length - 1 : currentIndex - 1;
      }

      const nextFile = previewableFiles.pdfs[newIndex];
      if (nextFile) handlePreviewPdf(nextFile);
    }
  }, [previewImage, previewVideo, previewPdf, previewableFiles]);

  // Keyboard navigation for preview modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewImage && !previewVideo && !previewPdf) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePreview('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigatePreview('next');
      } else if (e.key === 'Escape') {
        setPreviewImage(null);
        setPreviewVideo(null);
        setPreviewPdf(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, previewVideo, previewPdf, navigatePreview]);

  // Handle file click - preview images/videos/PDFs, download others
  const handleFileClick = (file: FileItem) => {
    const fileType = getFileType(file.mime_type);
    if (fileType === 'image') {
      handlePreviewImage(file);
    } else if (fileType === 'video') {
      handlePreviewVideo(file);
    } else if (fileType === 'document' && file.mime_type?.includes('pdf')) {
      handlePreviewPdf(file);
    } else {
      handleDownloadFile(file);
    }
  };

  // Helper function to check if user can edit a specific folder
  // Super Admin or hasDbEditPermission = can edit all folders
  // Otherwise, check folder-level permission
  const canEditFolderFn = (folderId: string): boolean => {
    if (hasRole('Super Admin')) return true;
    if (hasDbEditPermission) return true;
    return folderEditPermissions.has(folderId);
  };

  // Can edit current folder (used for toolbar buttons and actions)
  const canEdit = selectedFolder ? canEditFolderFn(selectedFolder.id) : (hasRole('Super Admin') || hasDbEditPermission);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0f0f12]">
        <div className="text-center">
          <FiLoader className="w-8 h-8 text-[#ea2127] animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0f0f12] overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#1f1f28] bg-[#0f0f12]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1a1a1f] rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              File <span className="text-[#ea2127]">System</span>
            </h1>
            <p className="text-xs text-[#5a5a68] font-mono mt-0.5">
              PROJECT MATERIALS DATABASE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a68]" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-[#141418] border border-[#1f1f28] rounded-xl text-sm text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-[#141418] border border-[#1f1f28] rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#ea2127] text-white'
                  : 'text-[#6b6b7a] hover:text-white'
              }`}
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#ea2127] text-white'
                  : 'text-[#6b6b7a] hover:text-white'
              }`}
            >
              <FiList className="w-4 h-4" />
            </button>
          </div>

          {/* Copy Link Button - only show when in a folder */}
          {selectedFolder && (
            <button
              onClick={copyFolderLink}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-medium text-sm ${
                linkCopied
                  ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                  : 'bg-[#1f1f28] hover:bg-[#2a2a38] text-[#8b8b9a] hover:text-white'
              }`}
              title="Copy link to this folder"
            >
              {linkCopied ? (
                <>
                  <FiCheck className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <FiLink className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          )}

          {/* Create Folder Button - only show if user has edit permission */}
          {selectedFolder && canEdit && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors font-medium text-sm"
            >
              <FiPlus className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          )}

          {/* Upload Button - only show if user has edit permission */}
          {selectedFolder && canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-[#ea2127] hover:bg-[#d11920] disabled:opacity-50 text-white rounded-xl transition-colors font-medium text-sm"
              >
                {uploading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiUpload className="w-4 h-4" />}
                <span>{uploading ? 'Uploading...' : 'Upload'}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedItems.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 flex items-center justify-between px-6 py-3 bg-[#ea2127]/10 border-b border-[#ea2127]/30"
          >
            <div className="flex items-center gap-4">
              <span className="text-white font-medium">
                {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-[#8b8b9a] hover:text-white transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-[#8b8b9a] hover:text-white transition-colors"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Download button - always visible */}
              <button
                onClick={handleDownloadSelected}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-[#1f1f28] hover:bg-[#2a2a38] disabled:opacity-50 text-white rounded-xl transition-colors font-medium text-sm"
              >
                {downloading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiDownload className="w-4 h-4" />}
                <span>{downloading ? 'Downloading...' : 'Download'}</span>
              </button>
              {/* Move button - only when can edit */}
              {canEdit && (
                <button
                  onClick={() => setMoveModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors font-medium text-sm"
                >
                  <FiMove className="w-4 h-4" />
                  <span>Move</span>
                </button>
              )}
              {/* Delete button - only when can edit */}
              {canEdit && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl transition-colors font-medium text-sm"
                >
                  <FiTrash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar - Folder Tree */}
        <aside className="w-72 h-full border-r border-[#1f1f28] bg-[#0a0a0d]/50 overflow-hidden flex-shrink-0">
          <div className="p-4 h-full overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[#5a5a68] uppercase tracking-wider">
                Folders
              </span>
            </div>

            <div className="space-y-1">
              {rootFolders.length === 0 && (isClientUser || isProspectUser) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center mb-3">
                    <FiLoader className="w-6 h-6 text-[#f59e0b] animate-spin" />
                  </div>
                  <p className="text-sm text-[#6b6b7a]">
                    Setting up your folder...
                  </p>
                </div>
              ) : (
                rootFolders.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    allFolders={folders}
                    depth={0}
                    selectedFolderId={selectedFolder?.id || null}
                    onSelect={handleSelectFolder}
                    expandedFolders={expandedFolders}
                    onToggleExpand={handleToggleExpand}
                    onContextMenu={handleSidebarContextMenu}
                    canEditFolder={canEditFolderFn}
                  />
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb path={breadcrumbPath} onNavigate={handleBreadcrumbNavigate} />
          </div>

          {/* Current folder info */}
          {selectedFolder && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-[#141418]/50 border border-[#1f1f28] rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedFolder.color}15` }}
                >
                  <span style={{ color: selectedFolder.color }} className="text-xl">
                    {renderIcon(selectedFolder.icon, "w-6 h-6")}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedFolder.name}</h2>
                  <p className="text-sm text-[#6b6b7a]">
                    {filteredItems.folders.length} folders, {filteredItems.files.length} files
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Content */}
          {!selectedFolder ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              {(isClientUser && !clientRootFolder) || (isProspectUser && !prospectRootFolder) ? (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-[#f59e0b]/10 flex items-center justify-center mb-4">
                    <FiLoader className="w-10 h-10 text-[#f59e0b] animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Setting Up Your Folder</h3>
                  <p className="text-[#6b6b7a] max-w-sm">
                    Your folder will be created for you shortly. Please check back in a moment.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-[#1a1a1f] flex items-center justify-center mb-4">
                    <FiFolder className="w-10 h-10 text-[#3a3a48]" />
                  </div>
                  {isClientUser ? (
                    <>
                      <h3 className="text-lg font-semibold text-white mb-2">Welcome to Your Files</h3>
                      <p className="text-[#6b6b7a] max-w-sm">
                        Select your folder from the sidebar to view your documents and files.
                      </p>
                    </>
                  ) : isProspectUser ? (
                    <>
                      <h3 className="text-lg font-semibold text-white mb-2">Preview Access</h3>
                      <p className="text-[#6b6b7a] max-w-sm">
                        Select a folder from the sidebar to preview available content.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-white mb-2">Select a folder</h3>
                      <p className="text-[#6b6b7a] max-w-sm">
                        Choose a folder from the sidebar to view its contents.
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          ) : filteredItems.folders.length === 0 && filteredItems.files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#1a1a1f] flex items-center justify-center mb-4">
                <FiFile className="w-10 h-10 text-[#3a3a48]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No files found</h3>
              <p className="text-[#6b6b7a] max-w-sm">
                {searchQuery
                  ? `No files matching "${searchQuery}"`
                  : 'This folder is empty. Create a folder or upload files to get started.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.folders.map((folder, index) => (
                <FileCard
                  key={folder.id}
                  item={folder}
                  isFolder
                  viewMode={viewMode}
                  index={index}
                  onOpen={() => handleOpenFolder(folder)}
                  onRename={() => {
                    setItemToEdit({ item: folder, isFolder: true });
                    setRenameModalOpen(true);
                  }}
                  onDelete={() => {
                    setItemToEdit({ item: folder, isFolder: true });
                    setDeleteModalOpen(true);
                  }}
                  canEdit={canEdit}
                  isSelected={selectedItems.has(folder.id)}
                  onSelect={(e) => handleItemSelect(folder.id, true, index, e)}
                  onDragStart={(e) => handleDragStart(folder.id, true, e)}
                  onDragOver={(e) => handleDragOver(folder.id, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(folder.id, e)}
                  isDragTarget={dragTargetId === folder.id}
                  selectionMode={selectionMode}
                  onContextMenu={(e) => handleContextMenu(folder, true, e)}
                />
              ))}
              {filteredItems.files.map((file, index) => (
                <FileCard
                  key={file.id}
                  item={file}
                  isFolder={false}
                  viewMode={viewMode}
                  index={filteredItems.folders.length + index}
                  onOpen={() => handleFileClick(file)}
                  onRename={() => {
                    setItemToEdit({ item: file, isFolder: false });
                    setRenameModalOpen(true);
                  }}
                  onDelete={() => {
                    setItemToEdit({ item: file, isFolder: false });
                    setDeleteModalOpen(true);
                  }}
                  canEdit={canEdit}
                  isSelected={selectedItems.has(file.id)}
                  onSelect={(e) => handleItemSelect(file.id, false, filteredItems.folders.length + index, e)}
                  onDragStart={(e) => handleDragStart(file.id, false, e)}
                  onDragOver={() => {}}
                  onDragLeave={() => {}}
                  onDrop={() => {}}
                  isDragTarget={false}
                  selectionMode={selectionMode}
                  onContextMenu={(e) => handleContextMenu(file, false, e)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.folders.map((folder, index) => (
                <FileCard
                  key={folder.id}
                  item={folder}
                  isFolder
                  viewMode={viewMode}
                  index={index}
                  onOpen={() => handleOpenFolder(folder)}
                  onRename={() => {
                    setItemToEdit({ item: folder, isFolder: true });
                    setRenameModalOpen(true);
                  }}
                  onDelete={() => {
                    setItemToEdit({ item: folder, isFolder: true });
                    setDeleteModalOpen(true);
                  }}
                  canEdit={canEdit}
                  isSelected={selectedItems.has(folder.id)}
                  onSelect={(e) => handleItemSelect(folder.id, true, index, e)}
                  onDragStart={(e) => handleDragStart(folder.id, true, e)}
                  onDragOver={(e) => handleDragOver(folder.id, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(folder.id, e)}
                  isDragTarget={dragTargetId === folder.id}
                  selectionMode={selectionMode}
                  onContextMenu={(e) => handleContextMenu(folder, true, e)}
                />
              ))}
              {filteredItems.files.map((file, index) => (
                <FileCard
                  key={file.id}
                  item={file}
                  isFolder={false}
                  viewMode={viewMode}
                  index={filteredItems.folders.length + index}
                  onOpen={() => handleFileClick(file)}
                  onRename={() => {
                    setItemToEdit({ item: file, isFolder: false });
                    setRenameModalOpen(true);
                  }}
                  onDelete={() => {
                    setItemToEdit({ item: file, isFolder: false });
                    setDeleteModalOpen(true);
                  }}
                  canEdit={canEdit}
                  isSelected={selectedItems.has(file.id)}
                  onSelect={(e) => handleItemSelect(file.id, false, filteredItems.folders.length + index, e)}
                  onDragStart={(e) => handleDragStart(file.id, false, e)}
                  onDragOver={() => {}}
                  onDragLeave={() => {}}
                  onDrop={() => {}}
                  isDragTarget={false}
                  selectionMode={selectionMode}
                  onContextMenu={(e) => handleContextMenu(file, false, e)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <FolderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFolder}
        title="Create New Folder"
      />

      <FolderModal
        isOpen={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setItemToEdit(null);
        }}
        onSubmit={handleRenameItem}
        initialName={itemToEdit?.item.name || ''}
        title={`Rename ${itemToEdit?.isFolder ? 'Folder' : 'File'}`}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToEdit(null);
        }}
        onConfirm={handleDeleteItem}
        itemName={itemToEdit?.item.name || ''}
        isFolder={itemToEdit?.isFolder || false}
      />

      <MoveModal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        onMove={handleMoveSelected}
        folders={folders}
        selectedCount={selectedItems.size}
        excludeFolderIds={excludedFolderIds}
      />

      <HoldToDeleteModal
        isOpen={holdDeleteModalOpen}
        onClose={() => {
          setHoldDeleteModalOpen(false);
          setFolderToDelete(null);
        }}
        onConfirm={handleDeleteSidebarFolder}
        folderName={folderToDelete?.name || ''}
      />

      {/* Sidebar Context Menu */}
      <AnimatePresence>
        {sidebarContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl shadow-2xl py-2 min-w-[160px]"
            style={{ left: sidebarContextMenu.x, top: sidebarContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setItemToEdit({ item: sidebarContextMenu.folder, isFolder: true });
                setRenameModalOpen(true);
                closeSidebarContextMenu();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
              <span className="text-sm">Rename</span>
            </button>
            <button
              onClick={() => {
                setContextMenu({ x: sidebarContextMenu.x, y: sidebarContextMenu.y, item: sidebarContextMenu.folder, isFolder: true });
                setIconPickerOpen(true);
                closeSidebarContextMenu();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-colors"
            >
              <FiBox className="w-4 h-4" />
              <span className="text-sm">Change Icon</span>
            </button>
            <button
              onClick={() => {
                setContextMenu({ x: sidebarContextMenu.x, y: sidebarContextMenu.y, item: sidebarContextMenu.folder, isFolder: true });
                setColorPickerOpen(true);
                closeSidebarContextMenu();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-colors"
            >
              <FiDroplet className="w-4 h-4" />
              <span className="text-sm">Change Color</span>
            </button>
            <div className="border-t border-[#2a2a35] my-1" />
            <button
              onClick={() => {
                setFolderToDelete(sidebarContextMenu.folder);
                setHoldDeleteModalOpen(true);
                closeSidebarContextMenu();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#ea2127] hover:bg-[#ea2127]/10 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
              <span className="text-sm">Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl shadow-2xl py-2 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* File-specific options: Preview and Download */}
            {!contextMenu.isFolder && (
              <>
                {/* Preview button for images, videos, and PDFs */}
                {['image', 'video', 'document'].includes(getFileType((contextMenu.item as FileItem).mime_type)) && (
                  <button
                    onClick={() => {
                      const file = contextMenu.item as FileItem;
                      const fileType = getFileType(file.mime_type);
                      if (fileType === 'image') {
                        handlePreviewImage(file);
                      } else if (fileType === 'video') {
                        handlePreviewVideo(file);
                      } else if (fileType === 'document' && file.mime_type?.includes('pdf')) {
                        handlePreviewPdf(file);
                      }
                      closeContextMenu();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-colors"
                  >
                    <FiEye className="w-4 h-4" />
                    <span className="text-sm">Preview</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handleDownloadFile(contextMenu.item as FileItem);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-colors"
                >
                  <FiDownload className="w-4 h-4" />
                  <span className="text-sm">Download</span>
                </button>
                <div className="border-t border-[#2a2a35] my-1" />
              </>
            )}
            {/* Edit options - only show if user can edit */}
            {canEdit && (
              <button
                onClick={() => {
                  setItemToEdit({ item: contextMenu.item, isFolder: contextMenu.isFolder });
                  setRenameModalOpen(true);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-colors"
              >
                <FiEdit2 className="w-4 h-4" />
                <span className="text-sm">Rename</span>
              </button>
            )}
            {contextMenu.isFolder && canEdit && (
              <>
                <button
                  onClick={() => {
                    setIconPickerOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-colors"
                >
                  <FiBox className="w-4 h-4" />
                  <span className="text-sm">Change Icon</span>
                </button>
                <button
                  onClick={() => {
                    setColorPickerOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-colors"
                >
                  <FiDroplet className="w-4 h-4" />
                  <span className="text-sm">Change Color</span>
                </button>
              </>
            )}
            {canEdit && <div className="border-t border-[#2a2a35] my-1" />}
            {canEdit && (
              <button
                onClick={() => {
                  setItemToEdit({ item: contextMenu.item, isFolder: contextMenu.isFolder });
                  setDeleteModalOpen(true);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[#ea2127] hover:bg-[#ea2127]/10 transition-colors"
              >
                <FiTrash2 className="w-4 h-4" />
                <span className="text-sm">Delete</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon Picker Modal */}
      <AnimatePresence>
        {iconPickerOpen && contextMenu && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setIconPickerOpen(false); setIconSearch(''); setContextMenu(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a35]">
                <div>
                  <h2 className="text-lg font-bold text-white">Choose Icon</h2>
                  <p className="text-sm text-[#6b6b7a] mt-0.5">
                    {FOLDER_ICONS.length} icons available
                  </p>
                </div>
                <button
                  onClick={() => { setIconPickerOpen(false); setIconSearch(''); setContextMenu(null); }}
                  className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-4 border-b border-[#2a2a35]">
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b7a]" />
                  <input
                    type="text"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Search icons..."
                    className="w-full pl-12 pr-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#6b6b7a] focus:outline-none focus:border-[#ea2127] transition-colors"
                    autoFocus
                  />
                  {iconSearch && (
                    <button
                      onClick={() => setIconSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6b6b7a] hover:text-white rounded-lg transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Icon Grid */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {iconSearch ? (
                  // Search results
                  (() => {
                    const searchLower = iconSearch.toLowerCase();
                    const filteredIcons = FOLDER_ICONS.filter(icon =>
                      icon.toLowerCase().includes(searchLower)
                    );

                    if (filteredIcons.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <FiSearch className="w-12 h-12 text-[#3a3a48] mx-auto mb-4" />
                          <p className="text-[#6b6b7a]">No icons found for "{iconSearch}"</p>
                          <p className="text-sm text-[#4a4a58] mt-1">Try a different search term</p>
                        </div>
                      );
                    }

                    return (
                      <div>
                        <h3 className="text-sm font-medium text-[#8b8b9a] mb-3">
                          {filteredIcons.length} result{filteredIcons.length !== 1 ? 's' : ''} for "{iconSearch}"
                        </h3>
                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                          {filteredIcons.map((icon) => (
                            <button
                              key={icon}
                              onClick={() => { handleChangeIcon(icon); setIconSearch(''); }}
                              className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-105 ${
                                (contextMenu.item as FileFolder).icon === icon
                                  ? 'border-[#ea2127] bg-[#ea2127]/10'
                                  : 'border-[#2a2a35] hover:border-[#ea2127]/50 hover:bg-[#1a1a1f]'
                              }`}
                            >
                              <img
                                src={`/icons/folder_icon_library/icons/filled/${icon}.svg`}
                                alt={icon}
                                className="w-7 h-7"
                                style={{ filter: 'brightness(0) invert(1)' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.opacity = '0.3';
                                }}
                              />
                              <span className="text-[10px] text-[#6b6b7a] group-hover:text-[#8b8b9a] truncate w-full text-center">
                                {icon}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Categories view
                  Object.entries(FOLDER_ICON_CATEGORIES).map(([key, category]) => (
                    <div key={key}>
                      <h3 className="text-sm font-medium text-[#8b8b9a] mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ea2127]" />
                        {category.label}
                      </h3>
                      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {category.icons.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => handleChangeIcon(icon)}
                            className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-105 ${
                              (contextMenu.item as FileFolder).icon === icon
                                ? 'border-[#ea2127] bg-[#ea2127]/10'
                                : 'border-[#2a2a35] hover:border-[#ea2127]/50 hover:bg-[#1a1a1f]'
                            }`}
                          >
                            <img
                              src={`/icons/folder_icon_library/icons/filled/${icon}.svg`}
                              alt={icon}
                              className="w-7 h-7"
                              style={{ filter: 'brightness(0) invert(1)' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.opacity = '0.3';
                              }}
                            />
                            <span className="text-[10px] text-[#6b6b7a] group-hover:text-[#8b8b9a] truncate w-full text-center">
                              {icon}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer - Current Selection */}
              <div className="px-6 py-4 border-t border-[#2a2a35] bg-[#0f0f12]/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#6b6b7a]">Current:</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1f] border border-[#2a2a35] rounded-lg">
                      <img
                        src={`/icons/folder_icon_library/icons/filled/${(contextMenu.item as FileFolder).icon}.svg`}
                        alt={(contextMenu.item as FileFolder).icon}
                        className="w-5 h-5"
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                      <span className="text-sm text-white">{(contextMenu.item as FileFolder).icon}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setIconPickerOpen(false); setIconSearch(''); setContextMenu(null); }}
                    className="px-4 py-2 bg-[#2a2a35] hover:bg-[#3a3a48] text-white rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Color Picker Modal */}
      <AnimatePresence>
        {colorPickerOpen && contextMenu && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a35]">
                <h2 className="text-lg font-bold text-white">Choose Color</h2>
                <button
                  onClick={() => { setColorPickerOpen(false); setContextMenu(null); }}
                  className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-5 gap-3">
                {[
                  '#ea2127', '#ef4444', '#f97316', '#f59e0b', '#eab308',
                  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
                  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
                  '#d946ef', '#ec4899', '#f43f5e', '#6b7280', '#ffffff'
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleChangeColor(color)}
                    className={`w-12 h-12 rounded-xl border-2 transition-all ${
                      (contextMenu.item as FileFolder).color === color
                        ? 'border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setPreviewImage(null)}
          >
            {/* Left navigation arrow */}
            {previewableFiles.images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigatePreview('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-[#1a1a1f]/80 backdrop-blur-xl border border-[#2a2a35] rounded-full text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-all z-10 group"
                title="Previous (Left Arrow)"
              >
                <FiChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Right navigation arrow */}
            {previewableFiles.images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigatePreview('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-[#1a1a1f]/80 backdrop-blur-xl border border-[#2a2a35] rounded-full text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-all z-10 group"
                title="Next (Right Arrow)"
              >
                <FiChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1f]/80 backdrop-blur-xl rounded-t-2xl border border-[#2a2a35] border-b-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-medium truncate max-w-[300px]">{previewImage.name}</h3>
                  {previewableFiles.images.length > 1 && (
                    <span className="text-[#6b6b7a] text-sm">
                      {previewableFiles.images.findIndex(f => f.id === previewImage.file.id) + 1} / {previewableFiles.images.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Zoom controls */}
                  <button
                    onClick={() => setPreviewZoom(Math.max(0.25, previewZoom - 0.25))}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Zoom out"
                  >
                    <FiZoomOut className="w-5 h-5" />
                  </button>
                  <span className="text-[#8b8b9a] text-sm min-w-[50px] text-center">{Math.round(previewZoom * 100)}%</span>
                  <button
                    onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.25))}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Zoom in"
                  >
                    <FiZoomIn className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-[#2a2a35] mx-1" />
                  {/* Download button */}
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = previewImage.url;
                      a.download = previewImage.name;
                      a.click();
                    }}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Download"
                  >
                    <FiDownload className="w-5 h-5" />
                  </button>
                  {/* Close button */}
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Close (Esc)"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Image container */}
              <div className="overflow-auto bg-[#0a0a0d] rounded-b-2xl border border-[#2a2a35] border-t-0 max-h-[calc(90vh-60px)]">
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="transition-transform duration-200"
                  style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}
                  draggable={false}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setPreviewVideo(null)}
          >
            {/* Left navigation arrow */}
            {previewableFiles.videos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigatePreview('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-[#1a1a1f]/80 backdrop-blur-xl border border-[#2a2a35] rounded-full text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-all z-10 group"
                title="Previous (Left Arrow)"
              >
                <FiChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Right navigation arrow */}
            {previewableFiles.videos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigatePreview('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-[#1a1a1f]/80 backdrop-blur-xl border border-[#2a2a35] rounded-full text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-all z-10 group"
                title="Next (Right Arrow)"
              >
                <FiChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl max-h-[90vh] flex flex-col mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1f]/80 backdrop-blur-xl rounded-t-2xl border border-[#2a2a35] border-b-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-medium truncate max-w-[400px]">{previewVideo.name}</h3>
                  {previewableFiles.videos.length > 1 && (
                    <span className="text-[#6b6b7a] text-sm">
                      {previewableFiles.videos.findIndex(f => f.id === previewVideo.file.id) + 1} / {previewableFiles.videos.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Download button */}
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = previewVideo.url;
                      a.download = previewVideo.name;
                      a.click();
                    }}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Download"
                  >
                    <FiDownload className="w-5 h-5" />
                  </button>
                  {/* Close button */}
                  <button
                    onClick={() => setPreviewVideo(null)}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Close (Esc)"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Video container */}
              <div className="bg-black rounded-b-2xl border border-[#2a2a35] border-t-0 overflow-hidden">
                <video
                  src={previewVideo.url}
                  controls
                  autoPlay
                  className="w-full max-h-[calc(90vh-60px)]"
                  style={{ outline: 'none' }}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {previewPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setPreviewPdf(null)}
          >
            {/* Left navigation arrow */}
            {previewableFiles.pdfs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigatePreview('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-[#1a1a1f]/80 backdrop-blur-xl border border-[#2a2a35] rounded-full text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-all z-10 group"
                title="Previous (Left Arrow)"
              >
                <FiChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Right navigation arrow */}
            {previewableFiles.pdfs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigatePreview('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-[#1a1a1f]/80 backdrop-blur-xl border border-[#2a2a35] rounded-full text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35] transition-all z-10 group"
                title="Next (Right Arrow)"
              >
                <FiChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl h-[90vh] flex flex-col mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1f]/80 backdrop-blur-xl rounded-t-2xl border border-[#2a2a35] border-b-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-medium truncate max-w-[400px]">{previewPdf.name}</h3>
                  {previewableFiles.pdfs.length > 1 && (
                    <span className="text-[#6b6b7a] text-sm">
                      {previewableFiles.pdfs.findIndex(f => f.id === previewPdf.file.id) + 1} / {previewableFiles.pdfs.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Open in new tab */}
                  <button
                    onClick={() => window.open(previewPdf.url, '_blank')}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Open in new tab"
                  >
                    <FiEye className="w-5 h-5" />
                  </button>
                  {/* Download button */}
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = previewPdf.url;
                      a.download = previewPdf.name;
                      a.click();
                    }}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Download"
                  >
                    <FiDownload className="w-5 h-5" />
                  </button>
                  {/* Close button */}
                  <button
                    onClick={() => setPreviewPdf(null)}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
                    title="Close (Esc)"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* PDF container */}
              <div className="flex-1 bg-[#0a0a0d] rounded-b-2xl border border-[#2a2a35] border-t-0 overflow-hidden">
                <iframe
                  src={previewPdf.url}
                  className="w-full h-full"
                  title={previewPdf.name}
                  style={{ border: 'none' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom CSS */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #2a2a35;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #3a3a48;
        }
      `}</style>
    </div>
  );
};

export default FileSystemPage;
