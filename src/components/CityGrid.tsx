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

  // Fetch cities on mount
  useEffect(() => {
    let isCancelled = false;
    
    async function fetchCities() {
      if (isCancelled) return;
      
      // Check for cached data first
      const cacheKey = `cities_data_${country}_${escapeRoomTypeId}`;
      const cacheTimeKey = `cities_data_${country}_${escapeRoomTypeId}_time`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheTimeKey);
      
      // Use cache if it's less than 5 minutes old
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5 * 60 * 1000) { // 5 minutes
          try {
            const cachedData = JSON.parse(cached);
            if (!isCancelled) {
              setCities(cachedData.cities);
              setAllRooms(cachedData.allRooms || []);
              setLoading(false);
              console.log(`Using cached data for ${country} cities`);
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

        // Build allRooms array
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
        
        // Cache the results
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

  // Auto-focus search input when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
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

  // Filter cities and rooms based on search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchQuery.trim()) {
        setFilteredCities([]);
        setFilteredRooms([]);
        return;
      }

      const searchLower = searchQuery.toLowerCase().trim();

      // First, filter cities
      const cityMatches = cities.filter(city => 
        city.name.toLowerCase().includes(searchLower)
      );
      setFilteredCities(cityMatches);

      // If no cities match, search rooms
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
    }, 150); // Debounce search to avoid excessive filtering

    return () => clearTimeout(timeoutId);
  }, [allRooms, searchQuery, cities]);

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
      if (filteredCities.length > 0) {
        totalItems = filteredCities.length;
      } else {
        totalItems = filteredRooms.length;
      }
    } else {
      // When not searching, use all cities
      totalItems = cities.length;
    }

    if (totalItems === 0) return;
    
    // Calculate grid dimensions (4 columns for cities, 2 for search results)
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
              // Navigate to selected filtered city
              const selectedCity = filteredCities[selectedIndex];
              onSelectCity(selectedCity.name);
            } else if (filteredRooms.length > 0) {
              // Connect to selected room
              const selectedRoom = filteredRooms[selectedIndex];
              connectAnyDesk(selectedRoom.anydesk);
            }
          } else {
            // Navigate to selected city (when not searching)
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
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button 
            onClick={onBack}
            className="mb-4 flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <span className="mr-2">←</span>
            Back to Countries
          </button>
          <div className="flex items-center mb-4">
            <img 
              src={getCountryFlag(country)} 
              alt={`${country} flag`}
              className="w-12 h-8 mr-4 object-cover rounded"
            />
            <h1 className="text-4xl font-bold text-gray-800">
              {country} - Cities
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            Select a city to view available rooms and IPs
          </p>
        </header>

        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search cities or rooms in this country... (↓↑ to navigate, Enter to connect)"
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
              {filteredCities.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    {filteredCities.length} cit{filteredCities.length !== 1 ? 'ies' : 'y'} found in {country} for "{searchQuery}"
                  </p>
                  <div ref={resultsContainerRef} className="space-y-2">
                    {filteredCities.map((city, index) => (
                      <div
                        key={city.id}
                        onClick={() => onSelectCity(city.name)}
                        className={`bg-white rounded border p-4 transition-all cursor-pointer ${
                          selectedIndex === index
                            ? 'border-red-500 shadow-lg bg-red-50'
                            : 'border-gray-200 hover:border-red-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={getCountryFlag(country)}
                            alt={`${country} flag`}
                            className="w-10 h-7 object-cover rounded shadow-sm"
                          />
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">{city.name}</h3>
                            <p className="text-sm text-gray-600">{country}</p>
                            <p className="text-xs text-gray-500">{city.rooms?.length || 0} rooms</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} found in {country} for "{searchQuery}"
                  </p>
                  
                  {filteredRooms.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-gray-500">No cities or rooms found matching "{searchQuery}"</p>
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
                                src={getCountryFlag(country)} 
                                alt={`${country} flag`}
                                className="w-6 h-4 mr-3 object-cover rounded"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">{room.name}</div>
                                <div className="text-sm text-gray-600">
                                  {room.cityName}
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
                                onClick={() => onSelectRoom?.(room.cityName, room.name)}
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
            </div>
          )}
        </div>

        {!searchQuery && loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cities...</p>
          </div>
        )}

        {!searchQuery && !loading && (
          <div ref={resultsContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cities.map((city, index) => (
            <button
              key={city.name}
              onClick={() => onSelectCity(city.name)}
              className={`p-6 bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                selectedIndex === index
                  ? 'border-red-500 shadow-lg bg-red-50'
                  : 'border-gray-200 hover:border-red-500 hover:shadow-lg'
              }`}
              type="button"
              role="button"
              tabIndex={0}
              aria-label={`Select ${city.name} city`}
            >
              <div className="text-4xl mb-4 text-center">🏙️</div>
              <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">
                {city.name}
              </h3>
              <p className="text-gray-600 text-center text-sm">
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
