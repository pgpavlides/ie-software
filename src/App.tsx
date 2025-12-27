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
import { KonvaMap } from './components/KonvaMap';
import BoxInfoPage from './components/KonvaMap/BoxInfoPage';
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
import FileSystemPage from './components/FileSystemPage';
import TicketingPage from './components/TicketingPage';
import TicketManagerPage from './components/TicketManagerPage';
import TaskManagerPage from './components/TaskManagerPage';
import OvertimeManagerPage from './components/OvertimeManagerPage';
import { useAuthStore } from './store/authStore';
import { useEffect, useState } from 'react';
import supabase from './lib/supabase';

type CategoryType = 'dashboard' | 'room' | 'guides' | 'utilities' | 'overtimes' | 'components' | 'map' | 'admin/users' | 'inventory' | 'tasks' | 'profile' | 'files' | 'ticketing' | 'ticket-manager' | 'task-manager' | 'overtime-manager';

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
    if (location.pathname.startsWith('/files')) return 'files';
    if (location.pathname.startsWith('/ticketing')) return 'ticketing';
    if (location.pathname.startsWith('/ticket-manager')) return 'ticket-manager';
    if (location.pathname.startsWith('/task-manager')) return 'task-manager';
    if (location.pathname.startsWith('/overtime-manager')) return 'overtime-manager';
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
      case 'files':
        navigate('/files');
        break;
      case 'ticketing':
        navigate('/ticketing');
        break;
      case 'ticket-manager':
        navigate('/ticket-manager');
        break;
      case 'task-manager':
        navigate('/task-manager');
        break;
      case 'overtime-manager':
        navigate('/overtime-manager');
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

// Generic role-based route guard with database permission check
function RouteGuard({ children, allowedRoles, sectionKey }: { children: React.ReactNode; allowedRoles: string[]; sectionKey?: string }) {
  const { hasRole, roles, user } = useAuthStore();
  const [dbPermissionChecked, setDbPermissionChecked] = useState(false);
  const [hasDbAccess, setHasDbAccess] = useState(false);

  // Check database section permission
  useEffect(() => {
    const checkPermission = async () => {
      // Super Admin always has access
      if (hasRole('Super Admin')) {
        setHasDbAccess(true);
        setDbPermissionChecked(true);
        return;
      }

      // If no section key, fall back to role-based check
      if (!sectionKey || !user) {
        setHasDbAccess(allowedRoles.length === 0 || allowedRoles.some(role => hasRole(role)));
        setDbPermissionChecked(true);
        return;
      }

      try {
        // Get user's role IDs
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        if (!userRoles || userRoles.length === 0) {
          setHasDbAccess(false);
          setDbPermissionChecked(true);
          return;
        }

        const roleIds = userRoles.map((ur: { role_id: string }) => ur.role_id);

        // Check if any role has access to this section
        const { data: permissions, error: permError } = await supabase
          .from('role_section_permissions')
          .select('can_access')
          .eq('section_key', sectionKey)
          .in('role_id', roleIds)
          .eq('can_access', true);

        if (permError) throw permError;

        setHasDbAccess(permissions && permissions.length > 0);
      } catch (error) {
        console.error('Error checking section permission:', error);
        // Fall back to role-based check on error
        setHasDbAccess(allowedRoles.length === 0 || allowedRoles.some(role => hasRole(role)));
      } finally {
        setDbPermissionChecked(true);
      }
    };

    checkPermission();
  }, [user, sectionKey, allowedRoles, hasRole]);

  // Show loading while checking permissions
  if (!dbPermissionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <div className="w-8 h-8 border-2 border-[#ea2127] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Empty array and no section key means everyone has access
  if (allowedRoles.length === 0 && !sectionKey) {
    return <>{children}</>;
  }

  const hasAccess = hasDbAccess;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#ea2127] rounded-full blur-[180px] opacity-[0.08]" />

        <div className="relative z-10 max-w-md w-full mx-4">
          <div className="absolute -inset-px bg-gradient-to-b from-[#ea2127]/20 via-transparent to-transparent rounded-3xl blur-sm" />

          <div className="relative bg-[#141418]/90 backdrop-blur-xl border border-[#1f1f28] rounded-3xl p-8 shadow-2xl text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-[#ea2127] rounded-2xl blur-2xl opacity-20" />
              <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-[#1a1a1f] to-[#0f0f12] rounded-2xl border border-[#2a2a35] flex items-center justify-center shadow-xl">
                <svg className="w-10 h-10 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
            <p className="text-[#6b6b7a] mb-6">You don't have permission to access this section.</p>

            <div className="bg-[#1a1a1f] rounded-xl p-4 mb-6">
              <p className="text-xs text-[#4a4a58] uppercase tracking-wider mb-2">Required Access</p>
              <p className="text-[#ea2127] font-semibold">{allowedRoles.join(' or ')}</p>
            </div>

            {roles.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#4a4a58] uppercase tracking-wider mb-2">Your Current Roles</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {roles.map((role) => (
                    <span key={role} className="px-3 py-1 bg-[#1f1f28] text-[#8b8b9a] rounded-lg text-sm">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.history.back()}
                className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#a0a0b0] hover:text-white rounded-xl transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-3 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Route role configurations (matching Sidebar.tsx)
const ROUTE_ROLES = {
  room: ['Super Admin', 'Software', 'Head of Software'],
  guides: ['Super Admin', 'Software', 'Head of Software'],
  utilities: ['Super Admin', 'Software', 'Head of Software'],
  components: ['Super Admin', 'Software', 'Head of Software'],
  map: ['Super Admin', 'Head Architect', 'Project Manager', 'Head Project Manager', 'CNC'],
  'admin/users': ['Super Admin'],
  inventory: ['Super Admin', 'Head of Electronics', 'Electronics'],
  files: ['Super Admin', 'Head of Software', 'Head of Electronics', 'Head Architect', 'Head Project Manager'],
  // These are available to everyone (empty array)
  dashboard: [],
  overtimes: [],
  tasks: [],
  profile: [],
  ticketing: [], // Available to everyone
  'ticket-manager': ['Super Admin', 'Boss', 'Efficiency Coordinator'], // Ticket management
  'task-manager': ['Super Admin', 'Boss', 'Efficiency Coordinator'], // Task management
  'overtime-manager': ['Super Admin', 'Admin', 'Boss'], // Overtime management
};

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
            <Route path="/box" element={<BoxInfoPage />} />

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

              {/* Room Flow - Protected by database permission */}
              <Route path="room" element={<RouteGuard allowedRoles={ROUTE_ROLES.room} sectionKey="room"><EscapeRoomTypeGridWrapper /></RouteGuard>} />
              <Route path="room/:typeId" element={<RouteGuard allowedRoles={ROUTE_ROLES.room} sectionKey="room"><CountryGridWrapper /></RouteGuard>} />
              <Route path="room/:typeId/:country" element={<RouteGuard allowedRoles={ROUTE_ROLES.room} sectionKey="room"><CityGridWrapper /></RouteGuard>} />
              <Route path="room/:typeId/:country/:city" element={<RouteGuard allowedRoles={ROUTE_ROLES.room} sectionKey="room"><RoomDetailsWrapper /></RouteGuard>} />
              <Route path="room/:typeId/:country/:city/:roomName" element={<RouteGuard allowedRoles={ROUTE_ROLES.room} sectionKey="room"><RoomInfoWrapper /></RouteGuard>} />

              {/* Other Pages - All protected by database permission */}
              <Route path="guides" element={
                <RouteGuard allowedRoles={ROUTE_ROLES.guides} sectionKey="guides">
                  <div className="min-h-full bg-[#0f0f12] p-8">
                    <h1 className="text-4xl font-bold text-white mb-4">Guides</h1>
                    <p className="text-xl text-[#6b6b7a]">Documentation and guides will be available here.</p>
                  </div>
                </RouteGuard>
              } />
              <Route path="utilities" element={<RouteGuard allowedRoles={ROUTE_ROLES.utilities} sectionKey="utilities"><UtilitiesPage /></RouteGuard>} />
              <Route path="overtimes" element={<RouteGuard allowedRoles={ROUTE_ROLES.overtimes} sectionKey="overtimes"><OvertimesPage /></RouteGuard>} />
              <Route path="components" element={<RouteGuard allowedRoles={ROUTE_ROLES.components} sectionKey="components"><ComponentsPage /></RouteGuard>} />
              <Route path="map" element={<RouteGuard allowedRoles={ROUTE_ROLES.map} sectionKey="map"><KonvaMap /></RouteGuard>} />
              <Route path="admin/users" element={<RouteGuard allowedRoles={ROUTE_ROLES['admin/users']} sectionKey="admin/users"><UserManagement /></RouteGuard>} />
              <Route path="admin/countries" element={
                <RouteGuard allowedRoles={ROUTE_ROLES['admin/users']} sectionKey="admin/users">
                  <CountryManagement onBack={() => window.history.back()} />
                </RouteGuard>
              } />
              <Route path="profile" element={<RouteGuard allowedRoles={ROUTE_ROLES.profile}><ProfilePage /></RouteGuard>} />
              <Route path="inventory" element={<RouteGuard allowedRoles={ROUTE_ROLES.inventory} sectionKey="inventory"><InventoryPage /></RouteGuard>} />
              <Route path="order-list" element={<RouteGuard allowedRoles={ROUTE_ROLES.inventory} sectionKey="inventory"><OrderListPage /></RouteGuard>} />
              <Route path="tasks" element={<RouteGuard allowedRoles={ROUTE_ROLES.tasks} sectionKey="tasks"><TasksPage /></RouteGuard>} />
              <Route path="files" element={<RouteGuard allowedRoles={ROUTE_ROLES.files} sectionKey="files"><FileSystemPage /></RouteGuard>} />
              <Route path="ticketing" element={<RouteGuard allowedRoles={ROUTE_ROLES.ticketing} sectionKey="ticketing"><TicketingPage /></RouteGuard>} />
              <Route path="ticket-manager" element={<RouteGuard allowedRoles={ROUTE_ROLES['ticket-manager']} sectionKey="ticket-manager"><TicketManagerPage /></RouteGuard>} />
              <Route path="task-manager" element={<RouteGuard allowedRoles={ROUTE_ROLES['task-manager']} sectionKey="task-manager"><TaskManagerPage /></RouteGuard>} />
              <Route path="overtime-manager" element={<RouteGuard allowedRoles={ROUTE_ROLES['overtime-manager']} sectionKey="overtime-manager"><OvertimeManagerPage /></RouteGuard>} />
            </Route>
          </Routes>
        </DeveloperOptionsProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;