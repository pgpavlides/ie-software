import { BrowserRouter as Router, Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './components/HomePage'
import EscapeRoomTypeGrid from './components/EscapeRoomTypeGrid'
import CountryGrid from './components/CountryGrid'
import CityGrid from './components/CityGrid'
import RoomDetails from './components/RoomDetails'
import RoomInfo from './components/RoomInfo'
import UtilitiesPage from './components/UtilitiesPage'
import OvertimesPage from './components/OvertimesPage'
import ComponentsPage from './components/ComponentsPage'
import { DeveloperOptionsProvider } from './contexts/DeveloperOptionsContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './components/auth/Login'
import ProtectedRoute from './components/auth/ProtectedRoute'
import UserManagement from './components/admin/UserManagement'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'

type CategoryType = 'dashboard' | 'room' | 'guides' | 'utilities' | 'overtimes' | 'components';

// Router-aware components
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialize, initialized]);

  // Determine current category based on URL
  const getCurrentCategory = (): CategoryType => {
    if (location.pathname.startsWith('/room')) return 'room';
    if (location.pathname.startsWith('/guides')) return 'guides';
    if (location.pathname.startsWith('/utilities')) return 'utilities';
    if (location.pathname.startsWith('/overtimes')) return 'overtimes';
    if (location.pathname.startsWith('/components')) return 'components';
    return 'dashboard';
  };

  const handleNavigate = (category: string) => {
    switch (category) {
      case 'dashboard':
        navigate('/');
        break;
      case 'room':
        navigate('/room');
        break;
      case 'guides':
        navigate('/guides');
        break;
      case 'utilities':
        navigate('/utilities');
        break;
      case 'overtimes':
        navigate('/overtimes');
        break;
      case 'components':
        navigate('/components');
        break;
    }
  };

  const handleSelectCategory = (category: string) => {
    handleNavigate(category);
  };

  return (
    <ThemeProvider>
      <DeveloperOptionsProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="*" element={
            <ProtectedRoute>
              <Layout currentView={getCurrentCategory()} onNavigate={handleNavigate}>
                <Routes>
                  {/* Dashboard */}
                  <Route path="/" element={<HomePage onSelectCategory={handleSelectCategory} />} />

                  {/* Room Flow */}
                  <Route path="/room" element={<EscapeRoomTypeGrid
                    onSelectType={(typeId) => navigate(`/room/${typeId}${location.search}`)}
                    onBack={() => navigate('/')}
                    onSelectRoom={(typeId, cityName, roomName) => navigate(`/room/${typeId}/${encodeURIComponent('Global Search')}/${encodeURIComponent(cityName)}/${encodeURIComponent(roomName)}${location.search}`)}
                  />} />
                  <Route path="/room/:typeId" element={<CountryGridWrapper />} />
                  <Route path="/room/:typeId/:country" element={<CityGridWrapper />} />
                  <Route path="/room/:typeId/:country/:city" element={<RoomDetailsWrapper />} />
                  <Route path="/room/:typeId/:country/:city/:roomName" element={<RoomInfoWrapper />} />

                  {/* Other Pages */}
                  <Route path="/guides" element={
                    <div className="p-8">
                      <h1 className="text-4xl font-bold text-gray-800 mb-4">Guides</h1>
                      <p className="text-xl text-gray-600">Documentation and guides will be available here.</p>
                    </div>
                  } />
                  <Route path="/utilities" element={<UtilitiesPage />} />
                  <Route path="/overtimes" element={<OvertimesPage />} />
                  <Route path="/components" element={<ComponentsPage />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </DeveloperOptionsProvider>
    </ThemeProvider>
  );
}

// Wrapper components to handle URL parameters
function CountryGridWrapper() {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <CountryGrid 
      escapeRoomTypeId={typeId!}
      onSelectCountry={(country) => navigate(`/room/${typeId}/${encodeURIComponent(country)}${location.search}`)} 
      onBack={() => navigate(`/room${location.search}`)}
      onSelectRoom={(cityName, roomName) => navigate(`/room/${typeId}/${encodeURIComponent('Global Search')}/${encodeURIComponent(cityName)}/${encodeURIComponent(roomName)}${location.search}`)}
    />
  );
}

function CityGridWrapper() {
  const { typeId, country } = useParams<{ typeId: string; country: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <CityGrid 
      country={decodeURIComponent(country!)}
      escapeRoomTypeId={typeId!}
      onSelectCity={(city) => navigate(`/room/${typeId}/${country}/${encodeURIComponent(city)}${location.search}`)} 
      onBack={() => navigate(`/room/${typeId}${location.search}`)}
      onSelectRoom={(cityName, roomName) => navigate(`/room/${typeId}/${country}/${encodeURIComponent(cityName)}/${encodeURIComponent(roomName)}${location.search}`)}
    />
  );
}

function RoomDetailsWrapper() {
  const { typeId, country, city } = useParams<{ typeId: string; country: string; city: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <RoomDetails 
      cityName={decodeURIComponent(city!)}
      escapeRoomTypeId={typeId!}
      onBack={() => navigate(`/room/${typeId}/${country}${location.search}`)}
      onSelectRoom={(roomName) => navigate(`/room/${typeId}/${country}/${city}/${encodeURIComponent(roomName)}${location.search}`)}
    />
  );
}

function RoomInfoWrapper() {
  const { typeId, country, city, roomName } = useParams<{ typeId: string; country: string; city: string; roomName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <RoomInfo 
      cityName={decodeURIComponent(city!)}
      escapeRoomTypeId={typeId!}
      roomName={decodeURIComponent(roomName!)}
      onBack={() => navigate(`/room/${typeId}/${country}/${city}${location.search}`)}
    />
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App