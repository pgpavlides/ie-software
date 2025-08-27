import { getCityByName } from '../data/roomData';

interface RoomInfoProps {
  cityName: string;
  roomName: string;
  onBack: () => void;
}

export default function RoomInfo({ cityName, roomName, onBack }: RoomInfoProps) {
  const city = getCityByName(cityName);
  const room = city?.rooms.find(r => r.name === roomName);
  
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
      'Netherlands': '/flags/nl.svg'
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

  return (
    <div className="min-h-full p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <button 
            onClick={onBack}
            className="mb-4 flex items-center text-red-600 hover:text-red-800 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Rooms
          </button>
          
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
                <p className="text-gray-800">{city.rooms.length} rooms</p>
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
      </div>
    </div>
  );
}