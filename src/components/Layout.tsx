import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import CommandLine from './CommandLine';
import { useViewAsStore } from '../store/viewAsStore';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isCommandLineOpen, setIsCommandLineOpen] = useState(false);
  const { viewAsRole, clearViewAs, isViewingAs } = useViewAsStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log(e.key);
      if (e.ctrlKey && e.key === '`') {
        setIsCommandLineOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        onToggleCommandLine={() => setIsCommandLineOpen(prev => !prev)}
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
              <div className="h-4 w-px bg-white/30" />
              <div className="flex items-center gap-2">
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
              Exit View As
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
      <CommandLine
        isOpen={isCommandLineOpen}
        onClose={() => setIsCommandLineOpen(false)}
      />
    </div>
  );
};

export default Layout;
