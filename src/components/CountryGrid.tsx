import { useState, useRef, useEffect } from 'react';
import { getCountriesByType, getAllCitiesByType, type EscapeRoomType, type RoomEntry } from '../services/supabaseQueries';
import supabase from '../lib/supabase';

interface CountryGridProps {
  escapeRoomTypeId: string;
  onSelectCountry: (country: string) => void;
  onBack: () => void;
  onSelectRoom?: (cityName: string, roomName: string) => void;
}

export default function CountryGrid({ escapeRoomTypeId, onSelectCountry, onBack, onSelectRoom }: CountryGridProps) {
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
  
  // Fetch data on mount
  useEffect(() => {
    let isCancelled = false;
    
    async function fetchData() {
      if (isCancelled) return;
      
      setLoading(true);
      try {
        const [countriesData, citiesData, typeData] = await Promise.all([
          getCountriesByType(escapeRoomTypeId),
          getAllCitiesByType(escapeRoomTypeId),
          supabase.from('escape_room_types').select('*').eq('id', escapeRoomTypeId).single()
        ]);

        if (isCancelled) return;

        setCountries(countriesData);
        setEscapeRoomType(typeData.data);

        // Build allRooms array from cities data
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
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching data:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isCancelled = true;
    };
  }, [escapeRoomTypeId]);

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

  // Filter countries and rooms based on search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchQuery.trim()) {
        setFilteredCountries([]);
        setFilteredRooms([]);
        return;
      }

      const searchLower = searchQuery.toLowerCase().trim();

      // First, filter countries
      const countryMatches = countries.filter(country => 
        country.toLowerCase().includes(searchLower)
      );
      setFilteredCountries(countryMatches);

      // If no countries match, search rooms
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
    }, 150); // Debounce search to avoid excessive filtering

    return () => clearTimeout(timeoutId);
  }, [allRooms, searchQuery, countries]);

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
    if (!searchQuery) return;

    const totalItems = filteredCountries.length > 0 ? filteredCountries.length : filteredRooms.length;
    if (totalItems === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : totalItems - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < totalItems) {
          if (filteredCountries.length > 0) {
            // Navigate to selected country
            const selectedCountry = filteredCountries[selectedIndex];
            onSelectCountry(selectedCountry);
          } else if (filteredRooms.length > 0) {
            // Connect to selected room
            const selectedRoom = filteredRooms[selectedIndex];
            connectAnyDesk(selectedRoom.anydesk);
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
            Back to Escape Room Types
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            {escapeRoomType?.name} - Countries
          </h1>
          <p className="text-xl text-gray-600">
            Select a country to view available cities for {escapeRoomType?.name}
          </p>
        </header>

        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search countries or rooms in this type... (↓↑ to navigate, Enter to connect)"
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
              {filteredCountries.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    {filteredCountries.length} countr{filteredCountries.length !== 1 ? 'ies' : 'y'} found for "{searchQuery}"
                  </p>
                  <div ref={resultsContainerRef} className="space-y-2">
                    {filteredCountries.map((country, index) => (
                      <div
                        key={country}
                        onClick={() => onSelectCountry(country)}
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
                            <h3 className="text-lg font-bold text-gray-800">{country}</h3>
                            <p className="text-sm text-gray-600">{escapeRoomType?.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} found in {escapeRoomType?.name} for "{searchQuery}"
                  </p>
                  
                  {filteredRooms.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-gray-500">No countries or rooms found matching "{searchQuery}"</p>
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
                                  {room.cityName}, {room.country}
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
            <p className="text-gray-600">Loading countries...</p>
          </div>
        )}

        {!searchQuery && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {countries.map((country) => (
            <button
              key={country}
              onClick={() => onSelectCountry(country)}
              className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-red-500 hover:shadow-lg cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              type="button"
              role="button"
              tabIndex={0}
              aria-label={`Select ${country} country`}
            >
              <div className="mb-4 text-center">
                <img 
                  src={getCountryFlag(country)} 
                  alt={`${country} flag`}
                  className="w-16 h-12 mx-auto object-cover rounded"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 text-center">
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