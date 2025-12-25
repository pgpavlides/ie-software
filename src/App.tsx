import { BrowserRouter as Router, Routes, Route, useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import EscapeRoomTypeGrid from './components/EscapeRoomTypeGrid';
import CountryGrid from './components/CountryGrid';
import CityGrid from './components/CityGrid';
import RoomDetails from './components/RoomDetails';
import RoomInfo from './components/RoomInfo';
import UtilitiesPage from './components/UtilitiesPage';
import OvertimesPage from './components/OvertimesPage';
import ComponentsPage from './components/ComponentsPage';
import LeafletMap from './components/LeafletMap';
import { DeveloperOptionsProvider } from './contexts/DeveloperOptionsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import UserManagement from './components/admin/UserManagement';
import CountryManagement from './components/admin/CountryManagement';
import ProfilePage from './components/ProfilePage';
import InventoryPage from './components/InventoryPage';
import OrderListPage from './components/OrderListPage';
import TasksPage from './components/TasksPage';
import { useAuthStore } from './store/authStore';
import { useEffect, useState } from 'react';

type CategoryType = 'dashboard' | 'room' | 'guides' | 'utilities' | 'overtimes' | 'components' | 'map' | 'admin/users' | 'inventory' | 'tasks' | 'profile';

// Router-aware components
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current category based on URL
  const getCurrentCategory = (): CategoryType => {
    if (location.pathname.startsWith('/room')) return 'room';
    if (location.pathname.startsWith('/guides')) return 'guides';
    if (location.pathname.startsWith('/utilities')) return 'utilities';
    if (location.pathname.startsWith('/overtimes')) return 'overtimes';
    if (location.pathname.startsWith('/components')) return 'components';
    if (location.pathname.startsWith('/map')) return 'map';
    if (location.pathname.startsWith('/admin/users')) return 'admin/users';
    if (location.pathname.startsWith('/inventory')) return 'inventory';
    if (location.pathname.startsWith('/tasks')) return 'tasks';
    if (location.pathname.startsWith('/profile')) return 'profile';
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
      case 'map':
        navigate('/map');
        break;
      case 'admin/users':
        navigate('/admin/users');
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      case 'tasks':
        navigate('/tasks');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  return (
    <Layout currentView={getCurrentCategory()} onNavigate={handleNavigate}>
      <Outlet />
    </Layout>
  );
}

function HomePageWrapper() {
  const navigate = useNavigate();
  const onSelectCategory = (category: string) => {
    navigate(category === 'dashboard' ? '/' : `/${category}`);
  };
  return <HomePage onSelectCategory={onSelectCategory} />;
}

function EscapeRoomTypeGridWrapper() {
  const navigate = useNavigate();
  const location = useLocation();

  const onSelectType = (typeId: string) => {
    navigate(`/room/${typeId}${location.search}`);
  };

  const onBack = () => {
    navigate('/');
  };

  const onSelectRoom = (typeId: string, cityName: string, roomName: string) => {
    navigate(`/room/${typeId}/${encodeURIComponent('Global Search')}/${encodeURIComponent(cityName)}/${encodeURIComponent(roomName)}${location.search}`);
  };

  return <EscapeRoomTypeGrid onSelectType={onSelectType} onBack={onBack} onSelectRoom={onSelectRoom} />;
}

// Wrapper components to handle URL parameters
function CountryGridWrapper() {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCountryManagement, setShowCountryManagement] = useState(false);
  
  if (showCountryManagement) {
    return (
      <CountryManagement 
        onBack={() => setShowCountryManagement(false)}
      />
    );
  }
  
  return (
    <CountryGrid 
      escapeRoomTypeId={typeId!}
      onSelectCountry={(country) => navigate(`/room/${typeId}/${encodeURIComponent(country)}${location.search}`)} 
      onBack={() => navigate(`/room${location.search}`)}
      onSelectRoom={(cityName, roomName) => navigate(`/room/${typeId}/${encodeURIComponent('Global Search')}/${encodeURIComponent(cityName)}/${encodeURIComponent(roomName)}${location.search}`)}
      onManageCountries={() => setShowCountryManagement(true)}
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
  const { initialize, initialized, loading } = useAuthStore();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (!initialized && !hasInitialized) {
      setHasInitialized(true);
      initialize();
    }
  }, [initialize, initialized, hasInitialized]);

  // Mark app as ready once auth is initialized
  useEffect(() => {
    if (initialized && !appReady) {
      setAppReady(true);
    }
  }, [initialized, appReady]);

  // Only show loading on very first initialization, not on auth events
  if (!appReady && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#ea2127] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ThemeProvider>
        <DeveloperOptionsProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes - Any authenticated user can access, menu filtering handles permissions */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppContent />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route index element={<HomePageWrapper />} />

              {/* Room Flow */}
              <Route path="room" element={<EscapeRoomTypeGridWrapper />} />
              <Route path="room/:typeId" element={<CountryGridWrapper />} />
              <Route path="room/:typeId/:country" element={<CityGridWrapper />} />
              <Route path="room/:typeId/:country/:city" element={<RoomDetailsWrapper />} />
              <Route path="room/:typeId/:country/:city/:roomName" element={<RoomInfoWrapper />} />

              {/* Other Pages */}
              <Route path="guides" element={
                <div className="min-h-full bg-[#0f0f12] p-8">
                  <h1 className="text-4xl font-bold text-white mb-4">Guides</h1>
                  <p className="text-xl text-[#6b6b7a]">Documentation and guides will be available here.</p>
                </div>
              } />
              <Route path="utilities" element={<UtilitiesPage />} />
              <Route path="overtimes" element={<OvertimesPage />} />
              <Route path="components" element={<ComponentsPage />} />
              <Route path="map" element={<LeafletMap />} />
              <Route path="admin/users" element={<UserManagement />} />
              <Route path="admin/countries" element={
                <CountryManagement onBack={() => window.history.back()} />
              } />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="order-list" element={<OrderListPage />} />
              <Route path="tasks" element={<TasksPage />} />
            </Route>
          </Routes>
        </DeveloperOptionsProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;