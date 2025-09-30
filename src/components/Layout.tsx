import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import CommandLine from './CommandLine';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isCommandLineOpen, setIsCommandLineOpen] = useState(false);

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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <CommandLine
        isOpen={isCommandLineOpen}
        onClose={() => setIsCommandLineOpen(false)}
      />
    </div>
  );
};

export default Layout;
