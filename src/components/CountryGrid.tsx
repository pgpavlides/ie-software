import { getCountriesByType, getEscapeRoomTypeById } from '../data/data';

interface CountryGridProps {
  escapeRoomTypeId: string;
  onSelectCountry: (country: string) => void;
  onBack: () => void;
}

export default function CountryGrid({ escapeRoomTypeId, onSelectCountry, onBack }: CountryGridProps) {
  const countries = getCountriesByType(escapeRoomTypeId);
  const escapeRoomType = getEscapeRoomTypeById(escapeRoomTypeId);

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
      </div>
    </div>
  );
}