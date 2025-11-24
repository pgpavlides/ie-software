import { useState, useEffect } from 'react';
import { getAllCountries, updateCountryName, getCountryStats } from '../../services/supabaseQueries';

interface CountryInfo {
  name: string;
  cities: number;
  rooms: number;
}

interface CountryManagementProps {
  onBack: () => void;
}

export default function CountryManagement({ onBack }: CountryManagementProps) {
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editFlag, setEditFlag] = useState('');
  const [saving, setSaving] = useState(false);

  // Country flag mappings - this should ideally be stored in the database
  const [flagMappings, setFlagMappings] = useState<Record<string, string>>({
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
  });

  useEffect(() => {
    // Load flag mappings from localStorage
    const savedMappings = localStorage.getItem('countryFlagMappings');
    if (savedMappings) {
      try {
        const parsed = JSON.parse(savedMappings);
        setFlagMappings({ ...flagMappings, ...parsed });
      } catch (error) {
        console.error('Error parsing saved flag mappings:', error);
      }
    }
    
    loadCountries();
  }, []);

  const loadCountries = async () => {
    setLoading(true);
    try {
      const countryNames = await getAllCountries();
      const countryInfos: CountryInfo[] = [];

      for (const country of countryNames) {
        const stats = await getCountryStats(country);
        countryInfos.push({
          name: country,
          cities: stats.cities,
          rooms: stats.rooms
        });
      }

      setCountries(countryInfos);
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (country: CountryInfo) => {
    setEditingCountry(country.name);
    setEditName(country.name);
    setEditFlag(flagMappings[country.name] || '/flags/xx.svg');
  };

  const cancelEditing = () => {
    setEditingCountry(null);
    setEditName('');
    setEditFlag('');
  };

  const saveChanges = async () => {
    if (!editingCountry || !editName.trim()) return;

    setSaving(true);
    try {
      // Update country name in database if it changed
      if (editName !== editingCountry) {
        const result = await updateCountryName(editingCountry, editName);
        if (!result.success) {
          alert(`Failed to update country name: ${result.error}`);
          setSaving(false);
          return;
        }
      }

      // Update flag mapping in local storage or state
      // In a real app, this would be stored in the database
      const newMappings = { ...flagMappings };
      delete newMappings[editingCountry];
      newMappings[editName] = editFlag;
      setFlagMappings(newMappings);
      localStorage.setItem('countryFlagMappings', JSON.stringify(newMappings));

      // Reload countries to reflect changes
      await loadCountries();
      cancelEditing();
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableFlags = () => {
    // List of available flag files (this could be dynamically loaded)
    return [
      { code: 'ad', name: 'Andorra', file: '/flags/ad.svg' },
      { code: 'ae', name: 'UAE', file: '/flags/ae.svg' },
      { code: 'au', name: 'Australia', file: '/flags/au.svg' },
      { code: 'bg', name: 'Bulgaria', file: '/flags/bg.svg' },
      { code: 'ca', name: 'Canada', file: '/flags/ca.svg' },
      { code: 'ch', name: 'Switzerland', file: '/flags/ch.svg' },
      { code: 'de', name: 'Germany', file: '/flags/de.svg' },
      { code: 'fr', name: 'France', file: '/flags/fr.svg' },
      { code: 'gb', name: 'United Kingdom', file: '/flags/gb.svg' },
      { code: 'gr', name: 'Greece', file: '/flags/gr.svg' },
      { code: 'ke', name: 'Kenya', file: '/flags/ke.svg' },
      { code: 'lu', name: 'Luxembourg', file: '/flags/lu.svg' },
      { code: 'nl', name: 'Netherlands', file: '/flags/nl.svg' },
      { code: 'pt', name: 'Portugal', file: '/flags/pt.svg' },
      { code: 'sk', name: 'Slovakia', file: '/flags/sk.svg' },
      { code: 'us', name: 'United States', file: '/flags/us.svg' },
      { code: 'xx', name: 'Default', file: '/flags/xx.svg' }
    ];
  };

  if (loading) {
    return (
      <div className="min-h-full p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading countries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <button 
            onClick={onBack}
            className="mb-4 flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <span className="mr-2">←</span>
            Back to Admin
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Country Management</h1>
          <p className="text-xl text-gray-600">
            Edit country names and flag images. Changes will affect all cities and rooms in these countries.
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Countries ({countries.length})</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {countries.map((country) => (
              <div key={country.name} className="p-6">
                {editingCountry === country.name ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Enter country name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Flag Image
                        </label>
                        <select
                          value={editFlag}
                          onChange={(e) => setEditFlag(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          {getAvailableFlags().map((flag) => (
                            <option key={flag.code} value={flag.file}>
                              {flag.name} ({flag.code.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <img 
                        src={editFlag} 
                        alt="Preview" 
                        className="w-8 h-6 object-cover rounded"
                      />
                      <span className="text-sm text-gray-600">Flag Preview</span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={saveChanges}
                        disabled={saving || !editName.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img 
                        src={flagMappings[country.name] || '/flags/xx.svg'} 
                        alt={`${country.name} flag`}
                        className="w-12 h-8 object-cover rounded shadow-sm"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{country.name}</h3>
                        <p className="text-sm text-gray-600">
                          {country.cities} cities • {country.rooms} rooms
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => startEditing(country)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Changing a country name will update all cities and rooms associated with that country. 
                Flag changes are stored locally and may need to be updated on other devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}