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

export interface OvertimeEntry {
  id: string;
  user_id: string;
  date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  description?: string;
  reason?: string;
  project?: string;
  hours_worked: number;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface OvertimeStats {
  total_entries: number;
  total_hours: number;
  approved_hours: number;
  pending_hours: number;
  unique_users: number;
}

export interface CreateOvertimeData {
  user_id: string;
  date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  description?: string;
  reason?: string;
  project?: string;
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
  try {
    const { data: cityData, error: cityError } = await supabase
      .from('cities')
      .select('*')
      .eq('name', cityName)
      .eq('escape_room_type_id', typeId)
      .single();

    if (cityError) {
      console.error('Error fetching city:', cityError);
      throw new Error(`Failed to fetch city: ${cityError.message}`);
    }

    if (!cityData) {
      console.warn(`City not found: ${cityName} for type ${typeId}`);
      return null;
    }

    // Fetch rooms for this city with retry logic
    let retries = 3;
    let roomsData = null;
    
    while (retries > 0) {
      const { data, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('city_id', cityData.id)
        .order('name');

      if (!roomsError) {
        roomsData = data;
        break;
      }

      console.error(`Error fetching rooms (attempt ${4 - retries}):`, roomsError);
      retries--;
      
      if (retries > 0) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (retries === 0) {
      console.error('Failed to fetch rooms after 3 attempts');
      // Return city data without rooms rather than failing completely
      return {
        ...cityData,
        rooms: [],
      };
    }

    return {
      ...cityData,
      rooms: roomsData || [],
    };
  } catch (error) {
    console.error('Unexpected error in getCityWithRooms:', error);
    return null;
  }
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

// Admin Functions for Country Management

// Update country name across all cities
export async function updateCountryName(oldName: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('cities')
      .update({ country: newName })
      .eq('country', oldName);

    if (error) {
      console.error('Error updating country name:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating country name:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Get all unique countries
export async function getAllCountries(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('country')
      .order('country');

    if (error) {
      console.error('Error fetching all countries:', error);
      return [];
    }

    // Get unique countries
    const countries = [...new Set(data?.map(city => city.country) || [])];
    return countries.sort();
  } catch (error) {
    console.error('Unexpected error fetching countries:', error);
    return [];
  }
}

// Get country usage stats
export async function getCountryStats(country: string): Promise<{ cities: number; rooms: number }> {
  try {
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id')
      .eq('country', country);

    if (citiesError) {
      console.error('Error fetching country stats:', citiesError);
      return { cities: 0, rooms: 0 };
    }

    let totalRooms = 0;
    if (cities && cities.length > 0) {
      const cityIds = cities.map(city => city.id);
      const { count: roomCount, error: roomsError } = await supabase
        .from('rooms')
        .select('id', { count: 'exact' })
        .in('city_id', cityIds);

      if (roomsError) {
        console.error('Error fetching room count:', roomsError);
      } else {
        totalRooms = roomCount || 0;
      }
    }

    return {
      cities: cities?.length || 0,
      rooms: totalRooms
    };
  } catch (error) {
    console.error('Unexpected error fetching country stats:', error);
    return { cities: 0, rooms: 0 };
  }
}

// OVERTIME MANAGEMENT FUNCTIONS

// Get all overtime entries
export async function getAllOvertimes(): Promise<OvertimeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('overtimes')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching overtimes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching overtimes:', error);
    return [];
  }
}

// Get overtime entries for a specific user
export async function getUserOvertimes(userId: string): Promise<OvertimeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('overtimes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching user overtimes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching user overtimes:', error);
    return [];
  }
}

// Get overtime entries for a date range
export async function getOvertimesByDateRange(startDate: string, endDate: string): Promise<OvertimeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('overtimes')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching overtimes by date range:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching overtimes by date range:', error);
    return [];
  }
}

// Create a new overtime entry
export async function createOvertime(overtimeData: CreateOvertimeData): Promise<{ success: boolean; error?: string; data?: OvertimeEntry }> {
  try {
    const { data, error } = await supabase
      .from('overtimes')
      .insert([overtimeData])
      .select()
      .single();

    if (error) {
      console.error('Error creating overtime:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error creating overtime:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Update an overtime entry
export async function updateOvertime(id: string, updates: Partial<CreateOvertimeData>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('overtimes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating overtime:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating overtime:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Delete an overtime entry
export async function deleteOvertime(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('overtimes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting overtime:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting overtime:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Approve an overtime entry
export async function approveOvertime(id: string, approverId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('overtimes')
      .update({
        is_approved: true,
        approved_by: approverId,
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error approving overtime:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error approving overtime:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Get overtime statistics
export async function getOvertimeStats(startDate?: string, endDate?: string): Promise<OvertimeStats | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_overtime_stats', {
        start_date: startDate || null,
        end_date: endDate || null
      });

    if (error) {
      console.error('Error fetching overtime stats:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Unexpected error fetching overtime stats:', error);
    return null;
  }
}

// Check if current user is admin
export async function isUserAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        roles!inner(name)
      `)
      .eq('user_id', user.id)
      .eq('roles.name', 'Admin');

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return (data || []).length > 0;
  } catch (error) {
    console.error('Unexpected error checking admin status:', error);
    return false;
  }
}

// Get current user info 
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || 'No Email',
      displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Get user display names for multiple user IDs (for overtime entries)
export async function getUserDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  try {
    // For now, we can only get the current user's info reliably
    // We'll create a mapping with fallback display names
    const currentUser = await getCurrentUser();
    const displayNameMap: Record<string, string> = {};
    
    userIds.forEach(userId => {
      if (userId === currentUser?.id) {
        displayNameMap[userId] = currentUser.displayName;
      } else {
        // For other users, show email prefix or fallback
        displayNameMap[userId] = `User ${userId.substring(0, 8)}`;
      }
    });
    
    return displayNameMap;
  } catch (error) {
    console.error('Error getting user display names:', error);
    return {};
  }
}

// Update user password
export async function updateUserPassword(_currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({ 
      password: newPassword 
    });

    if (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating password:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Update user metadata (display name, etc.)
export async function updateUserProfile(displayName: string, avatarUrl?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: { display_name: string; full_name: string; avatar_url?: string } = {
      display_name: displayName,
      full_name: displayName // Store in both fields for consistency
    };
    if (avatarUrl !== undefined) {
      updateData.avatar_url = avatarUrl;
    }

    const { error } = await supabase.auth.updateUser({
      data: updateData
    });

    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating profile:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Upload avatar image
export async function uploadAvatar(userId: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    // Delete existing avatar first (if any)
    await supabase.storage
      .from('avatars')
      .remove([fileName]);

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Add cache-busting query param
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update user metadata with avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl }
    });

    if (updateError) {
      console.error('Error updating user avatar metadata:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, url: avatarUrl };
  } catch (error) {
    console.error('Unexpected error uploading avatar:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Get avatar URL for a user
export async function getAvatarUrl(userId: string): Promise<string | null> {
  try {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(`${userId}/avatar.jpg`);

    // Check if the file actually exists by trying to fetch it
    const response = await fetch(data.publicUrl, { method: 'HEAD' });
    if (response.ok) {
      return data.publicUrl;
    }

    // Try other extensions
    for (const ext of ['png', 'jpeg', 'webp', 'gif']) {
      const { data: extData } = supabase.storage
        .from('avatars')
        .getPublicUrl(`${userId}/avatar.${ext}`);

      const extResponse = await fetch(extData.publicUrl, { method: 'HEAD' });
      if (extResponse.ok) {
        return extData.publicUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting avatar URL:', error);
    return null;
  }
}

// Get full user profile including avatar
export async function getFullUserProfile() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get user roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select(`
        roles(name, color, description)
      `)
      .eq('user_id', user.id);

    const roles = rolesData?.map((r: any) => r.roles) || [];

    return {
      id: user.id,
      email: user.email || '',
      displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      avatarUrl: user.user_metadata?.avatar_url || null,
      roles,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at
    };
  } catch (error) {
    console.error('Error getting full user profile:', error);
    return null;
  }
}
