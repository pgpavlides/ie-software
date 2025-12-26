import React, { useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';

export interface MapBoxData {
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

interface MapBoxProps {
  box: MapBoxData;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<MapBoxData>) => void;
  canEdit: boolean;
  selectedTool: 'select' | 'edit';
  imageWidth: number;
  imageHeight: number;
}

const MapBox: React.FC<MapBoxProps> = ({
  box,
  isSelected,
  onSelect,
  onChange,
  canEdit,
  selectedTool,
  imageWidth,
  imageHeight,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);

  // Convert percentage to pixels
  const x = box.x_position * imageWidth;
  const y = box.y_position * imageHeight;
  const width = Math.max(60, box.width * imageWidth);
  const height = Math.max(40, box.height * imageHeight);

  // Calculate text properties
  const fontSize = Math.min(14, Math.max(10, height * 0.3));
  const padding = 8;

  // Truncate text to fit
  const maxChars = Math.floor((width - padding * 2) / (fontSize * 0.6));
  const displayName = box.name.length > maxChars
    ? box.name.substring(0, maxChars - 2) + '..'
    : box.name;

  const handleClick = () => {
    if (selectedTool === 'select') {
      // Open link in select mode
      if (box.link_url) {
        window.open(box.link_url, '_blank');
      }
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

  const handleTransformEnd = (_e: Konva.KonvaEventObject<Event>) => {
    if (!canEdit || selectedTool !== 'edit') return;

    const node = groupRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    const newWidth = Math.max(60, width * scaleX);
    const newHeight = Math.max(40, height * scaleY);
    const newX = Math.max(0, Math.min(node.x(), imageWidth - newWidth));
    const newY = Math.max(0, Math.min(node.y(), imageHeight - newHeight));

    onChange({
      x_position: newX / imageWidth,
      y_position: newY / imageHeight,
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
      onTransformEnd={handleTransformEnd}
      name={box.id}
    >
      {/* Main rectangle */}
      <Rect
        width={width}
        height={height}
        fill={box.color}
        stroke={isSelected ? '#ffffff' : darkenColor(box.color)}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={6}
        shadowColor="black"
        shadowBlur={isSelected ? 15 : 8}
        shadowOpacity={0.4}
        shadowOffsetX={2}
        shadowOffsetY={2}
      />

      {/* Box name label */}
      <Text
        ref={textRef}
        text={displayName}
        x={padding}
        y={(height - fontSize) / 2}
        width={width - padding * 2}
        fontSize={fontSize}
        fontFamily="Outfit, sans-serif"
        fontStyle="600"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        listening={false}
      />

      {/* Edit indicator when selected */}
      {isSelected && canEdit && (
        <Rect
          x={width - 8}
          y={-8}
          width={16}
          height={16}
          fill="#ea2127"
          cornerRadius={8}
          stroke="#ffffff"
          strokeWidth={2}
        />
      )}
    </Group>
  );
};

export default MapBox;
