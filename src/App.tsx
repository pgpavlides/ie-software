import { useState } from 'react'
import Layout from './components/Layout'
import HomePage from './components/HomePage'
import CountryGrid from './components/CountryGrid'
import CityGrid from './components/CityGrid'
import RoomDetails from './components/RoomDetails'
import RoomInfo from './components/RoomInfo'
import MonitoringPage from './components/MonitoringPage'
import SecurityPage from './components/SecurityPage'
import ReportsPage from './components/ReportsPage'
import UtilitiesPage from './components/UtilitiesPage'
import { DeveloperOptionsProvider } from './contexts/DeveloperOptionsContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './components/LoginPage'

type ViewType = 'home' | 'countries' | 'cities' | 'rooms' | 'room-info';
type CategoryType = 'dashboard' | 'room' | 'technical' | 'monitoring' | 'security' | 'reports' | 'utilities';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('dashboard')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedRoom, setSelectedRoom] = useState<string>('')

  const handleNavigate = (category: string) => {
    setSelectedCategory(category as CategoryType)
    if (category === 'dashboard') {
      setCurrentView('home')
      // Reset navigation state when going back to dashboard
      setSelectedCountry('')
      setSelectedCity('')
    } else if (category === 'room') {
      if (currentView === 'home') {
        setCurrentView('countries')
      }
    } else {
      // Navigate to other category pages
      setCurrentView('home')
      setSelectedCountry('')
      setSelectedCity('')
    }
  }

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category as CategoryType)
    if (category === 'room') {
      setCurrentView('countries')
    } else {
      // No need to show alert, just stay on current view
      // The sidebar navigation will handle the page switching
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

  const handleSelectRoom = (roomName: string) => {
    setSelectedRoom(roomName)
    setCurrentView('room-info')
  }

  const handleBackToHome = () => {
    setCurrentView('home')
    setSelectedCategory('dashboard')
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

  const handleBackToRooms = () => {
    setCurrentView('rooms')
    setSelectedRoom('')
  }

  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ThemeProvider>
      <DeveloperOptionsProvider>
        <Layout currentView={selectedCategory} onNavigate={handleNavigate}>
          {/* Dashboard and Room flow */}
          {currentView === 'home' && selectedCategory === 'dashboard' && (
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
              onSelectRoom={handleSelectRoom}
            />
          )}
          
          {currentView === 'room-info' && (
            <RoomInfo 
              cityName={selectedCity}
              roomName={selectedRoom}
              onBack={handleBackToRooms}
            />
          )}
          
          {/* Other category pages */}
          {selectedCategory === 'monitoring' && (
            <MonitoringPage />
          )}
          
          {selectedCategory === 'security' && (
            <SecurityPage />
          )}
          
          {selectedCategory === 'reports' && (
            <ReportsPage />
          )}
          
          {selectedCategory === 'utilities' && (
            <UtilitiesPage />
          )}
        </Layout>
      </DeveloperOptionsProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
