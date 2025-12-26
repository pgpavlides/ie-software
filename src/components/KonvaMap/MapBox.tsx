import React, { useRef, useEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';

// Link types that can be auto-detected
export type LinkType = 'trello' | 'clickup' | 'google_drive' | 'generic';

export interface BoxLink {
  url: string;
  type: LinkType;
}

export interface MapBoxData {
  id: string;
  name: string;
  description: string | null;
  link_url: string; // Legacy field, kept for backwards compatibility
  links: BoxLink[]; // New multi-link field
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  color: string;
  text_size: number | null; // Custom text size (null = auto)
  is_active: boolean;
  created_by: string;
}

interface MapBoxProps {
  box: MapBoxData;
  isSelected: boolean;
  isViewing: boolean;
  isAnimating?: boolean;
  onSelect: () => void;
  onView: () => void;
  onChange: (attrs: Partial<MapBoxData>) => void;
  canEdit: boolean;
  selectedTool: 'select' | 'edit';
  imageWidth: number;
  imageHeight: number;
}

const MapBox: React.FC<MapBoxProps> = ({
  box,
  isSelected,
  isViewing,
  isAnimating = false,
  onSelect,
  onView,
  onChange,
  canEdit,
  selectedTool,
  imageWidth,
  imageHeight,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const rectRef = useRef<Konva.Rect>(null);
  // Text doesn't need a ref

  // Scale animation for new boxes
  useEffect(() => {
    if (isAnimating && groupRef.current) {
      const group = groupRef.current;
      // Start from scale 0
      group.scaleX(0);
      group.scaleY(0);
      group.opacity(0);

      // Animate to scale 1 with easing
      group.to({
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: 0.35,
        easing: Konva.Easings.EaseOut,
      });
    }
  }, [isAnimating]);

  // Convert percentage to pixels
  const x = box.x_position * imageWidth;
  const y = box.y_position * imageHeight;
  const width = box.width * imageWidth;
  const height = box.height * imageHeight;

  // Calculate size factor for scaling UI elements (based on smaller dimension)
  const minDimension = Math.min(width, height);
  const sizeFactor = Math.max(0.3, Math.min(1, minDimension / 60)); // 0.3 to 1 scale

  // Scale text properties based on box size (or use custom text_size if set)
  // Default to 4px, allow down to 2px for very small boxes
  const fontSize = box.text_size !== null ? box.text_size : 4;
  const padding = Math.max(1, 3 * sizeFactor);

  // Scale border and visual properties
  const baseStrokeWidth = 2 * sizeFactor;
  const cornerRadius = Math.max(2, 6 * sizeFactor);
  const shadowBlur = Math.max(2, 8 * sizeFactor);

  // Always show text - it will scale down with the box

  // Sync rect dimensions and position when box props change
  useEffect(() => {
    if (rectRef.current) {
      // Reset position to (0,0) within group - group handles absolute position
      rectRef.current.x(0);
      rectRef.current.y(0);
      rectRef.current.scaleX(1);
      rectRef.current.scaleY(1);
      rectRef.current.width(width);
      rectRef.current.height(height);
    }
  }, [box.width, box.height, box.x_position, box.y_position, width, height]);

  const handleClick = () => {
    if (selectedTool === 'select') {
      // Open info panel instead of link directly
      onView();
    } else if (selectedTool === 'edit' && canEdit) {
      onSelect();
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!canEdit || selectedTool !== 'edit') return;

    const node = e.target;
    const newX = Math.max(0, Math.min(node.x(), imageWidth - width));
    const newY = Math.max(0, Math.min(node.y(), imageHeight - height));

    onChange({
      x_position: newX / imageWidth,
      y_position: newY / imageHeight,
    });
  };

  const handleTransformEnd = () => {
    if (!canEdit || selectedTool !== 'edit') return;

    const rect = rectRef.current;
    const group = groupRef.current;
    if (!rect || !group) return;

    const scaleX = rect.scaleX();
    const scaleY = rect.scaleY();

    // Calculate new dimensions
    const newWidth = rect.width() * scaleX;
    const newHeight = rect.height() * scaleY;

    // When resizing from corners other than bottom-right, the rect moves within the group
    // We need to account for this offset and apply it to the group position
    const rectX = rect.x();
    const rectY = rect.y();

    // Calculate new group position (group pos + rect offset within group)
    const newGroupX = group.x() + rectX;
    const newGroupY = group.y() + rectY;

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(newGroupX, imageWidth - newWidth));
    const clampedY = Math.max(0, Math.min(newGroupY, imageHeight - newHeight));

    // Reset rect position to (0,0) within group, reset scale, set new dimensions
    rect.x(0);
    rect.y(0);
    rect.scaleX(1);
    rect.scaleY(1);
    rect.width(newWidth);
    rect.height(newHeight);

    // Update group position
    group.x(clampedX);
    group.y(clampedY);

    onChange({
      x_position: clampedX / imageWidth,
      y_position: clampedY / imageHeight,
      width: newWidth / imageWidth,
      height: newHeight / imageHeight,
    });
  };

  // Darken color for border
  const darkenColor = (hex: string, amount: number = 0.3) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable={canEdit && selectedTool === 'edit'}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
    >
      {/* Main rectangle - Transformer attaches to this via id */}
      <Rect
        ref={rectRef}
        id={box.id}
        width={width}
        height={height}
        fill={box.color}
        stroke={isViewing ? '#ea2127' : isSelected ? '#ea2127' : darkenColor(box.color)}
        strokeWidth={isViewing ? Math.max(2, 4 * sizeFactor) : isSelected ? Math.max(2, 3 * sizeFactor) : baseStrokeWidth}
        cornerRadius={cornerRadius}
        shadowColor={isViewing || isSelected ? '#ea2127' : 'black'}
        shadowBlur={isViewing ? Math.max(10, 25 * sizeFactor) : isSelected ? Math.max(8, 20 * sizeFactor) : shadowBlur}
        shadowOpacity={isViewing ? 0.8 : isSelected ? 0.7 : 0.4}
        shadowOffsetX={isViewing || isSelected ? 0 : Math.max(1, 2 * sizeFactor)}
        shadowOffsetY={isViewing || isSelected ? 0 : Math.max(1, 2 * sizeFactor)}
        onTransformEnd={handleTransformEnd}
        perfectDrawEnabled={false}
      />

      {/* Box name label - always visible, scales with box */}
      <Text
        text={box.name}
        x={padding}
        y={padding}
        width={width - padding * 2}
        height={height - padding * 2}
        fontSize={fontSize}
        lineHeight={1.2}
        fontFamily="Outfit, sans-serif"
        fontStyle="600"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        wrap="word"
        listening={false}
      />
    </Group>
  );
};

export default MapBox;
