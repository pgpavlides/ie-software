import { getCityByName } from '../data/roomData';

interface RoomDetailsProps {
  cityName: string;
  onBack: () => void;
}

export default function RoomDetails({ cityName, onBack }: RoomDetailsProps) {
  const city = getCityByName(cityName);
  
  if (!city) {
    return (
      <div className="min-h-full p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600">City not found</p>
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
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button 
            onClick={onBack}
            className="mb-4 flex items-center text-red-600 hover:text-red-800 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Cities
          </button>
          <div className="flex items-center mb-4">
            <img 
              src={getCountryFlag(city.country)} 
              alt={`${city.country} flag`}
              className="w-12 h-8 mr-4 object-cover rounded"
            />
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                {city.name}
              </h1>
              <p className="text-xl text-gray-600">{city.country}</p>
            </div>
          </div>
          <p className="text-lg text-gray-600">
            {city.rooms.length} room{city.rooms.length !== 1 ? 's' : ''} available
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {city.rooms.map((room, index) => (
            <div
              key={index}
              className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800 flex-1">
                  {room.name}
                </h3>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-2xl">🖥️</span>
                  <button
                    onClick={() => connectAnyDesk(room.anydesk)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-colors"
                    title="Copy ID and open AnyDesk"
                  >
                    Connect
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">AnyDesk ID:</span>
                  <button
                    onClick={() => copyToClipboard(room.anydesk)}
                    className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded font-mono transition-colors"
                    title="Click to copy"
                  >
                    {room.anydesk}
                  </button>
                </div>
                
                {room.ip && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 font-medium">IP Address:</span>
                    <button
                      onClick={() => copyToClipboard(room.ip!)}
                      className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded font-mono transition-colors"
                      title="Click to copy"
                    >
                      {room.ip}
                    </button>
                  </div>
                )}
                
                {room.notes && (
                  <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                    <p className="text-sm text-yellow-800">
                      <strong>Notes:</strong> {room.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}