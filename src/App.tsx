import { useState } from 'react'
import HomePage from './components/HomePage'
import CountryGrid from './components/CountryGrid'
import CityGrid from './components/CityGrid'
import RoomDetails from './components/RoomDetails'

type ViewType = 'home' | 'countries' | 'cities' | 'rooms';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category)
    if (category === 'room') {
      setCurrentView('countries')
    } else {
      // For now, other categories will show a placeholder
      alert(`${category} category is coming soon!`)
    }
  }

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country)
    setCurrentView('cities')
  }

  const handleSelectCity = (city: string) => {
    setSelectedCity(city)
    setCurrentView('rooms')
  }

  const handleBackToHome = () => {
    setCurrentView('home')
    setSelectedCategory('')
    setSelectedCountry('')
    setSelectedCity('')
  }

  const handleBackToCountries = () => {
    setCurrentView('countries')
    setSelectedCountry('')
    setSelectedCity('')
  }

  const handleBackToCities = () => {
    setCurrentView('cities')
    setSelectedCity('')
  }

  return (
    <div className="App">
      {currentView === 'home' && (
        <HomePage onSelectCategory={handleSelectCategory} />
      )}
      
      {currentView === 'countries' && (
        <CountryGrid 
          onSelectCountry={handleSelectCountry} 
          onBack={handleBackToHome}
        />
      )}
      
      {currentView === 'cities' && (
        <CityGrid 
          country={selectedCountry}
          onSelectCity={handleSelectCity} 
          onBack={handleBackToCountries}
        />
      )}
      
      {currentView === 'rooms' && (
        <RoomDetails 
          cityName={selectedCity}
          onBack={handleBackToCities}
        />
      )}
    </div>
  )
}

export default App
