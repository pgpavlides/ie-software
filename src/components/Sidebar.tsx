import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  FiChevronsRight,
  FiLogOut,
} from "react-icons/fi";
import { motion } from "framer-motion";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [open, setOpen] = useState(true);
  const { currentUser, logout } = useAuth();

  const allMenuItems = [
    { 
      name: 'Dashboard', 
      view: 'dashboard',
      iconPath: '/icons/Dashboard.svg',
      emoji: '🏠'
    },
    { 
      name: 'Room', 
      view: 'room',
      iconPath: '/icons/RANDOM_GENERATE.svg',
      emoji: '🏠'
    },
    { 
      name: 'Guides', 
      view: 'guides',
      iconPath: '/icons/BOX.svg',
      emoji: '📚'
    },
    { 
      name: 'Utilities', 
      view: 'utilities',
      iconPath: '/icons/DEV_TOOLS.svg',
      emoji: '🛠️'
    },
    { 
      name: 'Overtimes', 
      view: 'overtimes',
      iconPath: '/icons/HUMAN.svg',
      emoji: '⏰'
    },
    { 
      name: 'Components', 
      view: 'components',
      iconPath: '/icons/BOX.svg',
      emoji: '🧩'
    }
  ];

  // No filtering needed anymore - show all menu items
  const menuItems = allMenuItems;

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
      {/* Logo Section */}
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

      <UserInfo open={open} user={currentUser} />
      <LogoutButton open={open} onLogout={logout} />
      <ToggleClose open={open} setOpen={setOpen} />
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
  
  // Calculate filter based on theme and state
  const getIconFilter = () => {
    if (isActive) {
      return 'brightness(0) invert(1)'; // Always white when active
    }
    if (isHovered) {
      return 'brightness(0) invert(1)'; // Always white when hovered
    }
    // Default state - red color to match brand
    return 'brightness(0) saturate(100%) invert(19%) sepia(84%) saturate(3951%) hue-rotate(346deg) brightness(91%) contrast(103%)'; // Red (#ea2127)
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
            // Fallback to emoji if icon fails to load
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