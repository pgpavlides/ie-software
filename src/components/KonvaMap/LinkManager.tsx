import React, { useState } from 'react';
import { FaPlus, FaTimes, FaLink } from 'react-icons/fa';
import type { BoxLink, LinkType } from './MapBox';

// Logo paths for detected link types
const LINK_LOGOS: Record<LinkType, string | null> = {
  trello: '/map/trelo_logo.png',
  clickup: '/map/clickup_logo.png',
  google_drive: '/map/google_drive_logo.png',
  generic: null,
};

// Detect link type from URL
export const detectLinkType = (url: string): LinkType => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('trello.com')) {
    return 'trello';
  }
  if (lowerUrl.includes('clickup.com') || lowerUrl.includes('app.clickup.com')) {
    return 'clickup';
  }
  if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com')) {
    return 'google_drive';
  }

  return 'generic';
};

// Get display name for link type
const getLinkTypeName = (type: LinkType): string => {
  switch (type) {
    case 'trello': return 'Trello';
    case 'clickup': return 'ClickUp';
    case 'google_drive': return 'Google Drive';
    default: return 'Link';
  }
};

interface LinkManagerProps {
  links: BoxLink[];
  onChange: (links: BoxLink[]) => void;
  isEditing: boolean;
}

const LinkManager: React.FC<LinkManagerProps> = ({ links, onChange, isEditing }) => {
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;

    const url = newLinkUrl.trim();
    const type = detectLinkType(url);

    onChange([...links, { url, type }]);
    setNewLinkUrl('');
  };

  const handleRemoveLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLink();
    }
  };

  // View mode - just display links
  if (!isEditing) {
    if (links.length === 0) {
      return null;
    }

    return (
      <div>
        <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
          Links
        </label>
        <div className="space-y-2">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1f] hover:bg-[#252530] border border-[#2a2a35] rounded-xl transition-all group"
            >
              {LINK_LOGOS[link.type] ? (
                <img
                  src={LINK_LOGOS[link.type]!}
                  alt={getLinkTypeName(link.type)}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <FaLink className="w-5 h-5 text-[#6b6b7a]" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">
                  {getLinkTypeName(link.type)}
                </p>
                <p className="text-[#5a5a68] text-xs truncate">
                  {link.url}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-[#5a5a68] group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Edit mode - manage links
  return (
    <div>
      <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">
        Links
      </label>

      {/* Existing links */}
      {links.length > 0 && (
        <div className="space-y-2 mb-3">
          {links.map((link, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl"
            >
              {LINK_LOGOS[link.type] ? (
                <img
                  src={LINK_LOGOS[link.type]!}
                  alt={getLinkTypeName(link.type)}
                  className="w-5 h-5 object-contain flex-shrink-0"
                />
              ) : (
                <FaLink className="w-4 h-4 text-[#6b6b7a] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{link.url}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveLink(index)}
                className="p-1.5 text-[#6b6b7a] hover:text-[#ea2127] hover:bg-[#ea2127]/10 rounded-lg transition-colors flex-shrink-0"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new link input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={newLinkUrl}
          onChange={(e) => setNewLinkUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste link URL..."
          className="flex-1 px-4 py-2.5 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white text-sm placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
        />
        <button
          type="button"
          onClick={handleAddLink}
          disabled={!newLinkUrl.trim()}
          className="px-3 py-2.5 bg-[#ea2127] hover:bg-[#d11920] disabled:bg-[#2a2a35] disabled:text-[#5a5a68] text-white rounded-xl transition-colors flex-shrink-0"
        >
          <FaPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Helper text */}
      <p className="mt-2 text-xs text-[#5a5a68]">
        Trello, ClickUp, and Google Drive links are auto-detected
      </p>
    </div>
  );
};

export default LinkManager;
