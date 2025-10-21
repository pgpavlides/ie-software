import { useState, useRef, useEffect } from 'react';
import { getCityWithRooms, type CityData, type RoomEntry } from '../services/supabaseQueries';

interface RoomDetailsProps {
  cityName: string;
  escapeRoomTypeId: string;
  onBack: () => void;
  onSelectRoom: (roomName: string) => void;
}

export default function RoomDetails({ cityName, escapeRoomTypeId, onBack, onSelectRoom }: RoomDetailsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const roomGridRef = useRef<HTMLDivElement>(null);
  const [city, setCity] = useState<CityData | null>(null);
  const [filteredRooms, setFilteredRooms] = useState<RoomEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch city data on mount
  useEffect(() => {
    async function fetchCity() {
      setLoading(true);
      const cityData = await getCityWithRooms(cityName, escapeRoomTypeId);
      setCity(cityData);
      setLoading(false);
    }
    fetchCity();
  }, [cityName, escapeRoomTypeId]);

  // Auto-focus search input when data is loaded
  useEffect(() => {
    if (!loading && city) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, city]);

  // Add global keyboard shortcut for back navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Backspace') {
        e.preventDefault();
        onBack();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onBack]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Filter rooms based on search query
  useEffect(() => {
    if (!city) {
      setFilteredRooms([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredRooms(city.rooms || []);
      return;
    }

    const searchWords = searchQuery.toLowerCase().trim().split(/\s+/);

    const filtered = (city.rooms || []).filter(room => {
      const searchableText = [
        room.name,
        room.anydesk,
        room.ip || '',
        room.notes || ''
      ].join(' ').toLowerCase();

      return searchWords.every(word => searchableText.includes(word));
    });

    setFilteredRooms(filtered);
  }, [city, searchQuery]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && roomGridRef.current) {
      const selectedElement = roomGridRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex]);

  if (loading) {
    return (
      <div className="min-h-full p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading city data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="min-h-full p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600">City not found</p>
        </div>
      </div>
    );
  }

  const getCountryFlag = (country: string): string => {
    const flagMap: Record<string, string> = {
      'Germany': '/flags/de.svg',
      'Greece': '/flags/gr.svg',
      'USA': '/flags/us.svg',
      'Canada': '/flags/ca.svg',
      'Australia': '/flags/au.svg',
      'Portugal': '/flags/pt.svg',
      'France': '/flags/fr.svg',
      'Luxembourg': '/flags/lu.svg',
      'Switzerland': '/flags/ch.svg',
      'UK': '/flags/gb.svg',
      'Netherlands': '/flags/nl.svg',
      'Bulgaria': '/flags/bg.svg',
      'Kenya': '/flags/ke.svg',
      'Slovakia': '/flags/sk.svg'
    };
    return flagMap[country] || '/flags/xx.svg';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const connectAnyDesk = async (anydeskId: string) => {
    try {
      const cleanId = anydeskId.replace(/\s+/g, '');
      await navigator.clipboard.writeText(anydeskId);
      const anydeskUrl = `anydesk:${cleanId}`;
      window.location.href = anydeskUrl;
    } catch (error) {
      try {
        await navigator.clipboard.writeText(anydeskId);
      } catch {
        // Silent fail - do nothing
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchQuery || filteredRooms.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredRooms.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredRooms.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredRooms.length) {
          const selectedRoom = filteredRooms[selectedIndex];
          connectAnyDesk(selectedRoom.anydesk);
        }
        break;
      case 'Escape':
        setSearchQuery('');
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button 
            onClick={onBack}
            className="mb-4 flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <span className="mr-2">←</span>
            Back to Cities
          </button>
          <div className="flex items-center mb-4">
            <img 
              src={getCountryFlag(city.country)} 
              alt={`${city.country} flag`}
              className="w-12 h-8 mr-4 object-cover rounded"
            />
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                {city.name}
              </h1>
              <p className="text-xl text-gray-600">{city.country}</p>
            </div>
          </div>
          <p className="text-lg text-gray-600">
            {searchQuery ? `${filteredRooms.length} of ${city.rooms?.length || 0}` : city.rooms?.length || 0} room{(searchQuery ? filteredRooms.length : city.rooms?.length || 0) !== 1 ? 's' : ''} {searchQuery ? 'found' : 'available'}
          </p>
        </header>

        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search rooms, AnyDesk ID, IP, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {filteredRooms.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No rooms found matching "{searchQuery}"</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search terms</p>
          </div>
        ) : (
          <div ref={roomGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room, index) => (
            <button
              key={index}
              onClick={() => onSelectRoom(room.name)}
              className={`p-4 rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-left ${
                selectedIndex === index 
                  ? 'bg-red-50 border-red-500 shadow-lg' 
                  : 'bg-white border-gray-200 hover:shadow-lg hover:border-red-300'
              }`}
              type="button"
              role="button"
              tabIndex={0}
              aria-label={`Select ${room.name} room`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800 flex-1">
                  {room.name}
                </h3>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-2xl">🖥️</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      connectAnyDesk(room.anydesk);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Connect with AnyDesk"
                  >
                    <img 
                      src="/logo/anydesk-seeklogo.png" 
                      alt="AnyDesk"
                      className="w-8 h-8 object-contain"
                    />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">AnyDesk ID:</span>
                  <button
                    onClick={() => copyToClipboard(room.anydesk)}
                    className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded font-mono transition-colors"
                    title="Click to copy"
                  >
                    {room.anydesk}
                  </button>
                </div>
                
                {room.ip && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 font-medium">IP Address:</span>
                    <button
                      onClick={() => copyToClipboard(room.ip!)}
                      className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded font-mono transition-colors"
                      title="Click to copy"
                    >
                      {room.ip}
                    </button>
                  </div>
                )}
                
                {room.notes && (
                  <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                    <p className="text-sm text-yellow-800">
                      <strong>Notes:</strong> {room.notes}
                    </p>
                  </div>
                )}
              </div>
            </button>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}
