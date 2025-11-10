import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  FiChevronsRight,
  FiLogOut,
  FiTerminal,
  FiHelpCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onToggleCommandLine: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onToggleCommandLine }) => {
  const [open, setOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const { user, signOut, hasRole } = useAuthStore();

  const allMenuItems = [
    { 
      name: 'Dashboard', 
      view: 'dashboard',
      iconPath: '/icons/Dashboard.svg',
      emoji: '🏠',
      excludeRoles: ['Architect', 'Project Manager']
    },
    { 
      name: 'Room', 
      view: 'room',
      iconPath: '/icons/RANDOM_GENERATE.svg',
      emoji: '🏠',
      excludeRoles: ['Architect', 'Project Manager']
    },
    { 
      name: 'Guides', 
      view: 'guides',
      iconPath: '/icons/BOX.svg',
      emoji: '📚',
      excludeRoles: ['Architect', 'Project Manager']
    },
    { 
      name: 'Utilities', 
      view: 'utilities',
      iconPath: '/icons/DEV_TOOLS.svg',
      emoji: '🛠️',
      excludeRoles: ['Architect', 'Project Manager']
    },
    { 
      name: 'Overtimes', 
      view: 'overtimes',
      iconPath: '/icons/HUMAN.svg',
      emoji: '⏰',
      excludeRoles: ['Architect', 'Project Manager']
    },
    { 
      name: 'Components', 
      view: 'components',
      iconPath: '/icons/BOX.svg',
      emoji: '🧩',
      excludeRoles: ['Architect', 'Project Manager']
    },
    { 
      name: 'MAP', 
      view: 'map',
      iconPath: '/icons/Dashboard.svg',
      emoji: '🗺️',
      roles: ['Admin', 'Architect', 'Project Manager']
    }
  ];

  const menuItems = allMenuItems.filter(item => {
    // Check if user should be excluded from this menu item
    if (item.excludeRoles) {
      const isExcluded = item.excludeRoles.some(role => hasRole(role));
      if (isExcluded) return false;
    }
    
    // Check if user has required roles for this menu item
    if (item.roles) {
      return item.roles.some(role => hasRole(role));
    }
    
    return true;
  });

  return (
    <motion.nav
      layout
      className="h-full shrink-0 border-r p-2 flex flex-col"
      style={{
        width: open ? "225px" : "fit-content",
        backgroundColor: '#2d2d2d',
        borderColor: '#444'
      }}
    >
      <div className="p-4 border-b" style={{ borderColor: '#444' }}>
        {open ? (
          <img 
            src="/logo/logo_name.png" 
            alt="IE Software" 
            className="h-8 w-auto object-contain"
          />
        ) : (
          <div className="flex justify-center">
            <img 
              src="/logo/logo.png" 
              alt="IE Software" 
              className="h-8 w-8 object-contain"
            />
          </div>
        )}
      </div>
      
      <div className={`flex-1 space-y-1 mt-2 ${open ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {menuItems.map((item) => (
          <Option
            key={item.view}
            iconPath={item.iconPath}
            emoji={item.emoji}
            title={item.name}
            view={item.view}
            selected={currentView}
            onSelect={onNavigate}
            open={open}
          />
        ))}
      </div>

      <CommandLineButton open={open} onToggle={onToggleCommandLine} onShowHelp={() => setShowHelp(true)} />
      <UserInfo open={open} user={user} />
      <LogoutButton open={open} onLogout={signOut} />
      <ToggleClose open={open} setOpen={setOpen} />

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Command Line Help</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Use Command Line</h3>
                <p className="text-gray-600 mb-4">
                  The command line allows you to quickly search and navigate through rooms using keyboard shortcuts.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Available Commands</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <kbd className="px-2 py-1 bg-gray-700 text-white rounded text-sm font-mono mr-3">Ctrl+`</kbd>
                      <div>
                        <p className="font-medium text-gray-800">Open Command Line</p>
                        <p className="text-sm text-gray-600">Press Ctrl+` anywhere to open the command search</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <kbd className="px-2 py-1 bg-gray-700 text-white rounded text-sm font-mono mr-3">↓ ↑</kbd>
                      <div>
                        <p className="font-medium text-gray-800">Navigate Results</p>
                        <p className="text-sm text-gray-600">Use arrow keys to navigate through search results</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <kbd className="px-2 py-1 bg-gray-700 text-white rounded text-sm font-mono mr-3">Enter</kbd>
                      <div>
                        <p className="font-medium text-gray-800">Select Room</p>
                        <p className="text-sm text-gray-600">Press Enter to view the selected room details</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <kbd className="px-2 py-1 bg-gray-700 text-white rounded text-sm font-mono mr-3">Esc</kbd>
                      <div>
                        <p className="font-medium text-gray-800">Close Command Line</p>
                        <p className="text-sm text-gray-600">Press Escape to close the command search</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Search Tips</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Type room names, city names, or country names to search</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Search by AnyDesk ID or IP address</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Use multiple words to narrow down results</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Results update instantly as you type</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.nav>
  );
};

interface OptionProps {
  iconPath: string;
  emoji: string;
  title: string;
  view: string;
  selected: string;
  onSelect: (view: string) => void;
  open: boolean;
}

const Option: React.FC<OptionProps> = ({ iconPath, emoji, title, view, selected, onSelect, open }) => {
  const isActive = selected === view;
  const [isHovered, setIsHovered] = React.useState(false);
  
  const getIconFilter = () => {
    if (isActive) {
      return 'brightness(0) invert(1)';
    }
    if (isHovered) {
      return 'brightness(0) invert(1)';
    }
    return 'brightness(0) saturate(100%) invert(19%) sepia(84%) saturate(3951%) hue-rotate(346deg) brightness(91%) contrast(103%)';
  };
  
  return (
    <motion.button
      layout
      onClick={() => onSelect(view)}
      className={`relative flex items-center rounded-md transition-colors hover:bg-opacity-20 ${open ? 'w-full h-12' : 'w-16 h-16 justify-center'}`}
      style={{
        backgroundColor: isActive ? '#ea2127' : 'transparent',
        color: isActive ? '#ffffff' : '#999999'
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'rgba(234, 33, 39, 0.2)';
          e.currentTarget.style.color = '#ffffff';
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#999999';
        }
      }}
    >
      <motion.div
        layout
        className="grid h-full w-12 place-content-center pointer-events-none"
      >
        <img 
          src={iconPath}
          alt={`${title} icon`}
          className="w-6 h-6 transition-all duration-200"
          style={{
            filter: getIconFilter()
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span style="font-size: 24px;">${emoji}</span>`;
            }
          }}
        />
      </motion.div>
      {open && (
        <motion.span
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.125 }}
          className="text-sm font-medium pointer-events-none"
        >
          {title}
        </motion.span>
      )}
    </motion.button>
  );
};

const CommandLineButton: React.FC<{ open: boolean; onToggle: () => void; onShowHelp: () => void }> = ({ open, onToggle, onShowHelp }) => {
  return (
    <div className="border-t mt-2" style={{ borderColor: '#444' }}>
      <motion.button
        layout
        onClick={onToggle}
        className="w-full transition-colors"
        style={{
          backgroundColor: 'transparent'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(234, 33, 39, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center">
            <motion.div
              layout
              className="grid size-10 place-content-center text-lg"
              style={{color: '#999999'}}
            >
              <FiTerminal />
            </motion.div>
            {open && (
              <motion.span
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.125 }}
                className="text-xs font-medium"
                style={{color: '#999999'}}
              >
                Command
              </motion.span>
            )}
          </div>
          {open && (
            <motion.div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onShowHelp();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onShowHelp();
                }
              }}
              className="grid size-6 place-content-center text-sm hover:text-white transition-colors cursor-pointer"
              style={{color: '#999999'}}
              title="Command Line Help"
            >
              <FiHelpCircle />
            </motion.div>
          )}
        </div>
      </motion.button>
    </div>
  );
};

const UserInfo: React.FC<{ open: boolean; user: any }> = ({ open, user }) => {
  if (!user) return null;
  
  return (
    <div className="border-t pt-2 mt-2" style={{ borderColor: '#444' }}>
      {open ? (
        <div className="px-2 py-2">
          <div className="text-xs font-medium" style={{ color: '#999999' }}>
            {user.displayName}
          </div>
          <div className="text-xs" style={{ color: '#666666' }}>
            {user.role}
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const LogoutButton: React.FC<{ open: boolean; onLogout: () => void }> = ({ open, onLogout }) => {
  return (
    <motion.button
      layout
      onClick={onLogout}
      className="border-t transition-colors mt-2"
      style={{
        borderColor: '#444',
        backgroundColor: 'transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(234, 33, 39, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div className="flex items-center p-2">
        <motion.div
          layout
          className="grid size-10 place-content-center text-lg"
          style={{color: '#999999'}}
        >
          <FiLogOut />
        </motion.div>
        {open && (
          <motion.span
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.125 }}
            className="text-xs font-medium"
            style={{color: '#999999'}}
          >
            Logout
          </motion.span>
        )}
      </div>
    </motion.button>
  );
};

const ToggleClose: React.FC<{ open: boolean; setOpen: (open: boolean) => void }> = ({ open, setOpen }) => {
  return (
    <motion.button
      layout
      onClick={() => setOpen(!open)}
      className="transition-colors"
      style={{
        backgroundColor: 'transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(234, 33, 39, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div className="flex items-center p-2">
        <motion.div
          layout
          className="grid size-10 place-content-center text-lg"
          style={{color: '#999999'}}
        >
          <FiChevronsRight
            className={`transition-transform ${open && "rotate-180"}`}
          />
        </motion.div>
        {open && (
          <motion.span
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.125 }}
            className="text-xs font-medium"
            style={{color: '#999999'}}
          >
            Hide
          </motion.span>
        )}
      </div>
    </motion.button>
  );
};

export default Sidebar;
