import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaLink, FaExternalLinkAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../../lib/supabase';
import type { MapBoxData, BoxLink } from './MapBox';

// Link type detection and logos
type LinkType = 'trello' | 'clickup' | 'google_drive' | 'generic';

const LINK_LOGOS: Record<LinkType, string | null> = {
  trello: '/map/trelo_logo.png',
  clickup: '/map/clickup_logo.png',
  google_drive: '/map/google_drive_logo.png',
  generic: null,
};

const detectLinkType = (url: string): LinkType => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('trello.com')) return 'trello';
  if (lowerUrl.includes('clickup.com')) return 'clickup';
  if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com')) return 'google_drive';
  return 'generic';
};

const getLinkTypeName = (type: LinkType): string => {
  switch (type) {
    case 'trello': return 'Trello';
    case 'clickup': return 'ClickUp';
    case 'google_drive': return 'Google Drive';
    default: return 'Link';
  }
};

const BoxInfoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const boxId = searchParams.get('id');

  const [box, setBox] = useState<MapBoxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBox = async () => {
      if (!boxId) {
        setError('No box ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('map_boxes')
          .select('*')
          .eq('id', boxId)
          .eq('is_active', true)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Box not found');

        setBox(data);
      } catch (err) {
        console.error('Error fetching box:', err);
        setError('Box not found');
      } finally {
        setLoading(false);
      }
    };

    fetchBox();
  }, [boxId]);

  // Get all links for a box
  const getBoxLinks = (box: MapBoxData): BoxLink[] => {
    if (box.links && box.links.length > 0) {
      return box.links;
    }
    if (box.link_url) {
      return [{ url: box.link_url, type: detectLinkType(box.link_url) }];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f12] to-[#0a0a0d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#ea2127] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8b8b9a]">Loading box info...</p>
        </div>
      </div>
    );
  }

  if (error || !box) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f12] to-[#0a0a0d] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-[#1a1a1f] border border-[#2a2a35] flex items-center justify-center mx-auto mb-6">
            <FaMapMarkerAlt className="w-8 h-8 text-[#ea2127]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Box Not Found</h1>
          <p className="text-[#8b8b9a] mb-6">
            The box you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/map')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ea2127] hover:bg-[#ff3b42] text-white rounded-xl font-medium transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            Go to Map
          </button>
        </div>
      </div>
    );
  }

  const links = getBoxLinks(box);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f12] to-[#0a0a0d]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f0f12]/95 backdrop-blur-xl border-b border-[#1f1f28]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-2 text-[#8b8b9a] hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Map</span>
          </button>
          <button
            onClick={() => navigate(`/map?box=${box.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1f] hover:bg-[#252530] text-white rounded-xl font-medium transition-colors border border-[#2a2a35]"
          >
            <FaMapMarkerAlt className="w-4 h-4" />
            <span className="hidden sm:inline">View on Map</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Box Header */}
        <div className="flex items-start gap-5 mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-2xl flex-shrink-0"
            style={{
              backgroundColor: box.color,
              boxShadow: `0 8px 32px ${box.color}40`
            }}
          >
            {box.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 pt-2">
            <h1 className="text-3xl font-bold text-white mb-2">{box.name}</h1>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-md"
                style={{ backgroundColor: box.color }}
              />
              <span className="text-sm text-[#6b6b7a] uppercase font-mono">{box.color}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {box.description && (
          <div className="mb-8 p-6 bg-[#141418] border border-[#1f1f28] rounded-2xl">
            <h2 className="text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-3">Description</h2>
            <p className="text-[#b8b8c4] leading-relaxed">{box.description}</p>
          </div>
        )}

        {/* Links */}
        {links.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-4 px-1">
              Links ({links.length})
            </h2>
            <div className="space-y-3">
              {links.map((link, index) => {
                const linkType = link.type || detectLinkType(link.url);
                const logo = LINK_LOGOS[linkType];

                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-[#141418] hover:bg-[#1a1a1f] border border-[#1f1f28] rounded-2xl transition-colors group"
                  >
                    {logo ? (
                      <img src={logo} alt={getLinkTypeName(linkType)} className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#2a2a35] flex items-center justify-center">
                        <FaLink className="w-5 h-5 text-[#6b6b7a]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-medium text-white">{getLinkTypeName(linkType)}</p>
                      <p className="text-sm text-[#5a5a68] truncate">{link.url}</p>
                    </div>
                    <FaExternalLinkAlt className="w-5 h-5 text-[#5a5a68] group-hover:text-white transition-colors flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* No Links Message */}
        {links.length === 0 && !box.description && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#141418] border border-[#1f1f28] flex items-center justify-center mx-auto mb-4">
              <FaLink className="w-7 h-7 text-[#3a3a48]" />
            </div>
            <p className="text-[#6b6b7a]">No additional information available for this box.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#1f1f28] text-center">
          <p className="text-sm text-[#5a5a68]">
            Scanned via QR Code
          </p>
        </div>
      </div>
    </div>
  );
};

export default BoxInfoPage;
