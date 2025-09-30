import { useState, useRef, useEffect } from 'react';
import { getEscapeRoomTypes, getCityByNameAndType, getCountriesByType, getCitiesByCountryAndType } from '../data/data';

interface CommandLineProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandLine({ isOpen, onClose }: CommandLineProps) {
  const [inputValue, setInputValue] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const connectAnyDesk = async (anydeskId: string) => {
    try {
      const cleanId = anydeskId.replace(/\s+/g, '');
      await navigator.clipboard.writeText(anydeskId);
      const anydeskUrl = `anydesk:${cleanId}`;
      window.location.href = anydeskUrl;
    } catch (error) {
      setOutput(prev => [...prev, `Error connecting to AnyDesk: ${error}`]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    updateSuggestions(value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = inputValue.trim();
    if (command) {
      setOutput(prev => [...prev, `> ${command}`]);
      parseAndExecute(command);
    }
    setInputValue('');
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      const parts = inputValue.split(' ');
      parts[parts.length - 1] = suggestions[selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0];
      const newValue = parts.join(' ');
      setInputValue(newValue);
      updateSuggestions(newValue);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && suggestions.length > 0 && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const parts = inputValue.split(' ');
      parts[parts.length - 1] = suggestions[selectedSuggestionIndex];
      const newValue = parts.join(' ');
      setInputValue(newValue);
      setSuggestions([]); // Hide suggestions after selection
    }
  };

  const acronyms: { [key: string]: string } = {
    mt: 'mindtrap',
    mg: 'mindgolf',
    af: 'agent-factory',
    gr: 'Greece',
    ar: 'Aristotelous',
    ex: 'Exosrcism',
    mi: 'Middle',
  };

  const updateSuggestions = (value: string) => {
    const parts = value.split(' ');
    const cmd = parts[0];
    const lastPart = parts[parts.length - 1];

    if (parts.length === 1) {
      if ('connect'.startsWith(lastPart)) {
        setSuggestions(['connect']);
      } else {
        setSuggestions([]);
      }
    } else if (cmd === 'connect' && parts.length === 2) {
      const types = getEscapeRoomTypes().map(t => t.id);
      setSuggestions(types.filter(t => t.toLowerCase().includes(lastPart.toLowerCase())));
    } else if (cmd === 'connect' && parts.length === 3) {
      const type = acronyms[parts[1]] || parts[1];
      const countries = getCountriesByType(type);
      setSuggestions(countries.filter(c => c.toLowerCase().includes(lastPart.toLowerCase())));
    } else if (cmd === 'connect' && parts.length === 4) {
      const type = acronyms[parts[1]] || parts[1];
      const country = acronyms[parts[2]] || parts[2];
      const cities = getCitiesByCountryAndType(country, type).map(c => c.name);
      setSuggestions(cities.filter(c => c.toLowerCase().includes(lastPart.toLowerCase())));
    } else if (cmd === 'connect' && parts.length >= 5) {
        const type = acronyms[parts[1]] || parts[1];
        const city = acronyms[parts[3]] || parts[3];
        const cityData = getCityByNameAndType(city, type);
        if (cityData) {
            const rooms = cityData.rooms.map(r => r.name);
            const searchWords = parts.slice(4).join('').toLowerCase().split('');
            setSuggestions(rooms.filter(r => searchWords.every(word => r.toLowerCase().includes(word))));
        }
    } else {
      setSuggestions([]);
    }
    setSelectedSuggestionIndex(-1);
  };

  const parseAndExecute = (command: string) => {
    const parts = command.split(' ');
    let cmd = acronyms[parts[0]] || parts[0];
    let args = parts.slice(1);

    if (cmd === 'connect') {
        if(parts[0] === 'mt' || parts[0] === 'mg' || parts[0] === 'af'){
            args = [parts[0], ...args];
        }
      if (args.length < 4) {
        setOutput(prev => [...prev, 'Usage: connect <escaperoomtype> <country> <city> <room>']);
        return;
      }

      const [type, country, city, room] = args.map(arg => acronyms[arg] || arg);

      const escapeRoomType = getEscapeRoomTypes().find(t => t.id.toLowerCase() === type.toLowerCase());
      if (!escapeRoomType) {
        setOutput(prev => [...prev, `Escape room type not found: ${type}`]);
        return;
      }

      const cityData = getCityByNameAndType(city, escapeRoomType.id);
      if (!cityData || cityData.country.toLowerCase() !== country.toLowerCase()) {
        setOutput(prev => [...prev, `City not found in country: ${city}, ${country}`]);
        return;
      }

      const rooms = cityData.rooms;
      const searchWords = room.toLowerCase().split('');
      const matchedRooms = rooms.filter(r => searchWords.every(word => r.name.toLowerCase().includes(word)));

      if (matchedRooms.length === 0) {
        setOutput(prev => [...prev, `Room not found: ${room}`]);
        return;
      }

      let bestMatch = matchedRooms[0];
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        const selectedRoomName = suggestions[selectedSuggestionIndex];
        const selectedRoom = matchedRooms.find(r => r.name === selectedRoomName);
        if (selectedRoom) {
          bestMatch = selectedRoom;
        }
      }


      setOutput(prev => [...prev, `Connecting to ${bestMatch.name}...`]);
      connectAnyDesk(bestMatch.anydesk);
    } else {
      setOutput(prev => [...prev, `Unknown command: ${cmd}`]);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg"
      style={{ zIndex: 1000 }}
    >
      <div className="max-h-48 overflow-y-auto mb-2">
        {output.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
      <form onSubmit={handleFormSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="Enter a command..."
        />
      </form>
      {suggestions.length > 0 && (
        <ul className="bg-gray-700 border border-gray-600 rounded-md mt-1">
          {suggestions.map((suggestion, index) => (
            <li 
              key={index} 
              className={`px-2 py-1 text-sm ${index === selectedSuggestionIndex ? 'bg-red-500' : ''}`}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}