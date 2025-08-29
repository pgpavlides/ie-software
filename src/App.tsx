import { useState } from 'react'
import Layout from './components/Layout'
import HomePage from './components/HomePage'
import EscapeRoomTypeGrid from './components/EscapeRoomTypeGrid'
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

type ViewType = 'home' | 'escape-room-types' | 'countries' | 'cities' | 'rooms' | 'room-info';
type CategoryType = 'dashboard' | 'room' | 'technical' | 'monitoring' | 'security' | 'reports' | 'utilities';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('dashboard')
  const [selectedEscapeRoomType, setSelectedEscapeRoomType] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedRoom, setSelectedRoom] = useState<string>('')

  const handleNavigate = (category: string) => {
    setSelectedCategory(category as CategoryType)
    if (category === 'dashboard') {
      setCurrentView('home')
      // Reset navigation state when going back to dashboard
      setSelectedEscapeRoomType('')
      setSelectedCountry('')
      setSelectedCity('')
    } else if (category === 'room') {
      if (currentView === 'home') {
        setCurrentView('escape-room-types')
      }
    } else {
      // Navigate to other category pages
      setCurrentView('home')
      setSelectedEscapeRoomType('')
      setSelectedCountry('')
      setSelectedCity('')
    }
  }

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category as CategoryType)
    if (category === 'room') {
      setCurrentView('escape-room-types')
    } else {
      // No need to show alert, just stay on current view
      // The sidebar navigation will handle the page switching
    }
  }

  const handleSelectEscapeRoomType = (typeId: string) => {
    setSelectedEscapeRoomType(typeId)
    setCurrentView('countries')
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
    setSelectedEscapeRoomType('')
    setSelectedCountry('')
    setSelectedCity('')
  }

  const handleBackToEscapeRoomTypes = () => {
    setCurrentView('escape-room-types')
    setSelectedEscapeRoomType('')
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
          
          {currentView === 'escape-room-types' && (
            <EscapeRoomTypeGrid 
              onSelectType={handleSelectEscapeRoomType} 
              onBack={handleBackToHome}
            />
          )}
          
          {currentView === 'countries' && (
            <CountryGrid 
              escapeRoomTypeId={selectedEscapeRoomType}
              onSelectCountry={handleSelectCountry} 
              onBack={handleBackToEscapeRoomTypes}
            />
          )}
          
          {currentView === 'cities' && (
            <CityGrid 
              country={selectedCountry}
              escapeRoomTypeId={selectedEscapeRoomType}
              onSelectCity={handleSelectCity} 
              onBack={handleBackToCountries}
            />
          )}
          
          {currentView === 'rooms' && (
            <RoomDetails 
              cityName={selectedCity}
              escapeRoomTypeId={selectedEscapeRoomType}
              onBack={handleBackToCities}
              onSelectRoom={handleSelectRoom}
            />
          )}
          
          {currentView === 'room-info' && (
            <RoomInfo 
              cityName={selectedCity}
              escapeRoomTypeId={selectedEscapeRoomType}
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
