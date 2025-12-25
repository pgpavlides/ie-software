import React, { useState, useEffect, useRef } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

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
  position: { x: number; y: number } | null;
  mapRect?: DOMRect | null;
}

const BoxModal: React.FC<BoxModalProps> = ({ isOpen, onClose, onSave, editingBox, position, mapRect }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [width, setWidth] = useState(0.02);
  const [height, setHeight] = useState(0.02);

  useEffect(() => {
    if (editingBox) {
      setName(editingBox.name);
      setDescription(editingBox.description || '');
      setLinkUrl(editingBox.link_url);
      setColor(editingBox.color);
      setWidth(editingBox.width);
      setHeight(editingBox.height);
    } else {
      setName('');
      setDescription('');
      setLinkUrl('');
      setColor('#3B82F6');
      setWidth(0.02);
      setHeight(0.02);
    }
  }, [editingBox, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !linkUrl || !position) return;

    onSave({
      name,
      description: description || null,
      link_url: linkUrl,
      x_position: position.x,
      y_position: position.y,
      width,
      height,
      color,
      is_active: true
    });
    onClose();
  };

  if (!isOpen) return null;

  const getModalPosition = () => {
    if (!position || !mapRect) {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    }
    
    const modalWidth = 384; // w-96 = 24rem = 384px
    const modalHeight = 500; // approximate height
    
    let left = mapRect.left + (position.x * mapRect.width);
    let top = mapRect.top + (position.y * mapRect.height);
    
    // Adjust if modal would go off screen
    if (left + modalWidth > window.innerWidth) {
      left = window.innerWidth - modalWidth - 20;
    }
    if (left < 20) {
      left = 20;
    }
    if (top + modalHeight > window.innerHeight) {
      top = window.innerHeight - modalHeight - 20;
    }
    if (top < 20) {
      top = 20;
    }
    
    return { left: `${left}px`, top: `${top}px` };
  };

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: isOpen ? 'auto' : 'none', backgroundColor: 'transparent' }}>
      <div 
        className="absolute bg-white rounded-lg p-6 w-96 shadow-xl border border-gray-200"
        style={{
          ...getModalPosition(),
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'none' : 'scale(0.95)',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <h2 className="text-xl font-bold mb-4">
          {editingBox ? 'Edit Box' : 'Add New Box'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Link URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {editingBox ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MapPage: React.FC = () => {
  const [mapBoxes, setMapBoxes] = useState<MapBox[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<MapBox | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [mapRect, setMapRect] = useState<DOMRect | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [draggedBox, setDraggedBox] = useState<string | null>(null);
  const [resizingBox, setResizingBox] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showListView, setShowListView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const { hasRole } = useAuthStore();

  const canEdit = hasRole('Admin') || hasRole('Architect') || hasRole('Project Manager');

  // Filter boxes based on search query
  const filteredBoxes = mapBoxes.filter(box => 
    box.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    box.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    box.link_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchMapBoxes();
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = async () => {
      if (draggedBox || resizingBox) {
        // Save changes to database
        const boxToUpdate = mapBoxes.find(box => box.id === (draggedBox || resizingBox));
        if (boxToUpdate) {
          try {
            const { error } = await supabase
              .from('map_boxes')
              .update({
                x_position: boxToUpdate.x_position,
                y_position: boxToUpdate.y_position,
                width: boxToUpdate.width,
                height: boxToUpdate.height
              })
              .eq('id', boxToUpdate.id);

            if (error) throw error;
          } catch (error) {
            console.error('Error updating box:', error);
            // Revert changes on error
            fetchMapBoxes();
          }
        }

        setDraggedBox(null);
        setResizingBox(null);
        setDragOffset({ x: 0, y: 0 });
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!editingBoxId || !canEdit) return;

      const mapElement = mapRef.current;
      if (!mapElement) return;

      // Get fresh rect in case window was resized
      const rect = mapElement.getBoundingClientRect();

      if (draggedBox) {
        // Handle dragging
        const newX = (e.clientX - rect.left - dragOffset.x) / rect.width;
        const newY = (e.clientY - rect.top - dragOffset.y) / rect.height;

        // Constrain to map boundaries
        const constrainedX = Math.max(0, Math.min(1, newX));
        const constrainedY = Math.max(0, Math.min(1, newY));

        // Update box position immediately for smooth dragging
        setMapBoxes(prev =>
          prev.map(box =>
            box.id === draggedBox
              ? { ...box, x_position: constrainedX, y_position: constrainedY }
              : box
          )
        );
      } else if (resizingBox) {
        // Handle resizing
        const box = mapBoxes.find(b => b.id === resizingBox);
        if (!box) return;

        const mouseX = (e.clientX - rect.left) / rect.width;
        const mouseY = (e.clientY - rect.top) / rect.height;

        // Calculate new size based on distance from box center
        const newWidth = Math.abs(mouseX - box.x_position) * 2;
        const newHeight = Math.abs(mouseY - box.y_position) * 2;

        // Constrain size (minimum 1% of map, maximum 20%)
        const constrainedWidth = Math.max(0.01, Math.min(0.2, newWidth));
        const constrainedHeight = Math.max(0.01, Math.min(0.2, newHeight));

        // Update box size immediately for smooth resizing
        setMapBoxes(prev =>
          prev.map(b =>
            b.id === resizingBox
              ? { ...b, width: constrainedWidth, height: constrainedHeight }
              : b
          )
        );
      }
    };

    if (draggedBox || resizingBox) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [draggedBox, resizingBox, editingBoxId, canEdit, dragOffset, mapBoxes]);

  useEffect(() => {
    const handleWindowResize = () => {
      // When window resizes during drag operations, the coordinate system changes
      // The getBoundingClientRect() in handleGlobalMouseMove will automatically 
      // adjust to the new window size, so no action needed here
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
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

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canEdit || editingBoxId) return; // Don't allow adding boxes when in edit mode

    const mapElement = mapRef.current;
    if (!mapElement) return;

    const rect = mapElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setClickPosition({ x, y });
    setMapRect(rect);
    setEditingBox(null);
    setIsModalOpen(true);
  };

  const handleBoxClick = (e: React.MouseEvent, box: MapBox) => {
    e.stopPropagation();
    
    if (editingBoxId === box.id && canEdit) {
      // In individual edit mode, don't open links
      return;
    }
    
    // Single click to follow link (only when not in individual edit mode)
    if (!editingBoxId) {
      window.open(box.link_url, '_blank');
    }
  };

  const handleEditClick = (e: React.MouseEvent, box: MapBox) => {
    e.stopPropagation();
    setEditingBoxId(editingBoxId === box.id ? null : box.id);
  };

  const handleEditPropertiesClick = (e: React.MouseEvent, box: MapBox) => {
    e.stopPropagation();
    const mapElement = mapRef.current;
    if (mapElement) {
      const rect = mapElement.getBoundingClientRect();
      setMapRect(rect);
    }
    setEditingBox(box);
    setClickPosition({ x: box.x_position, y: box.y_position });
    setIsModalOpen(true);
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
        // Create new box
        const { error } = await supabase
          .from('map_boxes')
          .insert([boxData]);

        if (error) throw error;
      }

      fetchMapBoxes();
    } catch (error) {
      console.error('Error saving box:', error);
      alert('Error saving box. Please try again.');
    }
  };

  const handleDeleteBox = async (boxId: string) => {
    if (!confirm('Are you sure you want to delete this box?')) return;

    try {
      const { error } = await supabase
        .from('map_boxes')
        .update({ is_active: false })
        .eq('id', boxId);

      if (error) throw error;
      fetchMapBoxes();
    } catch (error) {
      console.error('Error deleting box:', error);
      alert('Error deleting box. Please try again.');
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
    <div className="p-6 relative">
      {/* Edit Mode Indicator */}
      {editingBoxId && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 font-medium">
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span>IN EDIT MODE</span>
          </span>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Company Map</h1>
          <button
            onClick={() => setShowListView(!showListView)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <span>{showListView ? '🗺️ Map View' : '📋 List View'}</span>
          </button>
        </div>
        {canEdit && (
          <p className="text-gray-600 mt-2">
            {editingBoxId 
              ? "Edit mode active - drag to move, use handles to resize, or click pencil to exit."
              : "Click on the map to add a box. Use the pencil icon to edit boxes."
            }
          </p>
        )}
      </div>

      {showListView ? (
        /* List View */
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                All Boxes ({filteredBoxes.length})
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search boxes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute left-3 top-2.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            {filteredBoxes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {searchQuery ? 'No boxes match your search.' : 'No boxes created yet.'}
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
                        className="w-8 h-8 rounded-md border-2 border-white shadow-sm"
                        style={{ backgroundColor: box.color }}
                      />
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
                          onClick={() => handleEditPropertiesClick({ stopPropagation: () => {} } as any, box)}
                          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Edit properties"
                        >
                          <FaPencilAlt />
                        </button>
                        <button
                          onClick={() => handleDeleteBox(box.id)}
                          className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete box"
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
        <div className="relative inline-block max-w-full">
          <div
            ref={mapRef}
            className="relative cursor-pointer"
            onClick={handleMapClick}
            style={{ display: 'inline-block' }}
          >
            <img
              src="/company_map.png"
              alt="Company Map"
              className="max-w-full h-auto border border-gray-300 rounded-lg shadow-lg"
              draggable={false}
            />
            
            {mapBoxes.map((box) => (
            <div
              key={box.id}
              className={`absolute group transition-all duration-200 hover:z-10 ${
                editingBoxId === box.id 
                  ? 'cursor-move border-dashed hover:scale-105' 
                  : 'cursor-pointer hover:scale-110'
              } ${
                draggedBox === box.id ? 'scale-105 shadow-lg' : ''
              } ${
                resizingBox === box.id ? 'shadow-lg' : ''
              }`}
              style={{
                left: `${box.x_position * 100}%`,
                top: `${box.y_position * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
                backgroundColor: box.color,
                border: editingBoxId === box.id 
                  ? '2px dashed rgba(59, 130, 246, 0.8)' 
                  : '2px solid rgba(255,255,255,0.9)',
                borderRadius: '6px',
                transform: 'translate(-50%, -50%)',
                opacity: editingBoxId === box.id ? 0.9 : 0.85,
                minWidth: '20px',
                minHeight: '20px',
                boxShadow: editingBoxId === box.id 
                  ? '0 4px 8px rgba(0,0,0,0.3)' 
                  : '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: draggedBox === box.id || resizingBox === box.id ? 10 : 1,
                userSelect: 'none'
              }}
              onClick={(e) => handleBoxClick(e, box)}
              onMouseDown={(e) => {
                if (editingBoxId === box.id && canEdit && e.button === 0) {
                  e.preventDefault();
                  const mapElement = mapRef.current;
                  if (!mapElement) return;
                  
                  const rect = mapElement.getBoundingClientRect();
                  const offsetX = e.clientX - rect.left - (box.x_position * rect.width);
                  const offsetY = e.clientY - rect.top - (box.y_position * rect.height);
                  
                  setDraggedBox(box.id);
                  setDragOffset({ x: offsetX, y: offsetY });
                }
              }}
              title={editingBoxId === box.id ? `${box.name} (Edit Mode)` : box.description || box.name}
            >
              {canEdit && (
                <>
                  <button
                    className="absolute -top-6 -right-6 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBox(box.id);
                    }}
                    title="Delete box"
                  >
                    ×
                  </button>
                  <button
                    className={`absolute -top-6 -right-12 w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10 ${
                      editingBoxId === box.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-600 text-white'
                    }`}
                    onClick={(e) => handleEditClick(e, box)}
                    title={editingBoxId === box.id ? "Exit edit mode" : "Enter edit mode"}
                  >
                    <FaPencilAlt className="text-xs" />
                  </button>
                  {editingBoxId === box.id && (
                    <button
                      className="absolute -top-6 -right-18 w-5 h-5 bg-green-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10"
                      onClick={(e) => handleEditPropertiesClick(e, box)}
                      title="Edit properties"
                    >
                      ⚙
                    </button>
                  )}
                </>
              )}
              
              {/* Resize handles - only show when this specific box is being edited */}
              {editingBoxId === box.id && canEdit && (
                <>
                  {/* Corner resize handles */}
                  <div
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-se-resize opacity-80 hover:opacity-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setResizingBox(box.id);
                    }}
                    title="Resize"
                  />
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-ne-resize opacity-80 hover:opacity-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setResizingBox(box.id);
                    }}
                  />
                  <div
                    className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-sw-resize opacity-80 hover:opacity-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setResizingBox(box.id);
                    }}
                  />
                  <div
                    className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nw-resize opacity-80 hover:opacity-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setResizingBox(box.id);
                    }}
                  />
                </>
              )}
              
              {/* Box title in the center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-black font-medium text-sm text-center px-1 leading-tight" style={{
                  fontSize: `${Math.min(box.width * 800, box.height * 800, 14)}px`,
                  textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {box.name}
                </span>
              </div>
              
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 text-gray-900 text-xs px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {box.name}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      <BoxModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBox(null);
          setClickPosition(null);
          setMapRect(null);
        }}
        onSave={handleSaveBox}
        editingBox={editingBox}
        position={clickPosition}
        mapRect={mapRect}
      />
    </div>
  );
};

export default MapPage;