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
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);

  // Fetch escape room types on mount with caching
  useEffect(() => {
    let isCancelled = false;

    const fetchTypes = async () => {
      if (isCancelled) return;

      const cacheKey = 'escape_room_types_cache';
      const cacheTimeKey = 'escape_room_types_cache_time';
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheTimeKey);

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5 * 60 * 1000) {
          try {
            const cachedTypes = JSON.parse(cached);
            if (!isCancelled) {
              setEscapeRoomTypes(cachedTypes);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error parsing cached data:', error);
          }
        }
      }

      setLoading(true);
      try {
        const types = await getEscapeRoomTypes();
        if (!isCancelled) {
          setEscapeRoomTypes(types);
          sessionStorage.setItem(cacheKey, JSON.stringify(types));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const refreshTypes = async () => {
    setLoading(true);
    try {
      const types = await getEscapeRoomTypes();
      setEscapeRoomTypes(types);
      sessionStorage.setItem('escape_room_types_cache', JSON.stringify(types));
      sessionStorage.setItem('escape_room_types_cache_time', Date.now().toString());
    } catch (err) {
      console.error('Error fetching escape room types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomAdded = () => {
    refreshTypes();
  };

  useEffect(() => {
    let isCancelled = false;

    async function performSearch() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setFilteredTypes([]);
        return;
      }

      if (isCancelled || !isTabVisible) return;

      setSearching(true);
      try {
        const typeMatches = escapeRoomTypes.filter(type =>
          type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (!isCancelled) {
          setFilteredTypes(typeMatches);
        }

        if (typeMatches.length === 0) {
          const results = await searchRooms(searchQuery);
          if (!isCancelled) {
            setSearchResults(results);
          }
        } else {
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
  }, [searchQuery, escapeRoomTypes, isTabVisible]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

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

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

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
      const cleanId = anydeskId.replace(/\s+/g, '');
      await navigator.clipboard.writeText(anydeskId);
      const anydeskUrl = `anydesk:${cleanId}`;
      window.location.href = anydeskUrl;
    } catch (error) {
      try {
        await navigator.clipboard.writeText(anydeskId);
      } catch {
        // Silent fail
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let totalItems = 0;

    if (searchQuery) {
      if (filteredTypes.length > 0) {
        totalItems = filteredTypes.length;
      } else {
        totalItems = searchResults.length;
      }
    } else {
      totalItems = escapeRoomTypes.length;
    }

    if (totalItems === 0) return;

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
              const selectedType = filteredTypes[selectedIndex];
              onSelectType(selectedType.id);
            } else if (searchResults.length > 0) {
              const selectedRoom = searchResults[selectedIndex];
              connectAnyDesk(selectedRoom.anydesk);
            }
          } else {
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
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ea2127] rounded-full blur-[200px] opacity-[0.03]" />

      <div className="relative z-10 p-6 lg:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="group flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1f] hover:bg-[#222228] text-[#a0a0b0] hover:text-white border border-[#2a2a35] hover:border-[#ea2127]/50 rounded-xl transition-all duration-200"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#10b981] hover:bg-[#0d9668] text-white rounded-xl transition-all duration-200 shadow-lg shadow-[#10b981]/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">Add Room</span>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 bg-[#ea2127] rounded-full" />
            <h1 className="text-2xl lg:text-3xl font-bold text-white">
              Escape Room Types
            </h1>
          </div>
          <p className="text-[#6b6b7a] ml-4">
            Select a room type to browse locations
          </p>
        </header>

        {/* Search Bar */}
        <div className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
          <div className="relative max-w-xl">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search room types or all rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3.5 pl-12 pr-12 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="w-5 h-5 text-[#5a5a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#5a5a68] hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 mt-3 ml-1 text-xs text-[#5a5a68]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a1a1f] rounded border border-[#2a2a35] font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a1a1f] rounded border border-[#2a2a35] font-mono">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a1a1f] rounded border border-[#2a2a35] font-mono">Esc</kbd>
              Clear
            </span>
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-8">
            {searching ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#ea2127] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {filteredTypes.length > 0 ? (
                  <>
                    <p className="text-sm text-[#6b6b7a] mb-4">
                      {filteredTypes.length} type{filteredTypes.length !== 1 ? 's' : ''} matching "{searchQuery}"
                    </p>
                    <div ref={resultsContainerRef} className="space-y-3">
                      {filteredTypes.map((type, index) => (
                        <button
                          key={type.id}
                          onClick={() => onSelectType(type.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                            selectedIndex === index
                              ? 'bg-[#1a1a1f] border-[#ea2127] shadow-lg shadow-[#ea2127]/10'
                              : 'bg-[#141418] border-[#1f1f28] hover:border-[#2a2a38] hover:bg-[#18181d]'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-[#1f1f28] flex items-center justify-center">
                              <img
                                src={getLogoPath(type.id)}
                                alt={type.name}
                                className="w-8 h-8 object-contain"
                              />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">{type.name}</h3>
                              <p className="text-sm text-[#6b6b7a]">{type.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[#6b6b7a] mb-4">
                      {searchResults.length} room{searchResults.length !== 1 ? 's' : ''} matching "{searchQuery}"
                    </p>

                    {searchResults.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
                          <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <p className="text-[#6b6b7a]">No results found for "{searchQuery}"</p>
                      </div>
                    ) : (
                      <div className="bg-[#141418] rounded-xl border border-[#1f1f28] max-h-96 overflow-y-auto">
                        <div ref={resultsContainerRef} className="divide-y divide-[#1f1f28]">
                          {searchResults.map((room, index) => (
                            <div
                              key={index}
                              className={`p-4 transition-all ${
                                selectedIndex === index
                                  ? 'bg-[#1a1a1f]'
                                  : 'hover:bg-[#18181d]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <img
                                    src={getCountryFlag(room.country)}
                                    alt={room.country}
                                    className="w-6 h-4 rounded object-cover"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-medium text-white truncate">{room.name}</div>
                                    <div className="text-sm text-[#6b6b7a]">
                                      {room.city_name}, {room.country}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                  <button
                                    onClick={() => navigator.clipboard.writeText(room.anydesk)}
                                    className="font-mono text-xs px-2 py-1 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#3b82f6] rounded transition-colors"
                                  >
                                    {room.anydesk}
                                  </button>
                                  {room.ip && (
                                    <button
                                      onClick={() => navigator.clipboard.writeText(room.ip!)}
                                      className="font-mono text-xs px-2 py-1 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#10b981] rounded transition-colors"
                                    >
                                      {room.ip}
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      connectAnyDesk(room.anydesk);
                                    }}
                                    className="p-2 bg-[#1f1f28] hover:bg-[#2a2a38] rounded-lg transition-colors"
                                    title="Connect with AnyDesk"
                                  >
                                    <img
                                      src="/logo/anydesk-seeklogo.png"
                                      alt="AnyDesk"
                                      className="w-5 h-5 object-contain"
                                    />
                                  </button>
                                  <button
                                    onClick={() => onSelectRoom?.(room.type_id, room.city_name, room.name)}
                                    className="text-xs px-3 py-1.5 bg-[#ea2127]/10 hover:bg-[#ea2127]/20 text-[#ea2127] rounded-lg transition-colors"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                              {room.notes && (
                                <div className="mt-2 text-xs text-[#f59e0b] bg-[#f59e0b]/10 px-3 py-1.5 rounded-lg">
                                  {room.notes}
                                </div>
                              )}
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

        {/* Room Type Grid */}
        {!searchQuery && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-[#ea2127] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-[#6b6b7a]">Loading room types...</p>
              </div>
            ) : (
              <div
                ref={resultsContainerRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
                style={{ animationDelay: '200ms' }}
              >
                {escapeRoomTypes.map((type: EscapeRoomType, index) => (
                  <button
                    key={type.id}
                    onClick={() => onSelectType(type.id)}
                    className={`group relative p-6 rounded-2xl border text-left transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ea2127]/50 ${
                      selectedIndex === index
                        ? 'bg-[#1a1a1f] border-[#ea2127] shadow-lg shadow-[#ea2127]/10'
                        : 'bg-[#141418] border-[#1f1f28] hover:border-[#2a2a38] hover:bg-[#18181d] hover:translate-y-[-2px]'
                    }`}
                    style={{ animationDelay: `${300 + index * 100}ms` }}
                  >
                    {/* Gradient accent on hover */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ea2127] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />

                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 mb-4 rounded-xl bg-[#1f1f28] group-hover:bg-[#252530] flex items-center justify-center transition-colors overflow-hidden">
                        <img
                          src={getLogoPath(type.id)}
                          alt={type.name}
                          className={`object-contain transition-transform group-hover:scale-110 ${type.id === 'agent-factory' ? 'w-16 h-12' : 'w-14 h-14'}`}
                        />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#ea2127] transition-colors">
                        {type.name}
                      </h3>
                      <p className="text-sm text-[#6b6b7a]">
                        Browse {type.name} rooms
                      </p>
                    </div>

                    {/* Arrow indicator */}
                    <div className="absolute bottom-4 right-4 text-[#3a3a48] group-hover:text-[#ea2127] group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
