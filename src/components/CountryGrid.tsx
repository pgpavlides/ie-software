import { getCountries } from '../data/roomData';

interface CountryGridProps {
  onSelectCountry: (country: string) => void;
  onBack: () => void;
}

export default function CountryGrid({ onSelectCountry, onBack }: CountryGridProps) {
  const countries = getCountries();

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

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button 
            onClick={onBack}
            className="mb-4 flex items-center text-red-600 hover:text-red-800 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Categories
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Room Management - Countries
          </h1>
          <p className="text-xl text-gray-600">
            Select a country to view available cities
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {countries.map((country) => (
            <div
              key={country}
              onClick={() => onSelectCountry(country)}
              className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-red-500 hover:shadow-lg cursor-pointer transition-all duration-200"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}