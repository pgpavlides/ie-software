import supabase from '../lib/supabase';

export interface RoomEntry {
  id: string;
  name: string;
  anydesk: string;
  ip?: string;
  notes?: string;
  city_id: string;
}

export interface CityData {
  id: string;
  name: string;
  country: string;
  escape_room_type_id: string;
  rooms?: RoomEntry[];
}

export interface EscapeRoomType {
  id: string;
  name: string;
  description: string;
}

// Get all escape room types
export async function getEscapeRoomTypes(): Promise<EscapeRoomType[]> {
  const { data, error } = await supabase
    .from('escape_room_types')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching escape room types:', error);
    return [];
  }

  return data || [];
}

// Get all countries for a specific escape room type
export async function getCountriesByType(typeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('country')
    .eq('escape_room_type_id', typeId)
    .order('country');

  if (error) {
    console.error('Error fetching countries:', error);
    return [];
  }

  // Get unique countries
  const countries = [...new Set(data?.map(city => city.country) || [])];
  return countries.sort();
}

// Get cities by country and escape room type
export async function getCitiesByCountryAndType(country: string, typeId: string): Promise<CityData[]> {
  const { data, error } = await supabase
    .from('cities')
    .select(`
      *,
      rooms(*)
    `)
    .eq('country', country)
    .eq('escape_room_type_id', typeId)
    .order('name');

  if (error) {
    console.error('Error fetching cities:', error);
    return [];
  }

  return data || [];
}

// Get a specific city with its rooms
export async function getCityWithRooms(cityName: string, typeId: string): Promise<CityData | null> {
  const { data: cityData, error: cityError } = await supabase
    .from('cities')
    .select('*')
    .eq('name', cityName)
    .eq('escape_room_type_id', typeId)
    .single();

  if (cityError || !cityData) {
    console.error('Error fetching city:', cityError);
    return null;
  }

  // Fetch rooms for this city
  const { data: roomsData, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .eq('city_id', cityData.id)
    .order('name');

  if (roomsError) {
    console.error('Error fetching rooms:', roomsError);
    return cityData;
  }

  return {
    ...cityData,
    rooms: roomsData || [],
  };
}

// Get a specific room
export async function getRoom(cityName: string, typeId: string, roomName: string): Promise<RoomEntry | null> {
  // First get the city
  const { data: cityData, error: cityError } = await supabase
    .from('cities')
    .select('id')
    .eq('name', cityName)
    .eq('escape_room_type_id', typeId)
    .single();

  if (cityError || !cityData) {
    console.error('Error fetching city:', cityError);
    return null;
  }

  // Then get the room
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('city_id', cityData.id)
    .eq('name', roomName)
    .single();

  if (roomError) {
    console.error('Error fetching room:', roomError);
    return null;
  }

  return roomData;
}

// Search rooms across all cities and types
export async function searchRooms(searchTerm: string): Promise<Array<RoomEntry & { city_name: string; country: string; type_id: string }>> {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      cities!inner(name, country, escape_room_type_id)
    `)
    .ilike('name', `%${searchTerm}%`)
    .order('name');

  if (error) {
    console.error('Error searching rooms:', error);
    return [];
  }

  // Transform the data to include city info at the top level
  return (data || []).map((room: any) => ({
    ...room,
    city_name: room.cities.name,
    country: room.cities.country,
    type_id: room.cities.escape_room_type_id,
  }));
}

// Get all cities for an escape room type (for global search)
export async function getAllCitiesByType(typeId: string): Promise<CityData[]> {
  const { data, error } = await supabase
    .from('cities')
    .select(`
      *,
      rooms(*)
    `)
    .eq('escape_room_type_id', typeId)
    .order('name');

  if (error) {
    console.error('Error fetching all cities:', error);
    return [];
  }

  return data || [];
}
