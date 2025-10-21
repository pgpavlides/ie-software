import { useState, useRef, useEffect } from 'react';
import { getEscapeRoomTypes, searchRooms, type EscapeRoomType, type RoomEntry } from '../services/supabaseQueries';
import AddRoomModal from './modals/AddRoomModal';

interface EscapeRoomTypeGridProps {
  onSelectType: (typeId: string) => void;
  onBack: () => void;
  onSelectRoom?: (typeId: string, cityName: string, roomName: string) => void;
}

export default function EscapeRoomTypeGrid({ onSelectType, onBack, onSelectRoom }: EscapeRoomTypeGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [escapeRoomTypes, setEscapeRoomTypes] = useState<EscapeRoomType[]>([]);
  const [searchResults, setSearchResults] = useState<Array<RoomEntry & { city_name: string; country: string; type_id: string }>>([]);
  const [filteredTypes, setFilteredTypes] = useState<EscapeRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch escape room types on mount
  useEffect(() => {
    let isCancelled = false;
    
    const fetchTypes = async () => {
      if (isCancelled) return;
      
      setLoading(true);
      try {
        const types = await getEscapeRoomTypes();
        if (!isCancelled) {
          setEscapeRoomTypes(types);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching escape room types:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchTypes();
    
    return () => {
      isCancelled = true;
    };
  }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const types = await getEscapeRoomTypes();
      setEscapeRoomTypes(types);
    } catch (err) {
      console.error('Error fetching escape room types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomAdded = () => {
    // Refresh the data after a room is added
    fetchTypes();
  };

  // Search types and rooms when query changes
  useEffect(() => {
    let isCancelled = false;
    
    async function performSearch() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setFilteredTypes([]);
        return;
      }

      if (isCancelled) return;
      
      setSearching(true);
      try {
        // First, filter room types by name and description
        const typeMatches = escapeRoomTypes.filter(type => 
          type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (!isCancelled) {
          setFilteredTypes(typeMatches);
        }

        // If no types match, search all rooms
        if (typeMatches.length === 0) {
          const results = await searchRooms(searchQuery);
          if (!isCancelled) {
            setSearchResults(results);
          }
        } else {
          // Clear room results if types match
          if (!isCancelled) {
            setSearchResults([]);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error searching:', err);
        }
      } finally {
        if (!isCancelled) {
          setSearching(false);
        }
      }
    }

    const debounce = setTimeout(performSearch, 300);
    
    return () => {
      isCancelled = true;
      clearTimeout(debounce);
    };
  }, [searchQuery, escapeRoomTypes]);
  
  // Auto-focus search input when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

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
    let totalItems = 0;

    if (searchQuery) {
      // When searching, use filtered results
      if (filteredTypes.length > 0) {
        totalItems = filteredTypes.length;
      } else {
        totalItems = searchResults.length;
      }
    } else {
      // When not searching, use all escape room types
      totalItems = escapeRoomTypes.length;
    }

    if (totalItems === 0) return;

    // Calculate grid dimensions (3 columns for most layouts)
    const columns = 3;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev + columns;
          return newIndex < totalItems ? newIndex : prev % columns;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev - columns;
          return newIndex >= 0 ? newIndex : Math.floor((totalItems - 1) / columns) * columns + (prev % columns);
        });
        break;
      case 'ArrowRight':
        e.preventDefault();
        setSelectedIndex(prev => {
          const row = Math.floor(prev / columns);
          const col = prev % columns;
          const newCol = col + 1;
          const newIndex = row * columns + newCol;
          return newCol < columns && newIndex < totalItems ? newIndex : row * columns;
        });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setSelectedIndex(prev => {
          const row = Math.floor(prev / columns);
          const col = prev % columns;
          const newCol = col - 1;
          const newIndex = row * columns + newCol;
          return newCol >= 0 ? newIndex : Math.min(row * columns + columns - 1, totalItems - 1);
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < totalItems) {
          if (searchQuery) {
            if (filteredTypes.length > 0) {
              // Navigate to selected filtered type
              const selectedType = filteredTypes[selectedIndex];
              onSelectType(selectedType.id);
            } else if (searchResults.length > 0) {
              // Connect to selected room
              const selectedRoom = searchResults[selectedIndex];
              connectAnyDesk(selectedRoom.anydesk);
            }
          } else {
            // Navigate to selected escape room type (when not searching)
            const selectedType = escapeRoomTypes[selectedIndex];
            onSelectType(selectedType.id);
          }
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
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <span className="mr-2">←</span>
              Back to Dashboard
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Room
            </button>
          </div>
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
              placeholder="Search escape room types or all rooms... (↓↑ to navigate, Enter to connect)"
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
          
          {searchQuery && (
            <div className="mt-4">
              {searching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Searching...</p>
                </div>
              ) : (
                <>
                  {filteredTypes.length > 0 ? (
                    <>
                      <p className="text-sm text-gray-600 mb-3">
                        {filteredTypes.length} escape room type{filteredTypes.length !== 1 ? 's' : ''} found for "{searchQuery}"
                      </p>
                      <div ref={resultsContainerRef} className="space-y-2">
                        {filteredTypes.map((type, index) => (
                          <div
                            key={type.id}
                            onClick={() => onSelectType(type.id)}
                            className={`bg-white rounded border p-4 transition-all cursor-pointer ${
                              selectedIndex === index
                                ? 'border-red-500 shadow-lg bg-red-50'
                                : 'border-gray-200 hover:border-red-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-2xl">🏠</div>
                              <div>
                                <h3 className="text-lg font-bold text-gray-800">{type.name}</h3>
                                <p className="text-sm text-gray-600">{type.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-3">
                        {searchResults.length} room{searchResults.length !== 1 ? 's' : ''} found for "{searchQuery}"
                      </p>

                      {searchResults.length === 0 ? (
                        <div className="text-center py-8">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-gray-500">No escape room types or rooms found matching "{searchQuery}"</p>
                        </div>
                      ) : (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div ref={resultsContainerRef} className="space-y-2">
                        {searchResults.map((room, index) => (
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
                                      {room.city_name}, {room.country}
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
                                    onClick={() => onSelectRoom?.(room.type_id, room.city_name, room.name)}
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
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {!searchQuery && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading escape room types...</p>
              </div>
            ) : (
              <div ref={resultsContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {escapeRoomTypes.map((type: EscapeRoomType, index) => (
                  <button
                    key={type.id}
                    onClick={() => onSelectType(type.id)}
                    className={`p-6 bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                      selectedIndex === index
                        ? 'border-red-500 shadow-lg bg-red-50'
                        : 'border-gray-200 hover:border-red-500 hover:shadow-lg'
                    }`}
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
                        Browse {type.name} rooms
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AddRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoomAdded={handleRoomAdded}
      />
    </div>
  );
}