import { useState, useRef, useEffect } from 'react';
import { getCitiesByCountryAndType, type CityData, type RoomEntry } from '../services/supabaseQueries';

interface CityGridProps {
  country: string;
  escapeRoomTypeId: string;
  onSelectCity: (cityName: string) => void;
  onBack: () => void;
  onSelectRoom?: (cityName: string, roomName: string) => void;
}

export default function CityGrid({ country, escapeRoomTypeId, onSelectCity, onBack, onSelectRoom }: CityGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [cities, setCities] = useState<CityData[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityData[]>([]);
  const [allRooms, setAllRooms] = useState<Array<RoomEntry & { cityName: string }>>([]);
  const [filteredRooms, setFilteredRooms] = useState<Array<RoomEntry & { cityName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCities() {
      if (isCancelled) return;

      const cacheKey = `cities_data_${country}_${escapeRoomTypeId}`;
      const cacheTimeKey = `cities_data_${country}_${escapeRoomTypeId}_time`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheTimeKey);

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5 * 60 * 1000) {
          try {
            const cachedData = JSON.parse(cached);
            if (!isCancelled) {
              setCities(cachedData.cities);
              setAllRooms(cachedData.allRooms || []);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error parsing cached cities data:', error);
          }
        }
      }

      setLoading(true);
      try {
        const citiesData = await getCitiesByCountryAndType(country, escapeRoomTypeId);

        if (isCancelled) return;

        setCities(citiesData);

        const rooms: Array<RoomEntry & { cityName: string }> = [];
        citiesData.forEach(city => {
          city.rooms?.forEach(room => {
            rooms.push({
              ...room,
              cityName: city.name
            });
          });
        });
        setAllRooms(rooms);

        const dataToCache = {
          cities: citiesData,
          allRooms: rooms
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
        sessionStorage.setItem(cacheTimeKey, Date.now().toString());
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching cities:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchCities();

    return () => {
      isCancelled = true;
    };
  }, [country, escapeRoomTypeId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
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
    const timeoutId = setTimeout(() => {
      if (!searchQuery.trim()) {
        setFilteredCities([]);
        setFilteredRooms([]);
        return;
      }

      const searchLower = searchQuery.toLowerCase().trim();

      const cityMatches = cities.filter(city =>
        city.name.toLowerCase().includes(searchLower)
      );
      setFilteredCities(cityMatches);

      if (cityMatches.length === 0) {
        const searchWords = searchLower.split(/\s+/);
        const filtered = allRooms.filter(room => {
          const searchableText = [
            room.name,
            room.anydesk,
            room.ip || '',
            room.notes || '',
            room.cityName
          ].join(' ').toLowerCase();

          return searchWords.every(word => searchableText.includes(word));
        });
        setFilteredRooms(filtered);
      } else {
        setFilteredRooms([]);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [allRooms, searchQuery, cities]);

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
      if (filteredCities.length > 0) {
        totalItems = filteredCities.length;
      } else {
        totalItems = filteredRooms.length;
      }
    } else {
      totalItems = cities.length;
    }

    if (totalItems === 0) return;

    const columns = searchQuery && filteredCities.length === 0 ? 2 : 4;

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
            if (filteredCities.length > 0) {
              const selectedCity = filteredCities[selectedIndex];
              onSelectCity(selectedCity.name);
            } else if (filteredRooms.length > 0) {
              const selectedRoom = filteredRooms[selectedIndex];
              connectAnyDesk(selectedRoom.anydesk);
            }
          } else {
            const selectedCity = cities[selectedIndex];
            onSelectCity(selectedCity.name);
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
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#10b981] rounded-full blur-[200px] opacity-[0.03]" />

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
              <span className="text-sm font-medium">Countries</span>
            </button>
          </div>

          <div className="flex items-center gap-4 mb-2">
            <img
              src={getCountryFlag(country)}
              alt={country}
              className="w-10 h-7 rounded object-cover shadow-lg"
            />
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-[#10b981] rounded-full" />
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                {country} — Cities
              </h1>
            </div>
          </div>
          <p className="text-[#6b6b7a] ml-14">
            Select a city to view available rooms
          </p>
        </header>

        {/* Search Bar */}
        <div className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
          <div className="relative max-w-xl">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search cities or rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3.5 pl-12 pr-12 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#10b981]/50 focus:ring-2 focus:ring-[#10b981]/20 transition-all"
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

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-8">
            {filteredCities.length > 0 ? (
              <>
                <p className="text-sm text-[#6b6b7a] mb-4">
                  {filteredCities.length} cit{filteredCities.length !== 1 ? 'ies' : 'y'} matching "{searchQuery}"
                </p>
                <div ref={resultsContainerRef} className="space-y-3">
                  {filteredCities.map((city, index) => (
                    <button
                      key={city.id}
                      onClick={() => onSelectCity(city.name)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        selectedIndex === index
                          ? 'bg-[#1a1a1f] border-[#10b981] shadow-lg shadow-[#10b981]/10'
                          : 'bg-[#141418] border-[#1f1f28] hover:border-[#2a2a38] hover:bg-[#18181d]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1f1f28] flex items-center justify-center text-2xl">
                          🏙️
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{city.name}</h3>
                          <p className="text-sm text-[#6b6b7a]">{city.rooms?.length || 0} rooms</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#6b6b7a] mb-4">
                  {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </p>

                {filteredRooms.length === 0 ? (
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
                      {filteredRooms.map((room, index) => (
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
                                src={getCountryFlag(country)}
                                alt={country}
                                className="w-6 h-4 rounded object-cover"
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-white truncate">{room.name}</div>
                                <div className="text-sm text-[#6b6b7a]">{room.cityName}</div>
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
                                onClick={() => onSelectRoom?.(room.cityName, room.name)}
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
          </div>
        )}

        {/* Loading State */}
        {!searchQuery && loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[#6b6b7a]">Loading cities...</p>
          </div>
        )}

        {/* City Grid */}
        {!searchQuery && !loading && (
          <div
            ref={resultsContainerRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: '200ms' }}
          >
            {cities.map((city, index) => (
              <button
                key={city.name}
                onClick={() => onSelectCity(city.name)}
                className={`group relative p-6 rounded-2xl border text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#10b981]/50 ${
                  selectedIndex === index
                    ? 'bg-[#1a1a1f] border-[#10b981] shadow-lg shadow-[#10b981]/10'
                    : 'bg-[#141418] border-[#1f1f28] hover:border-[#2a2a38] hover:bg-[#18181d] hover:translate-y-[-2px]'
                }`}
              >
                {/* Gradient accent on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#10b981] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />

                <div className="w-14 h-14 mb-4 mx-auto rounded-xl bg-[#1f1f28] group-hover:bg-[#252530] flex items-center justify-center text-3xl transition-colors">
                  🏙️
                </div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#10b981] transition-colors">
                  {city.name}
                </h3>
                <p className="text-sm text-[#6b6b7a]">
                  {city.rooms?.length || 0} room{city.rooms?.length !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
