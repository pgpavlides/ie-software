import { useState, useEffect, memo } from 'react';
import { getRoom, getCityWithRooms, type RoomEntry, type CityData } from '../services/supabaseQueries';
import supabase from '../lib/supabase';

interface RoomInfoProps {
  cityName: string;
  escapeRoomTypeId: string;
  roomName: string;
  onBack: () => void;
}

function RoomInfo({ cityName, escapeRoomTypeId, roomName, onBack }: RoomInfoProps) {
  const [room, setRoom] = useState<RoomEntry | null>(null);
  const [city, setCity] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    anydesk: '',
    ip: '',
    notes: ''
  });
  const [updating, setUpdating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      if (isCancelled) return;

      const cacheKey = `room_data_${cityName}_${escapeRoomTypeId}_${roomName}`;
      const cacheTimeKey = `room_data_${cityName}_${escapeRoomTypeId}_${roomName}_time`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheTimeKey);

      if (cached && cacheTime && !isCancelled) {
        const age = Date.now() - parseInt(cacheTime);

        if (age < 5 * 60 * 1000) {
          try {
            const cachedData = JSON.parse(cached);
            if (cachedData.room && cachedData.city) {
              setRoom(cachedData.room);
              setCity(cachedData.city);

              if (cachedData.room) {
                setEditForm({
                  name: cachedData.room.name,
                  anydesk: cachedData.room.anydesk,
                  ip: cachedData.room.ip || '',
                  notes: cachedData.room.notes || ''
                });
              }

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error parsing cached room data:', error);
          }
        }
      }

      if (isCancelled) return;
      setLoading(true);

      try {
        const [roomData, cityData] = await Promise.all([
          getRoom(cityName, escapeRoomTypeId, roomName),
          getCityWithRooms(cityName, escapeRoomTypeId)
        ]);

        if (!isCancelled) {
          setRoom(roomData);
          setCity(cityData);

          if (roomData) {
            setEditForm({
              name: roomData.name,
              anydesk: roomData.anydesk,
              ip: roomData.ip || '',
              notes: roomData.notes || ''
            });
          }

          if (roomData && cityData) {
            const dataToCache = {
              room: roomData,
              city: cityData
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
            sessionStorage.setItem(cacheTimeKey, Date.now().toString());
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching room data:', error);
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
  }, [cityName, escapeRoomTypeId, roomName]);

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

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

  const handleDeleteRoom = async () => {
    if (!room) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id);

      if (error) throw error;
      onBack();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!room) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .update({
          name: editForm.name,
          anydesk: editForm.anydesk,
          ip: editForm.ip || null,
          notes: editForm.notes || null
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;

      setRoom(data);
      setIsEditing(false);

      const cacheKey = `room_data_${cityName}_${escapeRoomTypeId}_${roomName}`;
      const cacheTimeKey = `room_data_${cityName}_${escapeRoomTypeId}_${roomName}_time`;
      const dataToCache = {
        room: data,
        city: city
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      sessionStorage.setItem(cacheTimeKey, Date.now().toString());

      alert('Room updated successfully!');
    } catch (error) {
      console.error('Error updating room:', error);
      alert('Failed to update room. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    if (room) {
      setEditForm({
        name: room.name,
        anydesk: room.anydesk,
        ip: room.ip || '',
        notes: room.notes || ''
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#ea2127] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading room data...</p>
        </div>
      </div>
    );
  }

  if (!room || !city) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[#ea2127] font-medium">Room not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ea2127] rounded-full blur-[200px] opacity-[0.03]" />

      <div className="relative z-10 p-6 lg:p-10 max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <button
              onClick={onBack}
              className="group flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1f] hover:bg-[#222228] text-[#a0a0b0] hover:text-white border border-[#2a2a35] hover:border-[#ea2127]/50 rounded-xl transition-all duration-200 w-fit"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Rooms</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl transition-colors shadow-lg shadow-[#3b82f6]/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-sm font-medium">Edit</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1f] hover:bg-[#ea2127]/10 text-[#a0a0b0] hover:text-[#ea2127] border border-[#2a2a35] hover:border-[#ea2127]/50 rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-sm font-medium">Delete</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={getCountryFlag(city.country)}
              alt={city.country}
              className="w-12 h-8 rounded object-cover shadow-lg"
            />
            <div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-10 bg-[#ea2127] rounded-full" />
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    {room.name}
                  </h1>
                  <p className="text-[#6b6b7a]">{city.name}, {city.country}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Card */}
        <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
          {/* Room Header */}
          <div className="p-6 border-b border-[#1f1f28]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#1f1f28] flex items-center justify-center text-4xl">
                  🖥️
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{room.name}</h2>
                  <p className="text-[#6b6b7a]">Remote Desktop Connection</p>
                </div>
              </div>
              <button
                onClick={() => connectAnyDesk(room.anydesk)}
                className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea2127] to-[#d11920] hover:from-[#ff3b42] hover:to-[#ea2127] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#ea2127]/20"
              >
                <span>Connect Now</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Connection Details */}
          <div className="p-6 grid md:grid-cols-2 gap-4">
            {/* AnyDesk Card */}
            <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#3b82f6]">AnyDesk Connection</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8b8b9a]">AnyDesk ID</span>
                <button
                  onClick={() => copyToClipboard(room.anydesk, 'anydesk')}
                  className={`font-mono text-sm px-4 py-2 rounded-lg transition-all ${
                    copiedField === 'anydesk'
                      ? 'bg-[#10b981]/20 text-[#10b981]'
                      : 'bg-[#3b82f6]/20 text-[#3b82f6] hover:bg-[#3b82f6]/30'
                  }`}
                >
                  {copiedField === 'anydesk' ? 'Copied!' : room.anydesk}
                </button>
              </div>
            </div>

            {/* IP Card */}
            {room.ip && (
              <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[#10b981]">Network Information</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b8b9a]">IP Address</span>
                  <button
                    onClick={() => copyToClipboard(room.ip!, 'ip')}
                    className={`font-mono text-sm px-4 py-2 rounded-lg transition-all ${
                      copiedField === 'ip'
                        ? 'bg-[#10b981]/30 text-[#10b981]'
                        : 'bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30'
                    }`}
                  >
                    {copiedField === 'ip' ? 'Copied!' : room.ip}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {room.notes && (
            <div className="px-6 pb-6">
              <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[#f59e0b]">Notes</h3>
                </div>
                <p className="text-[#d4a574]">{room.notes}</p>
              </div>
            </div>
          )}

          {/* Location Info */}
          <div className="px-6 pb-6">
            <div className="bg-[#1a1a1f] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-[#6b6b7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">Location Details</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-[#6b6b7a]">City</span>
                  <p className="text-white font-medium">{city.name}</p>
                </div>
                <div>
                  <span className="text-sm text-[#6b6b7a]">Country</span>
                  <p className="text-white font-medium">{city.country}</p>
                </div>
                <div>
                  <span className="text-sm text-[#6b6b7a]">Total Rooms</span>
                  <p className="text-white font-medium">{city.rooms?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => connectAnyDesk(room.anydesk)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl transition-colors"
              >
                <img src="/logo/anydesk-seeklogo.png" alt="AnyDesk" className="w-5 h-5" />
                <span className="text-sm font-medium">Connect via AnyDesk</span>
              </button>
              <button
                onClick={() => copyToClipboard(room.anydesk, 'anydesk-quick')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#a0a0b0] hover:text-white rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span className="text-sm font-medium">
                  {copiedField === 'anydesk-quick' ? 'Copied!' : 'Copy AnyDesk ID'}
                </span>
              </button>
              {room.ip && (
                <button
                  onClick={() => copyToClipboard(room.ip!, 'ip-quick')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#a0a0b0] hover:text-white rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span className="text-sm font-medium">
                    {copiedField === 'ip-quick' ? 'Copied!' : 'Copy IP Address'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Room Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-[#141418] border-b border-[#2a2a35] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Room</h2>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Room Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">AnyDesk ID *</label>
                  <input
                    type="text"
                    required
                    value={editForm.anydesk}
                    onChange={(e) => setEditForm({ ...editForm, anydesk: e.target.value })}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">IP Address (Optional)</label>
                  <input
                    type="text"
                    value={editForm.ip}
                    onChange={(e) => setEditForm({ ...editForm, ip: e.target.value })}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Notes (Optional)</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/20 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-[#2a2a35] px-6 py-4 flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#a0a0b0] hover:text-white rounded-xl transition-colors"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRoom}
                  className="flex-1 px-4 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl transition-colors disabled:opacity-50"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Update Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#ea2127]/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Delete Room</h3>
                  <p className="text-[#6b6b7a] text-sm">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-[#8b8b9a] mb-6">
                Are you sure you want to delete <span className="text-white font-medium">{room.name}</span>?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#a0a0b0] hover:text-white rounded-xl transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRoom}
                  className="flex-1 px-4 py-3 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl transition-colors disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(RoomInfo);
