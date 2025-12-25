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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCity() {
      if (isCancelled) return;

      const cacheKey = `city_data_${cityName}_${escapeRoomTypeId}`;
      const cacheTimeKey = `city_data_${cityName}_${escapeRoomTypeId}_time`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheTimeKey);

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5 * 60 * 1000) {
          try {
            const cachedCity = JSON.parse(cached);
            if (!isCancelled) {
              setCity(cachedCity);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error parsing cached city data:', error);
          }
        }
      }

      setLoading(true);
      try {
        const cityData = await getCityWithRooms(cityName, escapeRoomTypeId);
        if (!isCancelled) {
          setCity(cityData);
          if (cityData) {
            sessionStorage.setItem(cacheKey, JSON.stringify(cityData));
            sessionStorage.setItem(cacheTimeKey, Date.now().toString());
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching city data:', error);
          setCity(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchCity();

    return () => {
      isCancelled = true;
    };
  }, [cityName, escapeRoomTypeId]);

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

  const getCountryFlag = (country: string): string => {
    const savedMappings = localStorage.getItem('countryFlagMappings');
    let flagMap: Record<string, string> = {
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

    if (savedMappings) {
      try {
        const parsed = JSON.parse(savedMappings);
        flagMap = { ...flagMap, ...parsed };
      } catch (error) {
        console.error('Error parsing saved flag mappings:', error);
      }
    }

    return flagMap[country] || '/flags/xx.svg';
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      totalItems = filteredRooms.length;
    } else {
      totalItems = city?.rooms?.length || 0;
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
            const selectedRoom = filteredRooms[selectedIndex];
            connectAnyDesk(selectedRoom.anydesk);
          } else {
            const selectedRoom = city?.rooms?.[selectedIndex];
            if (selectedRoom) {
              connectAnyDesk(selectedRoom.anydesk);
            }
          }
        }
        break;
      case 'Escape':
        setSearchQuery('');
        setSelectedIndex(-1);
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading rooms...</p>
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[#ea2127] font-medium">City not found</p>
        </div>
      </div>
    );
  }

  const displayRooms = searchQuery ? filteredRooms : city?.rooms || [];

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f59e0b] rounded-full blur-[200px] opacity-[0.03]" />

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
              <span className="text-sm font-medium">Cities</span>
            </button>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <img
              src={getCountryFlag(city.country)}
              alt={city.country}
              className="w-12 h-8 rounded object-cover shadow-lg"
            />
            <div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-[#f59e0b] rounded-full" />
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    {city.name}
                  </h1>
                  <p className="text-[#6b6b7a]">{city.country}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-16">
            <span className="text-[#f59e0b] font-mono text-lg font-semibold">
              {displayRooms.length}
            </span>
            <span className="text-[#6b6b7a]">
              {searchQuery ? `of ${city.rooms?.length || 0} ` : ''}room{displayRooms.length !== 1 ? 's' : ''} {searchQuery ? 'found' : 'available'}
            </span>
          </div>
        </header>

        {/* Search Bar */}
        <div className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
          <div className="relative max-w-xl">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search rooms, AnyDesk ID, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3.5 pl-12 pr-12 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all"
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
        </div>

        {/* No Results */}
        {displayRooms.length === 0 && searchQuery ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-[#6b6b7a] mb-2">No rooms found matching "{searchQuery}"</p>
            <p className="text-[#4a4a58] text-sm">Try adjusting your search terms</p>
          </div>
        ) : (
          /* Room Grid */
          <div
            ref={roomGridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: '200ms' }}
          >
            {displayRooms.map((room, index) => (
              <div
                key={index}
                className={`group relative bg-[#141418] rounded-2xl border p-5 transition-all duration-300 ${
                  selectedIndex === index
                    ? 'border-[#f59e0b] shadow-lg shadow-[#f59e0b]/10'
                    : 'border-[#1f1f28] hover:border-[#2a2a38] hover:bg-[#18181d]'
                }`}
              >
                {/* Gradient accent on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />

                {/* Room Header */}
                <div className="flex items-start justify-between mb-4">
                  <button
                    onClick={() => onSelectRoom(room.name)}
                    className="flex-1 text-left"
                  >
                    <h3 className="text-lg font-semibold text-white group-hover:text-[#f59e0b] transition-colors">
                      {room.name}
                    </h3>
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#1f1f28] flex items-center justify-center text-xl">
                      🖥️
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        connectAnyDesk(room.anydesk);
                      }}
                      className="p-2 bg-[#1f1f28] hover:bg-[#2a2a38] rounded-xl transition-colors"
                      title="Connect with AnyDesk"
                    >
                      <img
                        src="/logo/anydesk-seeklogo.png"
                        alt="AnyDesk"
                        className="w-6 h-6 object-contain"
                      />
                    </button>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6b6b7a]">AnyDesk</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(room.anydesk, `anydesk-${index}`);
                      }}
                      className={`font-mono text-sm px-3 py-1.5 rounded-lg transition-all ${
                        copiedId === `anydesk-${index}`
                          ? 'bg-[#10b981]/20 text-[#10b981]'
                          : 'bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20'
                      }`}
                    >
                      {copiedId === `anydesk-${index}` ? 'Copied!' : room.anydesk}
                    </button>
                  </div>

                  {room.ip && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6b6b7a]">IP</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(room.ip!, `ip-${index}`);
                        }}
                        className={`font-mono text-sm px-3 py-1.5 rounded-lg transition-all ${
                          copiedId === `ip-${index}`
                            ? 'bg-[#10b981]/20 text-[#10b981]'
                            : 'bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20'
                        }`}
                      >
                        {copiedId === `ip-${index}` ? 'Copied!' : room.ip}
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {room.notes && (
                  <div className="mt-4 p-3 bg-[#f59e0b]/10 border-l-2 border-[#f59e0b] rounded-r-lg">
                    <p className="text-sm text-[#f59e0b]">{room.notes}</p>
                  </div>
                )}

                {/* View Details Button */}
                <button
                  onClick={() => onSelectRoom(room.name)}
                  className="mt-4 w-full py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#8b8b9a] hover:text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  View Details
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
