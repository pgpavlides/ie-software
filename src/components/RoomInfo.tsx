import { useState, useEffect } from 'react';
import { getRoom, getCityWithRooms, type RoomEntry, type CityData } from '../services/supabaseQueries';
import supabase from '../lib/supabase';

interface RoomInfoProps {
  cityName: string;
  escapeRoomTypeId: string;
  roomName: string;
  onBack: () => void;
}

export default function RoomInfo({ cityName, escapeRoomTypeId, roomName, onBack }: RoomInfoProps) {
  const [room, setRoom] = useState<RoomEntry | null>(null);
  const [city, setCity] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [roomData, cityData] = await Promise.all([
        getRoom(cityName, escapeRoomTypeId, roomName),
        getCityWithRooms(cityName, escapeRoomTypeId)
      ]);
      setRoom(roomData);
      setCity(cityData);
      setLoading(false);
    }
    fetchData();
  }, [cityName, escapeRoomTypeId, roomName]);

  if (loading) {
    return (
      <div className="min-h-full p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading room data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!room || !city) {
    return (
      <div className="min-h-full p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600">Room not found</p>
        </div>
      </div>
    );
  }

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  const handleDeleteRoom = async () => {
    if (!room) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id);

      if (error) throw error;

      // Navigate back after successful deletion
      onBack();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-full p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <span className="mr-2">←</span>
              Back to Rooms
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
              title="Delete this room"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Room
            </button>
          </div>

          <div className="flex items-center mb-6">
            <img
              src={getCountryFlag(city.country)}
              alt={`${city.country} flag`}
              className="w-12 h-8 mr-4 object-cover rounded"
            />
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                {room.name}
              </h1>
              <p className="text-xl text-gray-600">{city.name}, {city.country}</p>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8">
          {/* Room Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <span className="text-6xl mr-6">🖥️</span>
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{room.name}</h2>
                <p className="text-gray-600">Remote Desktop Connection</p>
              </div>
            </div>
            <button
              onClick={() => connectAnyDesk(room.anydesk)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              title="Connect with AnyDesk"
            >
              🚀 Connect Now
            </button>
          </div>

          {/* Connection Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                🆔 AnyDesk Connection
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 font-medium">AnyDesk ID:</span>
                  <button
                    onClick={() => copyToClipboard(room.anydesk)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded font-mono text-sm transition-colors"
                    title="Click to copy"
                  >
                    {room.anydesk}
                  </button>
                </div>
              </div>
            </div>

            {room.ip && (
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                  🌐 Network Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">IP Address:</span>
                    <button
                      onClick={() => copyToClipboard(room.ip!)}
                      className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded font-mono text-sm transition-colors"
                      title="Click to copy"
                    >
                      {room.ip}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          {room.notes && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
                📝 Additional Notes
              </h3>
              <p className="text-yellow-700">{room.notes}</p>
            </div>
          )}

          {/* Location Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              📍 Location Details
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">City:</span>
                <p className="text-gray-800">{city.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Country:</span>
                <p className="text-gray-800">{city.country}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Total Rooms:</span>
                <p className="text-gray-800">{city.rooms?.length || 0} rooms</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => connectAnyDesk(room.anydesk)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
            >
              Connect via AnyDesk
            </button>
            <button
              onClick={() => copyToClipboard(room.anydesk)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors"
            >
              Copy AnyDesk ID
            </button>
            {room.ip && (
              <button
                onClick={() => copyToClipboard(room.ip!)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors"
              >
                Copy IP Address
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Delete Room</h3>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{room.name}</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRoom}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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