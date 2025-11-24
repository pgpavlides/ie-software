import React, { useState, useEffect } from 'react';
import { FaPencilAlt, FaSearch, FaList, FaMap, FaSave, FaTimes } from 'react-icons/fa';
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

const LeafletMap: React.FC = () => {
  const [mapBoxes, setMapBoxes] = useState<MapBox[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<MapBox | null>(null);
  const [clickPosition, setClickPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showListView, setShowListView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { hasRole, user, roles } = useAuthStore();
  const canEdit = hasRole('Admin') || hasRole('Architect') || hasRole('Project Manager');
  
  // Debug: Show current user info
  useEffect(() => {
    console.log('Current user:', user?.email);
    console.log('Current user roles:', roles);
    console.log('Can edit:', canEdit);
  }, [user, roles, canEdit]);

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
    if (!canEdit) return;
    
    setClickPosition({ lat, lng });
    setEditingBox(null);
    setIsModalOpen(true);
  };

  const handleMarkerClick = (box: MapBox) => {
    if (canEdit) {
      setEditingBox(box);
      setClickPosition({ lat: box.y_position, lng: box.x_position });
      setIsModalOpen(true);
    } else {
      window.open(box.link_url, '_blank');
    }
  };

  const handleSaveBox = async (boxData: Omit<MapBox, 'id' | 'created_by'>) => {
    try {
      console.log('Attempting to save box with data:', boxData);
      console.log('User roles:', useAuthStore.getState().roles);
      
      if (editingBox) {
        // Update existing box
        const { data, error } = await supabase
          .from('map_boxes')
          .update(boxData)
          .eq('id', editingBox.id)
          .select();

        console.log('Update response:', { data, error });
        if (error) throw error;
      } else {
        // Create new box - ensure created_by is set
        const { user } = useAuthStore.getState();
        const insertData = {
          ...boxData,
          created_by: user?.id
        };
        
        console.log('Inserting with data:', insertData);
        
        // Try with explicit fields that match DB schema
        const dbInsertData = {
          name: boxData.name,
          description: boxData.description,
          link_url: boxData.link_url,
          x_position: boxData.x_position,
          y_position: boxData.y_position,
          width: boxData.width || 0.05,
          height: boxData.height || 0.05,
          color: boxData.color || '#3B82F6',
          is_active: true
        };
        
        console.log('DB Insert data:', dbInsertData);
        const { data, error } = await supabase
          .from('map_boxes')
          .insert([dbInsertData])
          .select();

        console.log('Insert response:', { data, error });
        if (error) throw error;
      }

      fetchMapBoxes();
      setIsModalOpen(false);
      setEditingBox(null);
      setClickPosition(null);
    } catch (error) {
      console.error('Error saving box:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      alert(`Error saving location: ${error.message || 'Please try again.'}`);
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
                    {canEdit && (
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
            <MapClickHandler onMapClick={handleMapClick} canEdit={canEdit} />

            {/* Location Markers */}
            {mapBoxes.map((box) => (
              <Marker
                key={box.id}
                position={[box.y_position, box.x_position]}
                icon={createCustomIcon(box.color, box.name)}
                eventHandlers={{
                  click: () => {
                    if (canEdit) {
                      handleMarkerClick(box);
                    } else {
                      window.open(box.link_url, '_blank');
                    }
                  },
                }}
              >
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
                      {canEdit && (
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkerClick(box);
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
                      )}
                    </div>
                  </div>
                </Popup>
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
    </div>
  );
};

export default LeafletMap;