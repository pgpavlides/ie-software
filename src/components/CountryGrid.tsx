import { useState, useRef, useEffect } from 'react';
import { getCountriesByType, getAllCitiesByType, type EscapeRoomType, type RoomEntry } from '../services/supabaseQueries';
import { useAuthStore } from '../store/authStore';
import supabase from '../lib/supabase';

interface CountryGridProps {
  escapeRoomTypeId: string;
  onSelectCountry: (country: string) => void;
  onBack: () => void;
  onSelectRoom?: (cityName: string, roomName: string) => void;
  onManageCountries?: () => void;
}

export default function CountryGrid({ escapeRoomTypeId, onSelectCountry, onBack, onSelectRoom, onManageCountries }: CountryGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
  const [escapeRoomType, setEscapeRoomType] = useState<EscapeRoomType | null>(null);
  const [allRooms, setAllRooms] = useState<Array<RoomEntry & { cityName: string; country: string }>>([]);
  const [filteredRooms, setFilteredRooms] = useState<Array<RoomEntry & { cityName: string; country: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const { isAdmin } = useAuthStore();

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      if (isCancelled) return;

      const cacheKey = `country_data_${escapeRoomTypeId}`;
      const cacheTimeKey = `country_data_${escapeRoomTypeId}_time`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheTimeKey);

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5 * 60 * 1000) {
          try {
            const cachedData = JSON.parse(cached);
            if (!isCancelled && cachedData.countries && cachedData.escapeRoomType) {
              setCountries(cachedData.countries);
              setEscapeRoomType(cachedData.escapeRoomType);
              setAllRooms(cachedData.allRooms || []);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error parsing cached country data:', error);
          }
        }
      }

      setLoading(true);
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !isCancelled) {
        try {
          const [countriesData, citiesData, typeData] = await Promise.all([
            getCountriesByType(escapeRoomTypeId),
            getAllCitiesByType(escapeRoomTypeId),
            supabase.from('escape_room_types').select('*').eq('id', escapeRoomTypeId).single()
          ]);

          if (isCancelled) return;

          if (!typeData.data && retryCount < maxRetries - 1) {
            throw new Error('No escape room type data received');
          }

          setCountries(countriesData);
          setEscapeRoomType(typeData.data);

          const rooms: Array<RoomEntry & { cityName: string; country: string }> = [];
          citiesData.forEach(city => {
            city.rooms?.forEach(room => {
              rooms.push({
                ...room,
                cityName: city.name,
                country: city.country
              });
            });
          });
          setAllRooms(rooms);

          const dataToCache = {
            countries: countriesData,
            escapeRoomType: typeData.data,
            allRooms: rooms
          };
          sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());

          break;
        } catch (err) {
          retryCount++;
          console.error(`Error fetching data (attempt ${retryCount}/${maxRetries}):`, err);

          if (retryCount >= maxRetries) {
            if (!isCancelled) {
              setCountries([]);
              setEscapeRoomType(null);
              setAllRooms([]);
            }
          } else if (!isCancelled) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }

      if (!isCancelled) {
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [escapeRoomTypeId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
    const timeoutId = setTimeout(() => {
      if (!searchQuery.trim() || !isTabVisible) {
        setFilteredCountries([]);
        setFilteredRooms([]);
        return;
      }

      const searchLower = searchQuery.toLowerCase().trim();

      const countryMatches = countries.filter(country =>
        country.toLowerCase().includes(searchLower)
      );
      setFilteredCountries(countryMatches);

      if (countryMatches.length === 0) {
        const searchWords = searchLower.split(/\s+/);
        const filtered = allRooms.filter(room => {
          const searchableText = [
            room.name,
            room.anydesk,
            room.ip || '',
            room.notes || '',
            room.cityName,
            room.country
          ].join(' ').toLowerCase();

          return searchWords.every(word => searchableText.includes(word));
        });
        setFilteredRooms(filtered);
      } else {
        setFilteredRooms([]);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [allRooms, searchQuery, countries, isTabVisible]);

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
      if (filteredCountries.length > 0) {
        totalItems = filteredCountries.length;
      } else {
        totalItems = filteredRooms.length;
      }
    } else {
      totalItems = countries.length;
    }

    if (totalItems === 0) return;

    const columns = searchQuery && filteredCountries.length === 0 ? 2 : 4;

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
            if (filteredCountries.length > 0) {
              const selectedCountry = filteredCountries[selectedIndex];
              onSelectCountry(selectedCountry);
            } else if (filteredRooms.length > 0) {
              const selectedRoom = filteredRooms[selectedIndex];
              connectAnyDesk(selectedRoom.anydesk);
            }
          } else {
            const selectedCountry = countries[selectedIndex];
            onSelectCountry(selectedCountry);
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
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#3b82f6] rounded-full blur-[200px] opacity-[0.03]" />

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
              <span className="text-sm font-medium">Room Types</span>
            </button>

            {isAdmin() && onManageCountries && (
              <button
                onClick={onManageCountries}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl transition-all duration-200 shadow-lg shadow-[#3b82f6]/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-sm font-medium">Manage Countries</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 bg-[#3b82f6] rounded-full" />
            <h1 className="text-2xl lg:text-3xl font-bold text-white">
              {escapeRoomType?.name} — Countries
            </h1>
          </div>
          <p className="text-[#6b6b7a] ml-4">
            Select a country to view available cities
          </p>
        </header>

        {/* Search Bar */}
        <div className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
          <div className="relative max-w-xl">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search countries or rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3.5 pl-12 pr-12 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
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
            {filteredCountries.length > 0 ? (
              <>
                <p className="text-sm text-[#6b6b7a] mb-4">
                  {filteredCountries.length} countr{filteredCountries.length !== 1 ? 'ies' : 'y'} matching "{searchQuery}"
                </p>
                <div ref={resultsContainerRef} className="space-y-3">
                  {filteredCountries.map((country, index) => (
                    <button
                      key={country}
                      onClick={() => onSelectCountry(country)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        selectedIndex === index
                          ? 'bg-[#1a1a1f] border-[#3b82f6] shadow-lg shadow-[#3b82f6]/10'
                          : 'bg-[#141418] border-[#1f1f28] hover:border-[#2a2a38] hover:bg-[#18181d]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={getCountryFlag(country)}
                          alt={country}
                          className="w-10 h-7 rounded object-cover shadow-sm"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-white">{country}</h3>
                          <p className="text-sm text-[#6b6b7a]">{escapeRoomType?.name}</p>
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
                                src={getCountryFlag(room.country)}
                                alt={room.country}
                                className="w-6 h-4 rounded object-cover"
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-white truncate">{room.name}</div>
                                <div className="text-sm text-[#6b6b7a]">
                                  {room.cityName}, {room.country}
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
            <div className="w-10 h-10 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[#6b6b7a]">Loading countries...</p>
          </div>
        )}

        {/* Country Grid */}
        {!searchQuery && !loading && (
          <div
            ref={resultsContainerRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: '200ms' }}
          >
            {countries.map((country, index) => (
              <button
                key={country}
                onClick={() => onSelectCountry(country)}
                className={`group relative p-6 rounded-2xl border text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 ${
                  selectedIndex === index
                    ? 'bg-[#1a1a1f] border-[#3b82f6] shadow-lg shadow-[#3b82f6]/10'
                    : 'bg-[#141418] border-[#1f1f28] hover:border-[#2a2a38] hover:bg-[#18181d] hover:translate-y-[-2px]'
                }`}
              >
                {/* Gradient accent on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />

                <div className="mb-4">
                  <img
                    src={getCountryFlag(country)}
                    alt={country}
                    className="w-16 h-12 mx-auto object-cover rounded-lg shadow-lg group-hover:scale-105 transition-transform"
                  />
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-[#3b82f6] transition-colors">
                  {country}
                </h3>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
