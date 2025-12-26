import React, { useState, useEffect, useCallback } from 'react';
import { FaPencilAlt, FaSearch, FaList, FaMap, FaSave, FaTimes, FaMousePointer } from 'react-icons/fa';
import { MapContainer, ImageOverlay, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Fix for default marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapBox {
  id: string;
  name: string;
  description: string | null;
  link_url: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  color: string;
  is_active: boolean;
  created_by: string;
  shape?: 'circle' | 'square' | 'triangle' | 'diamond';
  scale?: number;
}

interface PlacementData {
  position: { lat: number; lng: number };
  scale: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond';
}

interface BoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (boxData: Omit<MapBox, 'id' | 'created_by'>) => void;
  editingBox?: MapBox | null;
  placementData?: PlacementData | null;
}

const BoxModal: React.FC<BoxModalProps> = ({ isOpen, onClose, onSave, editingBox, placementData }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [color, setColor] = useState('#ea2127');
  const [shape, setShape] = useState<'circle' | 'square' | 'triangle' | 'diamond'>('circle');
  const [scale, setScale] = useState(1);

  const presetColors = [
    '#ea2127', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  useEffect(() => {
    if (editingBox) {
      setName(editingBox.name);
      setDescription(editingBox.description || '');
      setLinkUrl(editingBox.link_url || '');
      setColor(editingBox.color);
      setShape(editingBox.shape || 'circle');
      setScale(editingBox.scale || 1);
    } else if (placementData) {
      setName('');
      setDescription('');
      setLinkUrl('');
      setColor(placementData.color);
      setShape(placementData.shape);
      setScale(placementData.scale);
    }
  }, [editingBox, placementData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const position = editingBox
      ? { lat: editingBox.y_position, lng: editingBox.x_position }
      : placementData?.position;

    if (!position) return;

    onSave({
      name,
      description: description || null,
      link_url: linkUrl || '',
      x_position: position.lng,
      y_position: position.lat,
      width: 0.02,
      height: 0.02,
      color,
      shape,
      scale,
      is_active: true
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
              {editingBox ? 'Edit Location' : 'New Location'}
            </h2>
            <button onClick={onClose} className="text-[#6b6b7a] hover:text-white transition-colors p-2 hover:bg-[#2a2a35] rounded-lg">
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
                placeholder="Enter location name"
                autoFocus
              />
            </div>

            {/* Color & Shape Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Color</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-lg transition-all ${
                        color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Shape</label>
                <div className="flex items-center gap-2">
                  {(['circle', 'square', 'diamond'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShape(s)}
                      className={`w-9 h-9 rounded-lg border-2 transition-all flex items-center justify-center ${
                        shape === s
                          ? 'border-[#ea2127] bg-[#ea2127]/20'
                          : 'border-[#2a2a35] hover:border-[#3a3a48]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 ${
                          s === 'circle' ? 'rounded-full' :
                          s === 'diamond' ? 'rotate-45 rounded-sm' : 'rounded-sm'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scale */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[#8b8b9a]">Size</label>
                <span className="text-sm text-white font-mono">{scale.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                  className="w-10 h-10 rounded-xl bg-[#1a1a1f] border border-[#2a2a35] text-white hover:bg-[#252530] transition-all flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="flex-1 h-2 accent-[#ea2127] bg-[#2a2a35] rounded-full"
                />
                <button
                  type="button"
                  onClick={() => setScale(s => Math.min(3, s + 0.1))}
                  className="w-10 h-10 rounded-xl bg-[#1a1a1f] border border-[#2a2a35] text-white hover:bg-[#252530] transition-all flex items-center justify-center"
                >
                  +
                </button>
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
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[#1a1a1f] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-all border border-[#2a2a35]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name}
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

// Placement Overlay - shown when placing a new marker
const PlacementOverlay: React.FC<{
  position: { lat: number; lng: number };
  onConfirm: (data: PlacementData) => void;
  onCancel: () => void;
}> = ({ position, onConfirm, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [color, setColor] = useState('#ea2127');
  const [shape, setShape] = useState<'circle' | 'square' | 'triangle' | 'diamond'>('circle');

  const presetColors = [
    '#ea2127', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[600] animate-[fadeSlideIn_0.2s_ease-out]">
      <div className="bg-[#141418]/95 backdrop-blur-xl border border-[#2a2a35] rounded-2xl shadow-2xl shadow-black/50 p-4 min-w-[320px]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ea2127]/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 flex items-center justify-center ${
                shape === 'circle' ? 'rounded-full' :
                shape === 'diamond' ? 'rotate-45 rounded-sm' : 'rounded-sm'
              }`}
              style={{
                backgroundColor: color,
                transform: `scale(${scale}) ${shape === 'diamond' ? 'rotate(45deg)' : ''}`
              }}
            />
            <span className="text-white font-medium">New Marker</span>
          </div>
          <button
            onClick={onCancel}
            className="text-[#6b6b7a] hover:text-white p-1"
          >
            <FaTimes />
          </button>
        </div>

        {/* Quick Color Selection */}
        <div className="flex items-center gap-1.5 mb-4">
          {presetColors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-lg transition-all ${
                color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Shape & Size Row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            {(['circle', 'square', 'diamond'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setShape(s)}
                className={`w-9 h-9 rounded-lg border-2 transition-all flex items-center justify-center ${
                  shape === s
                    ? 'border-[#ea2127] bg-[#ea2127]/20'
                    : 'border-[#2a2a35] hover:border-[#3a3a48]'
                }`}
              >
                <div
                  className={`w-4 h-4 ${
                    s === 'circle' ? 'rounded-full' :
                    s === 'diamond' ? 'rotate-45 rounded-sm' : 'rounded-sm'
                  }`}
                  style={{ backgroundColor: color }}
                />
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-[#6b6b7a]">Size</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-2 accent-[#ea2127]"
            />
            <span className="text-xs text-white font-mono w-8">{scale.toFixed(1)}x</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-[#1a1a1f] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-xl font-medium transition-all border border-[#2a2a35] text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ position, scale, color, shape })}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#ea2127] to-[#d11920] hover:from-[#ff3b42] hover:to-[#ea2127] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#ea2127]/20 text-sm"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

// Custom marker icon function - scales with map zoom
const createCustomIcon = (color: string, name: string, shape: string = 'circle', scale: number = 1, box?: MapBox, selectedTool?: string, mapZoom: number = 10) => {
  // Base size scales with zoom level - smaller when zoomed out, larger when zoomed in
  const zoomScale = Math.pow(2, (mapZoom - 10) / 2); // Exponential scaling based on zoom
  const size = Math.max(16, Math.min(60, 30 * scale * zoomScale)); // Clamp between 16-60px
  
  let shapeStyles = '';
  switch (shape) {
    case 'square':
      shapeStyles = 'border-radius: 4px;';
      break;
    case 'triangle':
      shapeStyles = `
        border-radius: 4px;
        transform: rotate(45deg);
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      `;
      break;
    case 'diamond':
      shapeStyles = 'transform: rotate(45deg); border-radius: 4px;';
      break;
    case 'circle':
    default:
      shapeStyles = 'border-radius: 50%;';
      break;
  }

  // Create tooltip content for select mode
  const tooltipContent = selectedTool === 'select' && box ? `
    <div class="marker-tooltip">
      <div class="tooltip-content">
        <h4>${name}</h4>
        ${box.description ? `<p>${box.description}</p>` : ''}
        <small>${box.link_url}</small>
      </div>
    </div>
  ` : '';

  const iconHtml = `
    <div class="marker-container" style="position: relative;">
      <div style="
        background-color: ${color};
        border: 3px solid white;
        ${shapeStyles}
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        color: white;
        font-weight: bold;
        font-size: ${12 * scale}px;
        cursor: pointer;
      ">
        <span style="${shape === 'triangle' || shape === 'diamond' ? 'transform: rotate(-45deg);' : ''}">
          ${name.charAt(0).toUpperCase()}
        </span>
      </div>
      ${tooltipContent}
    </div>
    <style>
      .marker-container:hover .marker-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(-13px);
      }
      
      .marker-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-8px);
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 8px 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        z-index: 1000;
        white-space: nowrap;
        max-width: 200px;
        white-space: normal;
        min-width: 120px;
      }
      
      .marker-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: white;
      }
      
      .tooltip-content h4 {
        margin: 0 0 4px 0;
        font-weight: bold;
        color: #333;
        font-size: 14px;
      }
      
      .tooltip-content p {
        margin: 0 0 4px 0;
        color: #666;
        font-size: 12px;
      }
      
      .tooltip-content small {
        color: #888;
        font-size: 11px;
        word-break: break-all;
      }
    </style>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Component to handle map clicks and zoom events
const MapEventHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  onZoomChange: (zoom: number) => void;
  canEdit: boolean;
}> = ({ onMapClick, onZoomChange, canEdit }) => {
  const map = useMapEvents({
    click: (e) => {
      if (canEdit) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  // Set initial zoom
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
};

// Bottom Navbar Component for Map Tools
const MapToolbar: React.FC<{
  canEdit: boolean;
  selectedTool: string;
  onToolChange: (tool: string) => void;
  locationsCount: number;
}> = ({ canEdit, selectedTool, onToolChange, locationsCount }) => {

  const tools = [
    { id: 'select', icon: FaMousePointer, label: 'Select', enabled: true },
    { id: 'marker', icon: FaPencilAlt, label: 'Edit', enabled: canEdit },
  ];

  return (
    <div className="absolute bottom-4 left-4 right-4 z-[500]">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#141418]/90 backdrop-blur-xl border border-[#2a2a35] rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* Toolbar buttons */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => tool.enabled && onToolChange(tool.id)}
                  disabled={!tool.enabled}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200
                    ${selectedTool === tool.id
                      ? 'bg-gradient-to-r from-[#ea2127] to-[#d11920] text-white shadow-lg shadow-[#ea2127]/20'
                      : tool.enabled
                      ? 'text-[#8b8b9a] hover:text-white hover:bg-[#1f1f28]'
                      : 'text-[#3a3a48] cursor-not-allowed'
                    }
                  `}
                  title={tool.enabled ? tool.label : `${tool.label} (Admin only)`}
                >
                  <tool.icon className="text-sm" />
                  <span className="text-sm">{tool.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a23] rounded-lg border border-[#2a2a35]">
                <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-xs text-[#8b8b9a]">{locationsCount} locations</span>
              </div>
              {canEdit && (
                <div className="px-3 py-1.5 bg-[#ea2127]/10 rounded-lg border border-[#ea2127]/30">
                  <span className="text-xs text-[#ea2127] font-medium">Edit Access</span>
                </div>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="px-4 py-2 bg-[#0f0f12] border-t border-[#1f1f28]">
            <p className="text-xs text-[#6b6b7a]">
              {selectedTool === 'select' && 'Click markers to open links'}
              {selectedTool === 'marker' && canEdit && 'Click map to add • Click markers to edit/move/delete'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeafletMap: React.FC = () => {
  const [mapBoxes, setMapBoxes] = useState<MapBox[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<MapBox | null>(null);
  const [placementPosition, setPlacementPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [placementData, setPlacementData] = useState<PlacementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showListView, setShowListView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [isInMoveMode, setIsInMoveMode] = useState(false);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(10);

  const { hasRole, user } = useAuthStore();
  const canEdit = hasRole('Super Admin') || hasRole('Boss') || hasRole('Admin') || hasRole('Architect') || hasRole('Project Manager');

  const handleZoomChange = useCallback((zoom: number) => {
    setMapZoom(zoom);
  }, []);

  // Default bounds for your company map - adjust these coordinates as needed
  const companyMapBounds: [[number, number], [number, number]] = [
    [40.0, -75.0], // Southwest corner
    [41.0, -74.0]  // Northeast corner
  ];

  // Filter boxes based on search query
  const filteredBoxes = mapBoxes.filter(box => 
    box.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    box.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    box.link_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchMapBoxes();
  }, []);

  const fetchMapBoxes = async () => {
    try {
      const { data, error } = await supabase
        .from('map_boxes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMapBoxes(data || []);
    } catch (error) {
      console.error('Error fetching map boxes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    // Close any open popup when clicking on map
    setActivePopup(null);

    // If in move mode, update the position and save immediately
    if (isInMoveMode && editingBox) {
      handleSaveBox({
        name: editingBox.name,
        description: editingBox.description,
        link_url: editingBox.link_url,
        x_position: lng,
        y_position: lat,
        width: editingBox.width,
        height: editingBox.height,
        color: editingBox.color,
        shape: editingBox.shape,
        scale: editingBox.scale,
        is_active: editingBox.is_active
      });

      setIsInMoveMode(false);
      setEditingBox(null);
      return;
    }

    // Only allow adding markers in 'marker' mode
    if (!canEdit || selectedTool !== 'marker') return;

    // Start placement mode - show overlay to configure marker before details
    setPlacementPosition({ lat, lng });
    setEditingBox(null);
  };

  const handlePlacementConfirm = (data: PlacementData) => {
    setPlacementData(data);
    setPlacementPosition(null);
    setIsModalOpen(true);
  };

  const handlePlacementCancel = () => {
    setPlacementPosition(null);
  };

  const handleMarkerClick = (box: MapBox) => {
    if (selectedTool === 'select') {
      // In select mode, open the link if it exists
      if (box.link_url) {
        window.open(box.link_url, '_blank');
      }
    } else if (selectedTool === 'marker') {
      // In marker mode, show the popup
      setActivePopup(box.id);
    }
  };

  const handleSaveBox = async (boxData: Omit<MapBox, 'id' | 'created_by'>) => {
    try {
      if (editingBox) {
        // Update existing box
        const { error } = await supabase
          .from('map_boxes')
          .update(boxData)
          .eq('id', editingBox.id);

        if (error) throw error;
      } else {
        // Create new box - ensure created_by is set
        const insertData = {
          ...boxData,
          created_by: user?.id
        };
        
        const { error } = await supabase
          .from('map_boxes')
          .insert([insertData]);

        if (error) throw error;
      }

      fetchMapBoxes();
      setIsModalOpen(false);
      setEditingBox(null);
      setPlacementData(null);
    } catch (error) {
      console.error('Error saving box:', error);
      alert('Error saving location. Please try again.');
    }
  };

  const handleDeleteBox = async (boxId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await supabase
        .from('map_boxes')
        .update({ is_active: false })
        .eq('id', boxId);

      if (error) throw error;
      fetchMapBoxes();
    } catch (error) {
      console.error('Error deleting box:', error);
      alert('Error deleting location. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#2a2a35]" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#ea2127] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#ea2127]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
          <p className="text-white font-medium">Loading Map</p>
          <p className="text-[#6b6b7a] text-sm mt-1">Fetching locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-[#0f0f12]">
      {/* Floating Header */}
      <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="bg-[#141418]/90 backdrop-blur-xl border border-[#2a2a35] rounded-2xl px-5 py-3 shadow-xl">
              <h1 className="text-xl font-bold text-white">Company Map</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Search in map view */}
            {!showListView && (
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-48 bg-[#141418]/90 backdrop-blur-xl border border-[#2a2a35] rounded-xl text-white text-sm placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50"
                />
              </div>
            )}
            {/* View Toggle */}
            <button
              onClick={() => setShowListView(!showListView)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#141418]/90 backdrop-blur-xl border border-[#2a2a35] text-white rounded-xl hover:bg-[#1a1a23] transition-colors shadow-xl"
            >
              {showListView ? <FaMap /> : <FaList />}
              <span className="text-sm font-medium">{showListView ? 'Map' : 'List'}</span>
            </button>
          </div>
        </div>

        {isInMoveMode && editingBox && (
          <div className="mt-3 pointer-events-auto">
            <div className="inline-flex items-center gap-3 bg-[#f59e0b]/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-lg">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <div>
                <p className="font-semibold text-sm">Move Mode</p>
                <p className="text-xs opacity-90">Click to place "{editingBox.name}"</p>
              </div>
              <button
                onClick={() => {
                  setIsInMoveMode(false);
                  setEditingBox(null);
                }}
                className="ml-2 p-1 hover:bg-white/20 rounded"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showListView ? (
        /* List View */
        <div className="h-full w-full bg-[#0f0f12] overflow-y-auto">
          <div className="p-6 pt-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                All Locations ({filteredBoxes.length})
              </h2>
              <div className="relative">
                <FaSearch className="absolute left-3 top-2.5 w-4 h-4 text-[#6b6b7a]" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 bg-[#1a1a23] border border-[#2a2a35] rounded-lg text-white placeholder-[#5a5a68] focus:ring-2 focus:ring-[#ea2127]/50 focus:border-[#ea2127]/50"
                />
              </div>
            </div>

            {filteredBoxes.length === 0 ? (
              <p className="text-[#6b6b7a] text-center py-8">
                {searchQuery ? 'No locations match your search.' : 'No locations created yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredBoxes.map((box) => (
                  <div
                    key={box.id}
                    className="flex items-center justify-between p-4 bg-[#141418] border border-[#2a2a35] rounded-xl hover:bg-[#1a1a23] transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-8 h-8 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold ${
                          box.shape === 'square' ? 'rounded' : 
                          box.shape === 'triangle' ? 'rounded transform rotate-45' :
                          box.shape === 'diamond' ? 'rounded transform rotate-45' :
                          'rounded-full'
                        }`}
                        style={{ backgroundColor: box.color }}
                      >
                        <span className={box.shape === 'triangle' || box.shape === 'diamond' ? 'transform -rotate-45' : ''}>
                          {box.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{box.name}</h3>
                        {box.description && (
                          <p className="text-sm text-[#8b8b9a]">{box.description}</p>
                        )}
                        {box.link_url && (
                          <a
                            href={box.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#3b82f6] hover:text-[#60a5fa]"
                          >
                            {box.link_url}
                          </a>
                        )}
                      </div>
                    </div>
                    {canEdit && selectedTool === 'marker' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingBox(box);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-[#6b6b7a] hover:text-[#3b82f6] transition-colors"
                          title="Edit location"
                        >
                          <FaPencilAlt />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBox(box);
                            setIsInMoveMode(true);
                            setActivePopup(null);
                          }}
                          className="p-2 text-[#6b6b7a] hover:text-[#f59e0b] transition-colors"
                          title="Move location"
                        >
                          📍
                        </button>
                        <button
                          onClick={() => handleDeleteBox(box.id)}
                          className="p-2 text-[#6b6b7a] hover:text-[#ea2127] transition-colors"
                          title="Delete location"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Map View */
        <MapContainer
          center={[40.5, -74.5]} // Adjust center as needed
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          className="leaflet-container"
        >
          {/* Company Map Overlay */}
          <ImageOverlay
            url="/company_map.png"
            bounds={companyMapBounds}
          />

          {/* Map Event Handler */}
          <MapEventHandler onMapClick={handleMapClick} onZoomChange={handleZoomChange} canEdit={canEdit && (selectedTool === 'marker' || isInMoveMode)} />

          {/* Location Markers */}
          {mapBoxes.map((box) => (
            <Marker
              key={box.id}
              position={[box.y_position, box.x_position]}
              icon={createCustomIcon(box.color, box.name, box.shape || 'circle', box.scale || 1, box, selectedTool, mapZoom)}
              eventHandlers={{
                click: () => handleMarkerClick(box),
              }}
            >
              {selectedTool === 'select' && (
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-gray-900">{box.name}</h3>
                    {box.description && (
                      <p className="text-sm text-gray-600 mt-1">{box.description}</p>
                    )}
                    {box.link_url && (
                      <div className="mt-2">
                        <a
                          href={box.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm text-blue-600 hover:text-blue-800"
                        >
                          Visit Link →
                        </a>
                      </div>
                    )}
                  </div>
                </Popup>
              )}
              {selectedTool === 'marker' && canEdit && activePopup === box.id && (
                <Popup
                  closeOnClick={false}
                  autoClose={false}
                >
                  <div className="p-2">
                    <h3 className="font-bold text-gray-900">{box.name}</h3>
                    {box.description && (
                      <p className="text-sm text-gray-600 mt-1">{box.description}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      {box.link_url && (
                        <a
                          href={box.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm text-blue-600 hover:text-blue-800"
                        >
                          Visit Link →
                        </a>
                      )}
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBox(box);
                            setIsModalOpen(true);
                            setActivePopup(null);
                          }}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBox(box);
                            setIsInMoveMode(true);
                            setActivePopup(null);
                          }}
                          className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700"
                        >
                          Move
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBox(box.id);
                            setActivePopup(null);
                          }}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </Marker>
          ))}
        </MapContainer>
      )}

      {/* Placement Overlay - Step 1: Configure marker appearance */}
      {placementPosition && (
        <PlacementOverlay
          position={placementPosition}
          onConfirm={handlePlacementConfirm}
          onCancel={handlePlacementCancel}
        />
      )}

      {/* Add/Edit Location Modal - Step 2: Fill in details */}
      <BoxModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBox(null);
          setPlacementData(null);
          setIsInMoveMode(false);
        }}
        onSave={handleSaveBox}
        editingBox={editingBox}
        placementData={placementData}
      />

      {/* Bottom Toolbar */}
      {!showListView && (
        <MapToolbar canEdit={canEdit} selectedTool={selectedTool} onToolChange={setSelectedTool} locationsCount={mapBoxes.length} />
      )}
    </div>
  );
};

export default LeafletMap;