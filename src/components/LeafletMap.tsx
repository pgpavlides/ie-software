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

  useEffect(() => {
    if (editingBox) {
      setName(editingBox.name);
      setDescription(editingBox.description || '');
      setLinkUrl(editingBox.link_url);
      setColor(editingBox.color);
    } else {
      setName('');
      setDescription('');
      setLinkUrl('');
      setColor('#3B82F6');
    }
  }, [editingBox, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !linkUrl || !position) return;

    onSave({
      name,
      description: description || null,
      link_url: linkUrl,
      x_position: position.lng,
      y_position: position.lat,
      width: 0.02,
      height: 0.02,
      color,
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
const createCustomIcon = (color: string, name: string) => {
  const iconHtml = `
    <div style="
      background-color: ${color};
      border: 3px solid white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      color: white;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
    ">
      ${name.charAt(0).toUpperCase()}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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
    { id: 'marker', icon: FaPencilAlt, label: 'Add Marker', enabled: canEdit },
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
              <span className="text-green-300">Click on map to add new markers</span>
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
    }
    // In marker mode, the popup will show with edit/delete buttons
    // Modal opening is handled by the Edit button in the popup
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
        
        {canEdit && (
          <p className="text-white drop-shadow-lg text-sm mt-2 pointer-events-none">
            Click anywhere on the map to add a new location marker.
          </p>
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
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: box.color }}
                      >
                        {box.name.charAt(0).toUpperCase()}
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
          <MapClickHandler onMapClick={handleMapClick} canEdit={canEdit && selectedTool === 'marker'} />

          {/* Location Markers */}
          {mapBoxes.map((box) => (
            <Marker
              key={box.id}
              position={[box.y_position, box.x_position]}
              icon={createCustomIcon(box.color, box.name)}
              eventHandlers={{
                click: () => handleMarkerClick(box),
              }}
            >
              {selectedTool === 'marker' && canEdit && (
                <Popup>
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
                          }}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBox(box.id);
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