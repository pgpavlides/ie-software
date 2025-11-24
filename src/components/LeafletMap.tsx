import React, { useState, useEffect } from 'react';
import { FaPencilAlt, FaSearch, FaList, FaMap, FaSave, FaTimes, FaMousePointer, FaPalette } from 'react-icons/fa';
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

interface BoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (boxData: Omit<MapBox, 'id' | 'created_by'>) => void;
  editingBox?: MapBox | null;
  position: { lat: number; lng: number } | null;
}

const BoxModal: React.FC<BoxModalProps> = ({ isOpen, onClose, onSave, editingBox, position }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [shape, setShape] = useState<'circle' | 'square' | 'triangle' | 'diamond'>('circle');
  const [scale, setScale] = useState(1);
  const [xPosition, setXPosition] = useState(0);
  const [yPosition, setYPosition] = useState(0);

  useEffect(() => {
    if (editingBox) {
      setName(editingBox.name);
      setDescription(editingBox.description || '');
      setLinkUrl(editingBox.link_url);
      setColor(editingBox.color);
      setShape(editingBox.shape || 'circle');
      setScale(editingBox.scale || 1);
      setXPosition(editingBox.x_position);
      setYPosition(editingBox.y_position);
    } else if (position) {
      setName('');
      setDescription('');
      setLinkUrl('');
      setColor('#3B82F6');
      setShape('circle');
      setScale(1);
      setXPosition(position.lng);
      setYPosition(position.lat);
    }
  }, [editingBox, position, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !linkUrl) return;

    onSave({
      name,
      description: description || null,
      link_url: linkUrl,
      x_position: xPosition,
      y_position: yPosition,
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {editingBox ? 'Edit Location' : 'Add New Location'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter location name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional description"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="https://..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">{color}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value as 'circle' | 'square' | 'triangle' | 'diamond')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
              <option value="diamond">Diamond</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 min-w-[3rem]">{scale}x</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">X Position</label>
              <input
                type="number"
                step="0.001"
                value={xPosition}
                onChange={(e) => setXPosition(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Y Position</label>
              <input
                type="number"
                step="0.001"
                value={yPosition}
                onChange={(e) => setYPosition(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FaSave />
              <span>{editingBox ? 'Update' : 'Create'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Custom marker icon function
const createCustomIcon = (color: string, name: string, shape: string = 'circle', scale: number = 1, box?: MapBox, selectedTool?: string) => {
  const size = 30 * scale;
  
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

// Component to handle map clicks for adding new locations
const MapClickHandler: React.FC<{ 
  onMapClick: (lat: number, lng: number) => void;
  canEdit: boolean;
}> = ({ onMapClick, canEdit }) => {
  useMapEvents({
    click: (e) => {
      if (canEdit) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Bottom Navbar Component for Map Tools
const MapToolbar: React.FC<{ 
  canEdit: boolean; 
  selectedTool: string; 
  onToolChange: (tool: string) => void;
}> = ({ canEdit, selectedTool, onToolChange }) => {

  const tools = [
    { id: 'select', icon: FaMousePointer, label: 'Select', enabled: true },
    { id: 'marker', icon: FaPencilAlt, label: 'Add/Edit Marker', enabled: canEdit },
    { id: 'style', icon: FaPalette, label: 'Style', enabled: canEdit },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000]">
      <div className="flex items-center justify-center px-4 py-3">
        <div className="flex space-x-1 bg-black/20 backdrop-blur-sm rounded-lg p-1 border border-white/20">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => tool.enabled && onToolChange(tool.id)}
              disabled={!tool.enabled}
              className={`
                flex flex-col items-center justify-center px-4 py-2 rounded-md min-w-[70px] transition-all duration-200
                ${selectedTool === tool.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : tool.enabled
                  ? 'text-white hover:bg-white/20 hover:text-blue-200'
                  : 'text-white/40 cursor-not-allowed opacity-50'
                }
              `}
              title={tool.enabled ? tool.label : `${tool.label} (Admin only)`}
            >
              <tool.icon className="text-lg mb-1" />
              <span className="text-xs font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Tool Status/Info Bar */}
      <div className="bg-black/30 backdrop-blur-sm px-4 py-2 border-t border-white/10">
        <div className="flex items-center justify-between text-sm text-white">
          <div className="flex items-center space-x-4">
            <span>
              <strong>Current Tool:</strong> {tools.find(t => t.id === selectedTool)?.label}
            </span>
            {selectedTool === 'select' && (
              <span className="text-blue-300">Click on markers to open links</span>
            )}
            {selectedTool === 'marker' && canEdit && (
              <span className="text-green-300">Click on map to add new markers or click existing markers to edit</span>
            )}
            {selectedTool === 'style' && canEdit && (
              <span className="text-orange-300">Customize marker colors and appearance</span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {canEdit && (
              <span className="text-xs bg-green-500/30 text-green-200 px-2 py-1 rounded border border-green-400/30">
                Edit Mode
              </span>
            )}
            <span className="text-xs bg-white/20 text-white/80 px-2 py-1 rounded border border-white/20">
              Zoom: Auto
            </span>
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
  const [clickPosition, setClickPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showListView, setShowListView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [isInMoveMode, setIsInMoveMode] = useState(false);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  
  const { hasRole, user } = useAuthStore();
  const canEdit = hasRole('Admin') || hasRole('Architect') || hasRole('Project Manager');

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
      const updatedBox = {
        ...editingBox,
        x_position: lng,
        y_position: lat,
      };
      
      handleSaveBox({
        name: updatedBox.name,
        description: updatedBox.description,
        link_url: updatedBox.link_url,
        x_position: lng,
        y_position: lat,
        width: updatedBox.width,
        height: updatedBox.height,
        color: updatedBox.color,
        shape: updatedBox.shape,
        scale: updatedBox.scale,
        is_active: updatedBox.is_active
      });
      
      setIsInMoveMode(false);
      setEditingBox(null);
      return;
    }
    
    // Only allow adding markers in 'marker' mode
    if (!canEdit || selectedTool !== 'marker') return;
    
    setClickPosition({ lat, lng });
    setEditingBox(null);
    setIsModalOpen(true);
  };

  const handleMarkerClick = (box: MapBox) => {
    if (selectedTool === 'select') {
      // In select mode, just open the link
      window.open(box.link_url, '_blank');
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
      setClickPosition(null);
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
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0">
      {/* Floating Header - NO SPACE TAKEN */}
      <div className="absolute top-4 left-4 right-4 z-50 pointer-events-none">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Company Map</h1>
          <div className="flex items-center space-x-2 pointer-events-auto">
            {/* View Toggle */}
            <button
              onClick={() => setShowListView(!showListView)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2 shadow-lg"
            >
              {showListView ? <FaMap /> : <FaList />}
              <span>{showListView ? 'Map View' : 'List View'}</span>
            </button>
          </div>
        </div>
        
        {canEdit && !isInMoveMode && (
          <p className="text-white drop-shadow-lg text-sm mt-2 pointer-events-none">
            Click anywhere on the map to add a new location marker.
          </p>
        )}
        {isInMoveMode && editingBox && (
          <div className="bg-orange-600 text-white px-4 py-2 rounded-md shadow-lg mt-2 pointer-events-none">
            <p className="font-semibold">🔄 Move Mode Active</p>
            <p className="text-sm">Click anywhere on the map to move "{editingBox.name}"</p>
          </div>
        )}
      </div>

      {showListView ? (
        /* List View */
        <div className="absolute inset-0 bg-white overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                All Locations ({filteredBoxes.length})
              </h2>
              <div className="relative">
                <FaSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {filteredBoxes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {searchQuery ? 'No locations match your search.' : 'No locations created yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredBoxes.map((box) => (
                  <div
                    key={box.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
                        <h3 className="font-medium text-gray-900">{box.name}</h3>
                        {box.description && (
                          <p className="text-sm text-gray-600">{box.description}</p>
                        )}
                        <a
                          href={box.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {box.link_url}
                        </a>
                      </div>
                    </div>
                    {canEdit && selectedTool === 'marker' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleMarkerClick(box)}
                          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Edit location"
                        >
                          <FaPencilAlt />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBox(box);
                            setClickPosition({ lat: box.y_position, lng: box.x_position });
                            setIsInMoveMode(true);
                            setActivePopup(null); // Close popup when move mode starts
                          }}
                          className="p-2 text-gray-600 hover:text-orange-600 transition-colors"
                          title="Move location"
                        >
                          📍
                        </button>
                        <button
                          onClick={() => handleDeleteBox(box.id)}
                          className="p-2 text-gray-600 hover:text-red-600 transition-colors"
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
          style={{ height: '100vh', width: '100vw' }}
          className="leaflet-container"
        >
          {/* Company Map Overlay */}
          <ImageOverlay
            url="/company_map.png"
            bounds={companyMapBounds}
          />

          {/* Map Click Handler */}
          <MapClickHandler onMapClick={handleMapClick} canEdit={canEdit && (selectedTool === 'marker' || isInMoveMode)} />

          {/* Location Markers */}
          {mapBoxes.map((box) => (
            <Marker
              key={box.id}
              position={[box.y_position, box.x_position]}
              icon={createCustomIcon(box.color, box.name, box.shape || 'circle', box.scale || 1, box, selectedTool)}
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
                      <a
                        href={box.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-blue-600 hover:text-blue-800"
                      >
                        Visit Link →
                      </a>
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBox(box);
                            setClickPosition({ lat: box.y_position, lng: box.x_position });
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
                            setClickPosition({ lat: box.y_position, lng: box.x_position });
                            setIsInMoveMode(true);
                            setActivePopup(null); // Close popup when move mode starts
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

      {/* Add Location Modal */}
      <BoxModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBox(null);
          setClickPosition(null);
          setIsInMoveMode(false);
        }}
        onSave={handleSaveBox}
        editingBox={editingBox}
        position={clickPosition}
      />

      {/* Bottom Toolbar */}
      <MapToolbar canEdit={canEdit} selectedTool={selectedTool} onToolChange={setSelectedTool} />
    </div>
  );
};

export default LeafletMap;