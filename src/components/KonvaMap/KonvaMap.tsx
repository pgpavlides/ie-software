import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Image, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import supabase from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import MapBox, { type MapBoxData } from './MapBox';
import BoxModal from './BoxModal';
import BoxInfoPanel from './BoxInfoPanel';
import MapToolbar from './MapToolbar';
import ListView from './ListView';

const KonvaMap: React.FC = () => {
  // State
  const [mapBoxes, setMapBoxes] = useState<MapBoxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [viewingBox, setViewingBox] = useState<MapBoxData | null>(null);
  const [selectedTool, setSelectedTool] = useState<'select' | 'edit'>('select');
  const [showListView, setShowListView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<MapBoxData | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isMobile, setIsMobile] = useState(false);

  // Placement mode state
  const [isPlacingBox, setIsPlacingBox] = useState(false);
  const [newBoxPosition, setNewBoxPosition] = useState<{ x: number; y: number } | null>(null);
  const [animatingBoxId, setAnimatingBoxId] = useState<string | null>(null);

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });

  // Touch gesture state
  const lastTouchDistanceRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Pending changes state (tracks unsaved modifications)
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<MapBoxData>>>({});
  // Original data before editing (for cancel/revert)
  const [originalBoxData, setOriginalBoxData] = useState<Record<string, MapBoxData>>({});

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const pendingLocateBoxRef = useRef<MapBoxData | null>(null);

  // Auth
  const { hasRole, user } = useAuthStore();
  const canEdit = hasRole('Super Admin') || hasRole('Boss') ||
                  hasRole('Admin') || hasRole('Architect') ||
                  hasRole('Project Manager') || hasRole('Head Project Manager') ||
                  hasRole('CNC');

  // Load background image (compressed webp for faster loading)
  const [backgroundImage] = useImage('/company_map_compressed_2.webp');
  const imageWidth = backgroundImage?.width || 1920;
  const imageHeight = backgroundImage?.height || 1080;

  // Calculate scale to fit image in container while maintaining aspect ratio
  const scale = Math.min(
    stageSize.width / imageWidth,
    stageSize.height / imageHeight
  );
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const offsetX = (stageSize.width - scaledWidth) / 2;
  const offsetY = (stageSize.height - scaledHeight) / 2;

  // Handle resize with ResizeObserver for reliable sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        // Only update if we have valid dimensions
        if (offsetWidth > 0 && offsetHeight > 0) {
          setStageSize({
            width: offsetWidth,
            height: offsetHeight,
          });
        }
      }
      setIsMobile(window.innerWidth < 768);
    };

    // Initial calculation with slight delay to ensure layout is ready
    handleResize();
    const initialTimeout = setTimeout(handleResize, 100);

    // Use ResizeObserver for reliable container size tracking
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(initialTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch boxes from Supabase
  const fetchBoxes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('map_boxes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMapBoxes(data || []);
    } catch (error) {
      console.error('Error fetching boxes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoxes();
  }, [fetchBoxes]);

  // Handle URL query parameter for direct box linking (QR code scans)
  useEffect(() => {
    if (mapBoxes.length === 0 || loading) return;

    const urlParams = new URLSearchParams(window.location.search);
    const boxId = urlParams.get('box');

    if (boxId) {
      const box = mapBoxes.find(b => b.id === boxId);
      if (box) {
        // Use the locate function to center on the box
        pendingLocateBoxRef.current = box;
        setShowListView(false);
      }

      // Clear the URL parameter to avoid re-triggering
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [mapBoxes, loading]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      if (selectedBoxId && selectedTool === 'edit' && canEdit) {
        const selectedNode = stageRef.current.findOne(`#${selectedBoxId}`);
        if (selectedNode) {
          transformerRef.current.nodes([selectedNode]);
          transformerRef.current.getLayer()?.batchDraw();
        }
      } else {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedBoxId, selectedTool, canEdit]);

  // Handle stage click (deselect or place box)
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage() ||
                          e.target.getClassName() === 'Image';

    if (isPlacingBox && clickedOnEmpty) {
      // Get click position relative to the scaled image
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Convert screen coordinates to image coordinates
      const imageX = (pointer.x - stagePosition.x) / zoomLevel - offsetX;
      const imageY = (pointer.y - stagePosition.y) / zoomLevel - offsetY;

      // Convert to percentage of image
      const xPercent = Math.max(0, Math.min(0.85, imageX / scaledWidth));
      const yPercent = Math.max(0, Math.min(0.92, imageY / scaledHeight));

      // Create box immediately with default values
      handleCreateBoxAtPosition(xPercent, yPercent);
      setIsPlacingBox(false);
      return;
    }

    if (clickedOnEmpty) {
      setSelectedBoxId(null);
    }
  };

  // Handle box change (drag/resize) - stores locally, doesn't save immediately
  const handleBoxChange = (boxId: string, attrs: Partial<MapBoxData>) => {
    // Store original data before first change (for cancel/revert)
    setOriginalBoxData(prev => {
      if (!prev[boxId]) {
        const originalBox = mapBoxes.find(b => b.id === boxId);
        if (originalBox) {
          return { ...prev, [boxId]: { ...originalBox } };
        }
      }
      return prev;
    });

    // Update local state for immediate visual feedback
    setMapBoxes(prev =>
      prev.map(box => box.id === boxId ? { ...box, ...attrs } : box)
    );

    // Track pending changes
    setPendingChanges(prev => ({
      ...prev,
      [boxId]: { ...prev[boxId], ...attrs }
    }));
  };

  // Save all pending changes to database
  const handleSaveChanges = async () => {
    try {
      const updates = Object.entries(pendingChanges).map(([boxId, attrs]) =>
        supabase
          .from('map_boxes')
          .update(attrs)
          .eq('id', boxId)
      );

      await Promise.all(updates);
      setPendingChanges({}); // Clear pending changes after successful save
      setOriginalBoxData({}); // Clear original data after save
      setEditingBox(null); // Exit edit mode after saving
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  // Cancel all pending changes and revert to original data
  const handleCancelChanges = () => {
    // Restore original box data
    setMapBoxes(prev =>
      prev.map(box => {
        if (originalBoxData[box.id]) {
          return originalBoxData[box.id];
        }
        return box;
      })
    );

    // Also update viewingBox if it was modified
    if (viewingBox && originalBoxData[viewingBox.id]) {
      setViewingBox(originalBoxData[viewingBox.id]);
    }

    // Clear all tracking state
    setPendingChanges({});
    setOriginalBoxData({});
    setEditingBox(null);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  // Handle save (create/update)
  const handleSaveBox = async (data: Omit<MapBoxData, 'id' | 'created_by' | 'is_active'>) => {
    try {
      if (editingBox) {
        // Update existing
        const { error } = await supabase
          .from('map_boxes')
          .update(data)
          .eq('id', editingBox.id);

        if (error) throw error;
      } else {
        // Create new
        const { data: newBox, error } = await supabase
          .from('map_boxes')
          .insert([{
            ...data,
            is_active: true,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (error) throw error;

        // Trigger animation for new box
        if (newBox) {
          setAnimatingBoxId(newBox.id);
          setTimeout(() => setAnimatingBoxId(null), 400); // Animation duration
        }
      }

      await fetchBoxes();
      setEditingBox(null);
      setNewBoxPosition(null);
    } catch (error) {
      console.error('Error saving box:', error);
    }
  };

  // Handle delete
  const handleDeleteBox = async (box: MapBoxData) => {
    try {
      const { error } = await supabase
        .from('map_boxes')
        .update({ is_active: false })
        .eq('id', box.id);

      if (error) throw error;

      setMapBoxes(prev => prev.filter(b => b.id !== box.id));
      setSelectedBoxId(null);
      setEditingBox(null);
    } catch (error) {
      console.error('Error deleting box:', error);
    }
  };

  // Save box directly from list view
  const handleSaveBoxFromList = async (box: MapBoxData) => {
    try {
      const { error } = await supabase
        .from('map_boxes')
        .update({
          name: box.name,
          description: box.description,
          color: box.color,
          links: box.links,
        })
        .eq('id', box.id);

      if (error) throw error;

      // Update local state
      setMapBoxes(prev => prev.map(b => b.id === box.id ? box : b));
    } catch (error) {
      console.error('Error saving box:', error);
    }
  };

  // Locate box on map (switch to map view and center on box)
  const handleLocateBox = (box: MapBoxData) => {
    // Store the box to locate after view switches
    pendingLocateBoxRef.current = box;
    // Switch to map view
    setShowListView(false);
  };

  // Effect to center on box after switching to map view
  useEffect(() => {
    if (!showListView && pendingLocateBoxRef.current && backgroundImage && stageSize.width > 0) {
      const box = pendingLocateBoxRef.current;
      pendingLocateBoxRef.current = null; // Clear the ref

      // Calculate box center in stage coordinates (using scaledWidth/Height + offset)
      const boxCenterX = (box.x_position + box.width / 2) * scaledWidth + offsetX;
      const boxCenterY = (box.y_position + box.height / 2) * scaledHeight + offsetY;

      // Calculate stage position to center the box on screen
      const newX = stageSize.width / 2 - boxCenterX * zoomLevel;
      const newY = stageSize.height / 2 - boxCenterY * zoomLevel;

      setStagePosition({ x: newX, y: newY });
      setSelectedBoxId(box.id);
      setViewingBox(box);
    }
  }, [showListView, backgroundImage, stageSize, zoomLevel, scaledWidth, scaledHeight, offsetX, offsetY]);

  // Enter placement mode for adding new box
  const handleAddBox = () => {
    setEditingBox(null);
    setNewBoxPosition(null);
    setIsPlacingBox(true);
  };

  // Cancel placement mode
  const handleCancelPlacement = () => {
    setIsPlacingBox(false);
    setNewBoxPosition(null);
  };

  // Create box immediately at clicked position
  const handleCreateBoxAtPosition = async (xPercent: number, yPercent: number) => {
    try {
      const newBoxData = {
        name: 'New Box',
        description: null,
        link_url: '',
        links: [],
        x_position: xPercent,
        y_position: yPercent,
        width: 0.06,
        height: 0.03,
        color: '#ea2127',
        text_size: null,
        is_active: true,
        created_by: user?.id,
      };

      const { data: newBox, error } = await supabase
        .from('map_boxes')
        .insert([newBoxData])
        .select()
        .single();

      if (error) throw error;

      if (newBox) {
        // Add to local state immediately
        setMapBoxes(prev => [...prev, newBox]);

        // Trigger animation
        setAnimatingBoxId(newBox.id);
        setTimeout(() => setAnimatingBoxId(null), 400);

        // Open side panel for editing (with slight delay for animation)
        setTimeout(() => {
          setViewingBox(newBox);
          setEditingBox(newBox);
        }, 150);
      }
    } catch (error) {
      console.error('Error creating box:', error);
    }
  };

  // Open modal to edit box
  const handleEditBox = (box: MapBoxData) => {
    setEditingBox(box);
    setIsModalOpen(true);
  };

  // Double-click to edit (opens side panel in edit mode)
  const handleBoxDoubleClick = (boxId: string) => {
    const box = mapBoxes.find(b => b.id === boxId);
    if (box && canEdit && selectedTool === 'edit') {
      setViewingBox(box);
      setEditingBox(box);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setStagePosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = zoomLevel;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
    const clampedScale = Math.max(0.5, Math.min(5, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setZoomLevel(clampedScale);
    setStagePosition(newPos);
  };

  // Calculate distance between two touch points
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center point between two touches
  const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // Handle touch start
  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length === 2) {
      // Start pinch gesture
      e.evt.preventDefault();
      lastTouchDistanceRef.current = getTouchDistance(touches);
      lastTouchCenterRef.current = getTouchCenter(touches);
      isDraggingRef.current = false;
    } else if (touches.length === 1) {
      isDraggingRef.current = true;
    }
  };

  // Handle touch move (pinch-to-zoom + pan)
  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;

    if (touches.length === 2) {
      // Pinch gesture for zoom - only update stage directly, sync state on touch end
      e.evt.preventDefault();

      const newDistance = getTouchDistance(touches);
      const newCenter = getTouchCenter(touches);

      if (lastTouchDistanceRef.current && lastTouchCenterRef.current) {
        // Calculate zoom based on current stage scale (not React state)
        const currentScale = stage.scaleX();
        const scale = newDistance / lastTouchDistanceRef.current;
        const newScale = Math.max(0.5, Math.min(5, currentScale * scale));

        // Get stage container position
        const container = stage.container();
        const rect = container.getBoundingClientRect();

        // Calculate pinch center relative to stage
        const pinchCenterX = newCenter.x - rect.left;
        const pinchCenterY = newCenter.y - rect.top;

        // Calculate new position to zoom towards pinch center
        const currentPos = stage.position();
        const mousePointTo = {
          x: (pinchCenterX - currentPos.x) / currentScale,
          y: (pinchCenterY - currentPos.y) / currentScale,
        };

        // Also handle pan during pinch
        const dx = newCenter.x - lastTouchCenterRef.current.x;
        const dy = newCenter.y - lastTouchCenterRef.current.y;

        const newPos = {
          x: pinchCenterX - mousePointTo.x * newScale + dx,
          y: pinchCenterY - mousePointTo.y * newScale + dy,
        };

        // Only update stage directly (no React state) for smooth 60fps animation
        stage.position(newPos);
        stage.scale({ x: newScale, y: newScale });
        stage.batchDraw();
      }

      lastTouchDistanceRef.current = newDistance;
      lastTouchCenterRef.current = newCenter;
    }
  };

  // Handle touch end - sync React state with stage position/scale
  const handleTouchEnd = () => {
    const stage = stageRef.current;
    if (stage && lastTouchDistanceRef.current !== null) {
      // Sync React state with final stage position/scale
      setZoomLevel(stage.scaleX());
      setStagePosition(stage.position());
    }
    lastTouchDistanceRef.current = null;
    lastTouchCenterRef.current = null;
    isDraggingRef.current = false;
  };

  // Handle stage drag for panning (optimized - only update state on drag end)
  const handleStageDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Let Konva handle the visual update, don't update React state on every move
    // This prevents lag by reducing re-renders
  };

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      // Only sync state when drag ends
      setStagePosition({
        x: e.target.x(),
        y: e.target.y(),
      });
    }
  };

  return (
    <div className="h-full w-full relative flex flex-col bg-[#0f0f12]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#1f1f28]">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-[#ea2127] rounded-full" />
          <div>
            <h1 className="text-xl font-bold text-white">Map</h1>
            <p className="text-sm text-[#6b6b7a]">Manage locations and areas</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#ea2127] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#6b6b7a]">Loading map...</p>
            </div>
          </div>
        ) : showListView ? (
          <ListView
            boxes={mapBoxes}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onEditBox={handleEditBox}
            onSaveBox={handleSaveBoxFromList}
            onDeleteBox={handleDeleteBox}
            onLocateBox={handleLocateBox}
            canEdit={canEdit}
          />
        ) : (
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onClick={handleStageClick}
            onTap={handleStageClick}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            scaleX={zoomLevel}
            scaleY={zoomLevel}
            x={stagePosition.x}
            y={stagePosition.y}
            draggable={true}
            onDragMove={handleStageDragMove}
            onDragEnd={handleStageDragEnd}
          >
            {/* Background layer - optimized for performance */}
            <Layer listening={false} perfectDrawEnabled={false}>
              {backgroundImage && (
                <Image
                  image={backgroundImage}
                  x={offsetX}
                  y={offsetY}
                  width={scaledWidth}
                  height={scaledHeight}
                  perfectDrawEnabled={false}
                  listening={false}
                />
              )}
            </Layer>

            {/* Boxes layer */}
            <Layer x={offsetX} y={offsetY}>
              {mapBoxes.map((box) => (
                <MapBox
                  key={box.id}
                  box={box}
                  isSelected={selectedBoxId === box.id}
                  isViewing={viewingBox?.id === box.id}
                  isAnimating={animatingBoxId === box.id}
                  onSelect={() => {
                    setSelectedBoxId(box.id);
                    setViewingBox(box); // Also show info panel when selecting in edit mode
                    if (canEdit && selectedTool === 'edit') {
                      // Double-click detection
                      const now = Date.now();
                      const lastClick = (box as any)._lastClick || 0;
                      if (now - lastClick < 300) {
                        handleBoxDoubleClick(box.id);
                      }
                      (box as any)._lastClick = now;
                    }
                  }}
                  onView={() => {
                    // If currently editing a different box, revert and switch to this one
                    if (editingBox && editingBox.id !== box.id) {
                      // Restore original data for old box
                      if (originalBoxData[editingBox.id]) {
                        setMapBoxes(prev =>
                          prev.map(b => b.id === editingBox.id ? originalBoxData[editingBox.id] : b)
                        );
                        // Remove from tracking
                        setPendingChanges(prev => {
                          const { [editingBox.id]: _, ...rest } = prev;
                          return rest;
                        });
                        setOriginalBoxData(prev => {
                          const { [editingBox.id]: _, ...rest } = prev;
                          return rest;
                        });
                      }
                      setEditingBox(box);
                    }
                    setViewingBox(box);
                    setSelectedBoxId(null); // Clear edit selection when viewing
                  }}
                  onChange={(attrs) => handleBoxChange(box.id, attrs)}
                  canEdit={canEdit}
                  selectedTool={selectedTool}
                  imageWidth={scaledWidth}
                  imageHeight={scaledHeight}
                />
              ))}

              {/* Transformer for resize handles */}
              <Transformer
                ref={transformerRef}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                anchorSize={isMobile ? 20 : 12}
                anchorCornerRadius={isMobile ? 10 : 6}
                anchorFill="#ea2127"
                anchorStroke="#ffffff"
                anchorStrokeWidth={2}
                borderStroke="#ea2127"
                borderStrokeWidth={2}
                borderDash={[4, 4]}
                rotateEnabled={false}
                keepRatio={false}
              />
            </Layer>
          </Stage>
        )}

        {/* Zoom Controls */}
        {!showListView && (
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 items-center">
            <div className="flex flex-col bg-[#141418]/95 backdrop-blur-xl border border-[#2a2a35] rounded-xl shadow-lg overflow-hidden w-14">
              <button
                onClick={handleZoomIn}
                className="w-full p-3 text-white hover:bg-[#2a2a35] transition-colors border-b border-[#2a2a35] flex items-center justify-center"
                title="Zoom in"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={handleZoomOut}
                className="w-full p-3 text-white hover:bg-[#2a2a35] transition-colors border-b border-[#2a2a35] flex items-center justify-center"
                title="Zoom out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={handleResetZoom}
                className="w-full p-3 text-white hover:bg-[#2a2a35] transition-colors flex items-center justify-center"
                title="Reset zoom"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
            <div className="bg-[#141418]/95 backdrop-blur-xl border border-[#2a2a35] rounded-xl px-3 py-2 text-center w-14">
              <span className="text-xs text-[#8b8b9a]">{Math.round(zoomLevel * 100)}%</span>
            </div>
          </div>
        )}

        {/* Placement Mode Notification */}
        {isPlacingBox && (
          <div className="absolute top-4 left-0 right-0 z-30 flex justify-center">
            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-2xl shadow-2xl shadow-[#10b981]/30 animate-[fadeIn_0.2s_ease-out]">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-medium">Click anywhere to place a box</span>
              <button
                onClick={handleCancelPlacement}
                className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Toolbar - always rendered at the bottom */}
        <MapToolbar
          canEdit={canEdit}
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          onAddBox={handleAddBox}
          showListView={showListView}
          onToggleView={() => {
            const newShowListView = !showListView;
            if (newShowListView) {
              // Close side panel when switching to list view
              setViewingBox(null);
              setEditingBox(null);
            }
            setShowListView(newShowListView);
          }}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSaveChanges}
          onCancel={handleCancelChanges}
        />
      </div>

      {/* Info Panel - slides from right */}
      <BoxInfoPanel
        box={viewingBox}
        isOpen={viewingBox !== null}
        isEditing={editingBox !== null && viewingBox?.id === editingBox?.id}
        onClose={() => {
          setViewingBox(null);
          setEditingBox(null);
        }}
        onEdit={(box) => {
          setEditingBox(box);
        }}
        onDelete={(box) => {
          setViewingBox(null);
          setEditingBox(null);
          handleDeleteBox(box);
        }}
        onChange={(boxId, attrs) => {
          handleBoxChange(boxId, attrs);
          // Update viewingBox to reflect changes immediately
          if (viewingBox && viewingBox.id === boxId) {
            setViewingBox({ ...viewingBox, ...attrs });
          }
        }}
        onCancelEdit={() => {
          // Revert this box to original data and exit edit mode
          if (editingBox && originalBoxData[editingBox.id]) {
            // Restore original box data
            setMapBoxes(prev =>
              prev.map(box => box.id === editingBox.id ? originalBoxData[editingBox.id] : box)
            );
            // Update viewingBox
            setViewingBox(originalBoxData[editingBox.id]);
            // Remove from tracking
            setPendingChanges(prev => {
              const { [editingBox.id]: _, ...rest } = prev;
              return rest;
            });
            setOriginalBoxData(prev => {
              const { [editingBox.id]: _, ...rest } = prev;
              return rest;
            });
          }
          setEditingBox(null);
        }}
        canEdit={canEdit}
      />

      {/* Modal */}
      <BoxModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBox(null);
          setNewBoxPosition(null);
        }}
        onSave={handleSaveBox}
        onDelete={editingBox ? () => handleDeleteBox(editingBox) : undefined}
        editingBox={editingBox}
        defaultPosition={newBoxPosition || { x: 0.1, y: 0.1 }}
      />
    </div>
  );
};

export default KonvaMap;
