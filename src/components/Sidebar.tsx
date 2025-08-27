import React, { useState } from 'react';
import { useDeveloperOptions } from '../contexts/DeveloperOptionsContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  FiChevronsRight,
} from "react-icons/fi";
import { motion } from "framer-motion";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [open, setOpen] = useState(true);
  const { isEnabled: isDeveloperOptionsEnabled } = useDeveloperOptions();
  const { isLight } = useTheme();

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
      iconPath: '/icons/REGISTER PLAYER.svg',
      emoji: '🏠'
    },
    { 
      name: 'Technical', 
      view: 'technical',
      iconPath: '/icons/DEV TOOLS.svg',
      emoji: '⚙️'
    },
    { 
      name: 'Monitoring', 
      view: 'monitoring',
      iconPath: '/icons/LIVE VIEW.svg',
      emoji: '📊'
    },
    { 
      name: 'Security', 
      view: 'security',
      iconPath: '/icons/ADMINISTRATOR.svg',
      emoji: '🔐'
    },
    { 
      name: 'Reports', 
      view: 'reports',
      iconPath: '/icons/SCOREBOARD.svg',
      emoji: '📄'
    },
    { 
      name: 'Utilities', 
      view: 'utilities',
      iconPath: '/icons/SETTINGS.svg',
      emoji: '🛠️'
    }
  ];

  // Filter menu items based on developer options setting
  const menuItems = allMenuItems.filter(item => {
    if (item.name === 'Technical') {
      return isDeveloperOptionsEnabled;
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
            isLight={isLight}
          />
        ))}
      </div>

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
  isLight: boolean;
}

const Option: React.FC<OptionProps> = ({ iconPath, emoji, title, view, selected, onSelect, open, isLight }) => {
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
    // Default state - gray for both themes but different opacity
    return isLight 
      ? 'brightness(0) invert(0.6)' // Darker gray for light theme
      : 'brightness(0) invert(0.4)'; // Lighter gray for dark theme
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

const ToggleClose: React.FC<{ open: boolean; setOpen: (open: boolean) => void }> = ({ open, setOpen }) => {
  return (
    <motion.button
      layout
      onClick={() => setOpen(!open)}
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