import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';
import { getEscapeRoomTypes, getCountriesByType, getCitiesByCountryAndType, type EscapeRoomType, type CityData } from '../../services/supabaseQueries';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomAdded: () => void;
}

export default function AddRoomModal({ isOpen, onClose, onRoomAdded }: AddRoomModalProps) {
  const [escapeRoomTypes, setEscapeRoomTypes] = useState<EscapeRoomType[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedEscapeRoomType, setSelectedEscapeRoomType] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newCountryName, setNewCountryName] = useState('');
  const [isNewCity, setIsNewCity] = useState(false);
  const [isNewCountry, setIsNewCountry] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [anydesk, setAnydesk] = useState('');
  const [ip, setIp] = useState('');
  const [notes, setNotes] = useState('');

  // Load escape room types when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEscapeRoomTypes();
    }
  }, [isOpen]);

  // Load countries when escape room type is selected
  useEffect(() => {
    if (selectedEscapeRoomType) {
      loadCountries();
    } else {
      setCountries([]);
      setSelectedCountry('');
    }
  }, [selectedEscapeRoomType]);

  // Load cities when country is selected
  useEffect(() => {
    if (selectedCountry && selectedEscapeRoomType) {
      loadCities();
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedCountry, selectedEscapeRoomType]);

  const loadEscapeRoomTypes = async () => {
    setLoadingTypes(true);
    const types = await getEscapeRoomTypes();
    setEscapeRoomTypes(types);
    setLoadingTypes(false);
  };

  const loadCountries = async () => {
    setLoadingCountries(true);
    const countriesData = await getCountriesByType(selectedEscapeRoomType);
    setCountries(countriesData);
    setLoadingCountries(false);
  };

  const loadCities = async () => {
    setLoadingCities(true);
    const citiesData = await getCitiesByCountryAndType(selectedCountry, selectedEscapeRoomType);
    setCities(citiesData);
    setLoadingCities(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let cityId: string;

      // Determine the country name to use
      const countryName = isNewCountry ? newCountryName : selectedCountry;

      // Check if creating a new city or using existing one
      if (isNewCity) {
        // Create new city
        const { data: newCity, error: cityError } = await supabase
          .from('cities')
          .insert({
            name: newCityName,
            country: countryName,
            escape_room_type_id: selectedEscapeRoomType
          })
          .select()
          .single();

        if (cityError) throw cityError;
        cityId = newCity.id;
      } else {
        // Use existing city
        const selectedCityData = cities.find(c => c.name === selectedCity);
        if (!selectedCityData) throw new Error('City not found');
        cityId = selectedCityData.id;
      }

      // Create room
      const { error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: roomName,
          anydesk: anydesk,
          ip: ip || null,
          notes: notes || null,
          city_id: cityId
        });

      if (roomError) throw roomError;

      // Reset form
      resetForm();
      onRoomAdded();
      onClose();
    } catch (error) {
      console.error('Error adding room:', error);
      alert('Failed to add room. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedEscapeRoomType('');
    setSelectedCountry('');
    setSelectedCity('');
    setNewCityName('');
    setNewCountryName('');
    setIsNewCity(false);
    setIsNewCountry(false);
    setRoomName('');
    setAnydesk('');
    setIp('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Add New Room</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Escape Room Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Escape Room Type *
            </label>
            <select
              required
              value={selectedEscapeRoomType}
              onChange={(e) => {
                setSelectedEscapeRoomType(e.target.value);
                setSelectedCountry('');
                setIsNewCity(false);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loadingTypes}
            >
              <option value="">Select an escape room type</option>
              {escapeRoomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Country Selection */}
          {selectedEscapeRoomType && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Country *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCountry(!isNewCountry);
                    setSelectedCountry('');
                    setNewCountryName('');
                    setIsNewCity(false);
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  {isNewCountry ? 'Select existing country' : '+ Add new country'}
                </button>
              </div>

              {isNewCountry ? (
                <input
                  type="text"
                  required
                  value={newCountryName}
                  onChange={(e) => setNewCountryName(e.target.value)}
                  placeholder="Enter new country name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              ) : (
                <select
                  required
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setIsNewCity(false);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={loadingCountries}
                >
                  <option value="">Select a country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* City Selection or New City */}
          {(selectedCountry || newCountryName) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  City *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCity(!isNewCity);
                    setSelectedCity('');
                    setNewCityName('');
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  {isNewCity ? 'Select existing city' : '+ Add new city'}
                </button>
              </div>

              {isNewCity ? (
                <input
                  type="text"
                  required
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="Enter new city name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              ) : (
                <select
                  required
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={loadingCities}
                >
                  <option value="">
                    {loadingCities ? 'Loading cities...' : cities.length === 0 ? 'No cities available - create a new one' : 'Select a city'}
                  </option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name *
            </label>
            <input
              type="text"
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Room 1, Main Hall, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* AnyDesk ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AnyDesk ID *
            </label>
            <input
              type="text"
              required
              value={anydesk}
              onChange={(e) => setAnydesk(e.target.value)}
              placeholder="e.g., 123 456 789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* IP Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IP Address (Optional)
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g., 192.168.1.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information about this room..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Adding Room...' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
