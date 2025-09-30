import { useState, useMemo, useRef, useEffect } from 'react';
import { getEscapeRoomTypes, type EscapeRoomType, type RoomEntry } from '../data/data';
import { useSearchParams } from 'react-router-dom';

interface EscapeRoomTypeGridProps {
  onSelectType: (typeId: string) => void;
  onBack: () => void;
  onSelectRoom?: (typeId: string, cityName: string, roomName: string) => void;
}

export default function EscapeRoomTypeGrid({ onSelectType, onBack, onSelectRoom }: EscapeRoomTypeGridProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const escapeRoomTypes = getEscapeRoomTypes();
  
  // Auto-focus search input when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);
  
  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex]);
  
  const allRooms = useMemo(() => {
    const rooms: Array<RoomEntry & { typeId: string; typeName: string; cityName: string; country: string }> = [];
    escapeRoomTypes.forEach(type => {
      type.cities.forEach(city => {
        city.rooms.forEach(room => {
          rooms.push({
            ...room,
            typeId: type.id,
            typeName: type.name,
            cityName: city.name,
            country: city.country
          });
        });
      });
    });
    return rooms;
  }, [escapeRoomTypes]);
  
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    
    const searchWords = searchQuery.toLowerCase().trim().split(/\s+/);
    
    return allRooms.filter(room => {
      // Create a searchable string containing all room data
      const searchableText = [
        room.name,
        room.anydesk,
        room.ip || '',
        room.notes || '',
        room.cityName,
        room.country,
        room.typeName
      ].join(' ').toLowerCase();
      
      // Check if ALL search words are found somewhere in the searchable text
      return searchWords.every(word => searchableText.includes(word));
    });
  }, [allRooms, searchQuery]);

  const getLogoPath = (typeId: string): string => {
    const logoMap: Record<string, string> = {
      'mindtrap': '/logo/mindtrap_logo.png',
      'agent-factory': '/logo/agent_logo.png', 
      'mindgolf': '/logo/mindgolf_logo.png'
    };
    return logoMap[typeId] || '/logo/default.svg';
  };

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

  const connectAnyDesk = async (anydeskId: string) => {
    try {
      // Remove spaces from AnyDesk ID for the protocol
      const cleanId = anydeskId.replace(/\s+/g, '');
      
      // First copy the original ID to clipboard (with spaces for readability)
      await navigator.clipboard.writeText(anydeskId);
      
      // Use the clean ID for the protocol URL
      const anydeskUrl = `anydesk:${cleanId}`;
      
      // Open AnyDesk with the clean ID
      window.location.href = anydeskUrl;
    } catch (error) {
      // Fallback: just copy to clipboard silently
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
        setSearchParams({});
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
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Select Escape Room Type
          </h1>
          <p className="text-xl text-gray-600">
            Choose your escape room experience
          </p>
        </header>

        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search all rooms, cities, countries... (↓↑ to navigate, Enter to connect)"
              value={searchQuery}
              onChange={(e) => setSearchParams({ q: e.target.value })}
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
                onClick={() => setSearchParams({})}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {searchQuery && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-3">
                {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} found for "{searchQuery}"
              </p>
              
              {filteredRooms.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-500">No rooms found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div ref={resultsContainerRef} className="space-y-2">
                    {filteredRooms.map((room, index) => (
                      <div 
                        key={index} 
                        className={`bg-white rounded border transition-all ${
                          selectedIndex === index 
                            ? 'border-red-500 shadow-lg bg-red-50' 
                            : 'border-gray-200 hover:border-red-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <img 
                                src={getCountryFlag(room.country)} 
                                alt={`${room.country} flag`}
                                className="w-6 h-4 mr-3 object-cover rounded"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">{room.name}</div>
                                <div className="text-sm text-gray-600">
                                  {room.typeName} • {room.cityName}, {room.country}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right text-sm">
                                <button
                                  onClick={() => navigator.clipboard.writeText(room.anydesk)}
                                  className="text-blue-600 font-mono hover:bg-blue-50 px-2 py-1 rounded text-xs"
                                  title="Click to copy"
                                >
                                  {room.anydesk}
                                </button>
                                {room.ip && (
                                  <div>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(room.ip!)}
                                      className="text-green-600 font-mono hover:bg-green-50 px-2 py-1 rounded text-xs"
                                      title="Click to copy"
                                    >
                                      {room.ip}
                                    </button>
                                  </div>
                                )}
                              </div>
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
                                  className="w-6 h-6 object-contain"
                                />
                              </button>
                              <button
                                onClick={() => onSelectRoom?.(room.typeId, room.cityName, room.name)}
                                className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs"
                                title="View Room Details"
                              >
                                View
                              </button>
                            </div>
                          </div>
                          {room.notes && (
                            <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                              {room.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {escapeRoomTypes.map((type: EscapeRoomType) => (
            <button
              key={type.id}
              onClick={() => onSelectType(type.id)}
              className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-red-500 hover:shadow-lg cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              type="button"
              role="button"
              tabIndex={0}
              aria-label={`Select ${type.name} escape room type`}
            >
              <div className="text-center">
                <div className="mb-4">
                  <img  
                    src={getLogoPath(type.id)} 
                    alt={`${type.name} logo`}
                    className={`mx-auto object-contain ${type.id === 'agent-factory' ? 'w-32 h-20' : 'w-20 h-20'}`}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {type.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {type.cities.length} cit{type.cities.length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
            </button>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}