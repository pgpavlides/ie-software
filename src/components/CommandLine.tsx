import { useState, useRef, useEffect } from 'react';
import { getEscapeRoomTypes, getCityByNameAndType, getCountriesByType, getCitiesByCountryAndType } from '../data/data';

interface CommandLineProps {
  isOpen: boolean;
  onClose: () => void;
}

type OutputLine = {
  text: string;
  type: 'command' | 'success' | 'error' | 'info';
};

export default function CommandLine({ isOpen, onClose }: CommandLineProps) {
  const [inputValue, setInputValue] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([]);
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
      setOutput(prev => [...prev, { text: `Error connecting to AnyDesk: ${error}`, type: 'error' }]);
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
      setOutput(prev => [...prev, { text: `> ${command}`, type: 'command' }]);
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
      const newValue = parts.join(' ') + ' '; // Add space automatically
      setInputValue(newValue);
      updateSuggestions(newValue); // Update suggestions for next step
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
        setOutput(prev => [...prev, { text: 'Usage: connect <escaperoomtype> <country> <city> <room>', type: 'info' }]);
        return;
      }

      const [type, country, city, room] = args.map(arg => acronyms[arg] || arg);

      const escapeRoomType = getEscapeRoomTypes().find(t => t.id.toLowerCase() === type.toLowerCase());
      if (!escapeRoomType) {
        setOutput(prev => [...prev, { text: `Escape room type not found: ${type}`, type: 'error' }]);
        return;
      }

      const cityData = getCityByNameAndType(city, escapeRoomType.id);
      if (!cityData || cityData.country.toLowerCase() !== country.toLowerCase()) {
        setOutput(prev => [...prev, { text: `City not found in country: ${city}, ${country}`, type: 'error' }]);
        return;
      }

      const rooms = cityData.rooms;
      const searchWords = room.toLowerCase().split('');
      const matchedRooms = rooms.filter(r => searchWords.every(word => r.name.toLowerCase().includes(word)));

      if (matchedRooms.length === 0) {
        setOutput(prev => [...prev, { text: `Room not found: ${room}`, type: 'error' }]);
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


      setOutput(prev => [...prev, { text: `✓ Connecting to ${bestMatch.name}...`, type: 'success' }]);
      connectAnyDesk(bestMatch.anydesk);
    } else {
      setOutput(prev => [...prev, { text: `Unknown command: ${cmd}`, type: 'error' }]);
    }
  };

  const getLineColor = (type: OutputLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 shadow-2xl animate-slide-up"
      style={{
        zIndex: 1000,
        background: 'linear-gradient(to bottom, #1a1a1a 0%, #0d0d0d 100%)',
        borderTop: '1px solid #333'
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Output area */}
        <div className="max-h-64 overflow-y-auto px-6 pt-4 pb-2 font-mono text-sm">
          {output.map((line, index) => (
            <div key={index} className={`mb-1 ${getLineColor(line.type)}`}>
              {line.text}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="px-6 pb-4">
          <form onSubmit={handleFormSubmit}>
            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition-all">
              <span className="text-red-500 font-bold mr-2 font-mono">$</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder-gray-500"
                placeholder="Type a command..."
                autoComplete="off"
              />
            </div>
          </form>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-2 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 font-mono text-sm cursor-pointer transition-all ${
                    index === selectedSuggestionIndex
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-750'
                  }`}
                >
                  {index === selectedSuggestionIndex && <span className="mr-2">▶</span>}
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}