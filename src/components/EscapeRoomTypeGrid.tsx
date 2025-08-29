import { getEscapeRoomTypes, type EscapeRoomType } from '../data/data';

interface EscapeRoomTypeGridProps {
  onSelectType: (typeId: string) => void;
  onBack: () => void;
}

export default function EscapeRoomTypeGrid({ onSelectType, onBack }: EscapeRoomTypeGridProps) {
  const escapeRoomTypes = getEscapeRoomTypes();

  const getLogoPath = (typeId: string): string => {
    const logoMap: Record<string, string> = {
      'mindtrap': '/logo/mindtrap_logo.png',
      'agent-factory': '/logo/agent_logo.png', 
      'mindgolf': '/logo/mindgolf_logo.png'
    };
    return logoMap[typeId] || '/logo/default.svg';
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
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Select Escape Room Type
          </h1>
          <p className="text-xl text-gray-600">
            Choose your escape room experience
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {escapeRoomTypes.map((type: EscapeRoomType) => (
            <button
              key={type.id}
              onClick={() => onSelectType(type.id)}
              className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-red-500 hover:shadow-lg cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              type="button"
              role="button"
              tabIndex={0}
              aria-label={`Select ${type.name} escape room type`}
            >
              <div className="text-center">
                <div className="mb-4">
                  <img  
                    src={getLogoPath(type.id)} 
                    alt={`${type.name} logo`}
                    className={`mx-auto object-contain ${type.id === 'agent-factory' ? 'w-32 h-20' : 'w-20 h-20'}`}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {type.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {type.cities.length} cit{type.cities.length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}