import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import CommandLine from './CommandLine';
import { useViewAsStore } from '../store/viewAsStore';
import { FiHome, FiClock, FiCheckSquare, FiUser } from 'react-icons/fi';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isCommandLineOpen, setIsCommandLineOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { viewAsRole, clearViewAs, isViewingAs } = useViewAsStore();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar when navigating
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [currentView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        setIsCommandLineOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Bottom navigation items for mobile
  const bottomNavItems = [
    { id: 'dashboard', icon: FiHome, label: 'Home' },
    { id: 'overtimes', icon: FiClock, label: 'Overtimes' },
    { id: 'tasks', icon: FiCheckSquare, label: 'Tasks' },
    { id: 'profile', icon: FiUser, label: 'Profile' },
  ];

  const handleBottomNavClick = (id: string) => {
    if (id === 'profile') {
      onNavigate('profile');
    } else {
      onNavigate(id);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f0f12]">
      {/* Sidebar - hidden on mobile by default, shown as overlay when open */}
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        onToggleCommandLine={() => setIsCommandLineOpen(prev => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto flex flex-col">
        {/* ViewAs Mode Indicator Banner */}
        {isViewingAs() && viewAsRole && (
          <div className="flex-shrink-0 bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-4 py-2 flex items-center justify-between shadow-lg z-50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-white font-semibold text-sm">VIEW AS MODE</span>
              </div>
              <div className="h-4 w-px bg-white/30 hidden sm:block" />
              <div className="flex items-center gap-2 hidden sm:flex">
                <span className="text-white/80 text-sm">Viewing as:</span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: viewAsRole.color || '#6b7280',
                    color: '#ffffff'
                  }}
                >
                  {viewAsRole.name}
                </span>
                {viewAsRole.department_name && (
                  <span className="text-white/60 text-xs">
                    ({viewAsRole.department_name})
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={clearViewAs}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Exit View As</span>
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 overflow-auto ${isMobile ? 'pb-16' : ''}`}>
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 bg-[#0f0f12] border-t border-[#1f1f28] z-30 safe-area-bottom">
            <div className="flex items-center justify-around h-16">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id ||
                  (item.id === 'profile' && currentView === 'profile');

                return (
                  <button
                    key={item.id}
                    onClick={() => handleBottomNavClick(item.id)}
                    className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                      isActive
                        ? 'text-[#ea2127]'
                        : 'text-[#6b6b7a] active:text-white'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                    <span className={`text-xs mt-1 font-medium ${isActive ? '' : 'opacity-80'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </main>

      <CommandLine
        isOpen={isCommandLineOpen}
        onClose={() => setIsCommandLineOpen(false)}
      />
    </div>
  );
};

export default Layout;
