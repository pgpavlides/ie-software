import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useViewAsStore } from '../store/viewAsStore';
import {
  FiChevronsLeft,
  FiChevronsRight,
  FiLogOut,
  FiTerminal,
  FiHelpCircle,
  FiUser,
  FiEye,
  FiX,
} from "react-icons/fi";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onToggleCommandLine: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onToggleCommandLine }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showViewAsModal, setShowViewAsModal] = useState(false);
  const { user, signOut } = useAuthStore();
  const {
    canUseViewAs,
    isViewingAs,
    viewAsRole,
    setViewAsRole,
    clearViewAs,
    availableRoles,
    getEffectiveRoles,
    initialize: initializeViewAs,
    initialized: viewAsInitialized
  } = useViewAsStore();

  // Initialize ViewAs store when component mounts
  useEffect(() => {
    if (!viewAsInitialized && canUseViewAs()) {
      initializeViewAs();
    }
  }, [viewAsInitialized, canUseViewAs, initializeViewAs]);

  const allMenuItems = [
    {
      name: 'Dashboard',
      view: 'dashboard',
      iconPath: '/icons/Dashboard.svg',
      emoji: '🏠',
      roles: [] // Available to everyone
    },
    {
      name: 'Room',
      view: 'room',
      iconPath: '/icons/RANDOM_GENERATE.svg',
      emoji: '🏠',
      roles: ['Super Admin', 'Software', 'Head of Software']
    },
    {
      name: 'Guides',
      view: 'guides',
      iconPath: '/icons/BOX.svg',
      emoji: '📚',
      roles: ['Super Admin', 'Software', 'Head of Software']
    },
    {
      name: 'Utilities',
      view: 'utilities',
      iconPath: '/icons/DEV_TOOLS.svg',
      emoji: '🛠️',
      roles: ['Super Admin', 'Software', 'Head of Software']
    },
    {
      name: 'Overtimes',
      view: 'overtimes',
      iconPath: '/icons/HUMAN.svg',
      emoji: '⏰',
      roles: [] // Available to everyone
    },
    {
      name: 'Components',
      view: 'components',
      iconPath: '/icons/BOX.svg',
      emoji: '🧩',
      roles: ['Super Admin', 'Software', 'Head of Software']
    },
    {
      name: 'MAP',
      view: 'map',
      iconPath: '/icons/Dashboard.svg',
      emoji: '🗺️',
      roles: ['Super Admin', 'Head Architect', 'Project Manager', 'Head of Project Manager']
    },
    {
      name: 'User Management',
      view: 'admin/users',
      iconPath: '/icons/ADMINISTRATOR.svg',
      emoji: '👥',
      roles: ['Super Admin']
    },
    {
      name: 'Inventory',
      view: 'inventory',
      iconPath: '/icons/BOX.svg',
      emoji: '📦',
      roles: ['Super Admin', 'Head of Electronics', 'Electronics']
    },
    {
      name: 'Tasks',
      view: 'tasks',
      iconPath: '/icons/BOX.svg',
      emoji: '📋',
      roles: [] // Available to everyone - global task system for all departments
    }
  ];

  // Get effective roles for menu filtering (respects ViewAs mode)
  const effectiveMenuRoles = getEffectiveRoles();
  const hasEffectiveRole = (role: string) => effectiveMenuRoles.includes(role);

  const menuItems = allMenuItems.filter(item => {
    // Empty roles array means available to everyone
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return item.roles.some(role => hasEffectiveRole(role));
  });

  return (
    <nav
      className="h-full shrink-0 flex flex-col bg-[#0f0f12] border-r border-[#1f1f28] transition-all duration-300 ease-out"
      style={{
        width: open ? '220px' : '68px',
      }}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-[#1f1f28] flex items-center justify-center h-16">
        {open ? (
          <img
            src="/logo/logo_name.png"
            alt="IE Software"
            className="h-7 w-auto object-contain opacity-90"
          />
        ) : (
          <img
            src="/logo/logo.png"
            alt="IE Software"
            className="h-8 w-8 object-contain opacity-90"
          />
        )}
      </div>

      {/* Menu Items */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
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

      {/* Bottom Actions */}
      <div className="p-2 border-t border-[#1f1f28] space-y-1">
        {/* ViewAs Button - Only for Super Admin */}
        {canUseViewAs() && (
          <ViewAsButton
            open={open}
            isViewingAs={isViewingAs()}
            viewAsRole={viewAsRole}
            onOpenModal={() => setShowViewAsModal(true)}
            onClearViewAs={clearViewAs}
          />
        )}
        {/* Command Line - Only for Super Admin */}
        {hasEffectiveRole('Super Admin') && (
          <CommandLineButton open={open} onToggle={onToggleCommandLine} onShowHelp={() => setShowHelp(true)} />
        )}
        <ProfileButton open={open} onNavigate={() => navigate('/profile')} />
        <UserInfo open={open} user={user} />
        <LogoutButton open={open} onLogout={signOut} />
        <ToggleClose open={open} setOpen={setOpen} />
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-[#141418] border-b border-[#2a2a35] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Command Line Help</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">How to Use</h3>
                <p className="text-[#8b8b9a]">
                  The command line allows you to quickly search and navigate through rooms using keyboard shortcuts.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Keyboard Shortcuts</h3>
                <div className="space-y-3">
                  {[
                    { key: 'Ctrl + `', title: 'Open Command Line', desc: 'Press anywhere to open search' },
                    { key: '↓ ↑', title: 'Navigate Results', desc: 'Use arrow keys to navigate' },
                    { key: 'Enter', title: 'Select Room', desc: 'View selected room details' },
                    { key: 'Esc', title: 'Close', desc: 'Close the command search' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-start gap-4 p-3 bg-[#1a1a1f] rounded-xl">
                      <kbd className="px-2.5 py-1 bg-[#2a2a35] text-white rounded-lg text-sm font-mono min-w-[80px] text-center">
                        {item.key}
                      </kbd>
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-sm text-[#6b6b7a]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Search Tips</h3>
                <ul className="space-y-2 text-[#8b8b9a]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#ea2127]">•</span>
                    <span>Type room names, city names, or country names</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ea2127]">•</span>
                    <span>Search by AnyDesk ID or IP address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ea2127]">•</span>
                    <span>Use multiple words to narrow results</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ViewAs Modal */}
      {showViewAsModal && (
        <ViewAsModal
          availableRoles={availableRoles}
          currentViewAsRole={viewAsRole}
          onSelectRole={(role) => {
            setViewAsRole(role);
            setShowViewAsModal(false);
          }}
          onClearViewAs={() => {
            clearViewAs();
            setShowViewAsModal(false);
          }}
          onClose={() => setShowViewAsModal(false)}
        />
      )}
    </nav>
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
    if (isActive || isHovered) {
      return 'brightness(0) invert(1)';
    }
    return 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)';
  };

  return (
    <button
      onClick={() => onSelect(view)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex items-center gap-3 w-full rounded-xl transition-all duration-200 ${
        open ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
      } ${
        isActive
          ? 'bg-[#ea2127] text-white shadow-lg shadow-[#ea2127]/20'
          : 'text-[#6b6b7a] hover:bg-[#1a1a1f] hover:text-white'
      }`}
      title={!open ? title : undefined}
    >
      <div className={`flex items-center justify-center ${open ? 'w-6' : 'w-full'}`}>
        <img
          src={iconPath}
          alt={`${title} icon`}
          className="w-5 h-5 transition-all duration-200"
          style={{ filter: getIconFilter() }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span style="font-size: 18px;">${emoji}</span>`;
            }
          }}
        />
      </div>
      {open && (
        <span className="text-sm font-medium truncate">{title}</span>
      )}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
      )}
    </button>
  );
};

const ProfileButton: React.FC<{ open: boolean; onNavigate: () => void }> = ({ open, onNavigate }) => {
  return (
    <button
      onClick={onNavigate}
      className={`flex items-center gap-3 w-full rounded-xl transition-all duration-200 text-[#6b6b7a] hover:bg-[#1a1a1f] hover:text-white ${
        open ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
      }`}
      title={!open ? 'Profile' : undefined}
    >
      <div className={`flex items-center justify-center ${open ? 'w-6' : 'w-full'}`}>
        <FiUser className="w-5 h-5" />
      </div>
      {open && <span className="text-sm font-medium">Profile</span>}
    </button>
  );
};

const CommandLineButton: React.FC<{ open: boolean; onToggle: () => void; onShowHelp: () => void }> = ({ open, onToggle, onShowHelp }) => {
  return (
    <button
      onClick={onToggle}
      className={`group flex items-center gap-3 w-full rounded-xl transition-all duration-200 text-[#6b6b7a] hover:bg-[#1a1a1f] hover:text-white ${
        open ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
      }`}
      title={!open ? 'Command Line' : undefined}
    >
      <div className={`flex items-center justify-center ${open ? 'w-6' : 'w-full'}`}>
        <FiTerminal className="w-5 h-5" />
      </div>
      {open && (
        <>
          <span className="text-sm font-medium flex-1 text-left">Command</span>
          <div
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
            className="p-1 rounded hover:bg-[#2a2a35] transition-colors opacity-0 group-hover:opacity-100"
          >
            <FiHelpCircle className="w-4 h-4" />
          </div>
        </>
      )}
    </button>
  );
};

const UserInfo: React.FC<{ open: boolean; user: any }> = ({ open, user }) => {
  if (!user) return null;

  return (
    <div className={`py-2 ${open ? 'px-3' : 'px-0'}`}>
      {open ? (
        <div>
          <div className="text-sm font-medium text-white truncate">
            {user.displayName}
          </div>
          <div className="text-xs text-[#6b6b7a] truncate">
            {user.role}
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="w-8 h-8 bg-gradient-to-br from-[#ea2127] to-[#b81a1f] rounded-lg flex items-center justify-center shadow-lg shadow-[#ea2127]/20">
            <span className="text-xs font-bold text-white">
              {user.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const LogoutButton: React.FC<{ open: boolean; onLogout: () => void }> = ({ open, onLogout }) => {
  return (
    <button
      onClick={onLogout}
      className={`flex items-center gap-3 w-full rounded-xl transition-all duration-200 text-[#6b6b7a] hover:bg-[#ea2127]/10 hover:text-[#ea2127] ${
        open ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
      }`}
      title={!open ? 'Logout' : undefined}
    >
      <div className={`flex items-center justify-center ${open ? 'w-6' : 'w-full'}`}>
        <FiLogOut className="w-5 h-5" />
      </div>
      {open && <span className="text-sm font-medium">Logout</span>}
    </button>
  );
};

const ToggleClose: React.FC<{ open: boolean; setOpen: (open: boolean) => void }> = ({ open, setOpen }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className={`flex items-center gap-3 w-full rounded-xl transition-all duration-200 text-[#6b6b7a] hover:bg-[#1a1a1f] hover:text-white ${
        open ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
      }`}
      title={open ? 'Collapse sidebar' : 'Expand sidebar'}
    >
      <div className={`flex items-center justify-center ${open ? 'w-6' : 'w-full'}`}>
        {open ? (
          <FiChevronsLeft className="w-5 h-5" />
        ) : (
          <FiChevronsRight className="w-5 h-5" />
        )}
      </div>
      {open && <span className="text-sm font-medium">Collapse</span>}
    </button>
  );
};

interface ViewAsRole {
  id: string;
  name: string;
  description: string;
  permission_level: number;
  is_head_role: boolean;
  color: string;
  department_id: string | null;
  department_name: string | null;
}

const ViewAsButton: React.FC<{
  open: boolean;
  isViewingAs: boolean;
  viewAsRole: ViewAsRole | null;
  onOpenModal: () => void;
  onClearViewAs: () => void;
}> = ({ open, isViewingAs, viewAsRole, onOpenModal, onClearViewAs }) => {
  return (
    <div className="relative">
      <button
        onClick={onOpenModal}
        className={`flex items-center gap-3 w-full rounded-xl transition-all duration-200 ${
          open ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
        } ${
          isViewingAs
            ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30'
            : 'text-[#6b6b7a] hover:bg-[#1a1a1f] hover:text-white'
        }`}
        title={!open ? (isViewingAs ? `Viewing as: ${viewAsRole?.name}` : 'View As') : undefined}
      >
        <div className={`flex items-center justify-center ${open ? 'w-6' : 'w-full'}`}>
          <FiEye className="w-5 h-5" />
        </div>
        {open && (
          <div className="flex-1 flex items-center justify-between">
            <span className="text-sm font-medium truncate">
              {isViewingAs ? `As: ${viewAsRole?.name}` : 'View As'}
            </span>
            {isViewingAs && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onClearViewAs();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onClearViewAs();
                  }
                }}
                className="p-1 rounded hover:bg-[#f59e0b]/30 transition-colors cursor-pointer"
                title="Exit View As mode"
              >
                <FiX className="w-4 h-4" />
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

const ViewAsModal: React.FC<{
  availableRoles: ViewAsRole[];
  currentViewAsRole: ViewAsRole | null;
  onSelectRole: (role: ViewAsRole) => void;
  onClearViewAs: () => void;
  onClose: () => void;
}> = ({ availableRoles, currentViewAsRole, onSelectRole, onClearViewAs, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Get unique departments
  const departments = Array.from(new Set(availableRoles.map(r => r.department_name).filter(Boolean))) as string[];

  // Filter roles
  const filteredRoles = availableRoles.filter(role => {
    const matchesSearch = searchQuery === '' ||
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = selectedDepartment === 'all' ||
      (selectedDepartment === 'system' && !role.department_name) ||
      role.department_name === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-[#141418] border-b border-[#2a2a35] px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiEye className="w-5 h-5 text-[#f59e0b]" />
                View As Role
              </h2>
              <p className="text-[#6b6b7a] text-sm mt-1">
                Test the application as if you had a different role
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all text-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Department Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDepartment('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedDepartment === 'all'
                  ? 'bg-[#f59e0b] text-white'
                  : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedDepartment('system')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedDepartment === 'system'
                  ? 'bg-[#f59e0b] text-white'
                  : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white'
              }`}
            >
              System
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedDepartment === dept
                    ? 'bg-[#f59e0b] text-white'
                    : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(90vh-280px)]">
          {/* Clear ViewAs Option */}
          {currentViewAsRole && (
            <button
              onClick={onClearViewAs}
              className="w-full text-left px-4 py-3 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 hover:bg-[#10b981]/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-[#10b981]">View as Myself</span>
                  <p className="text-xs text-[#10b981]/70">Return to your actual permissions</p>
                </div>
              </div>
            </button>
          )}

          {filteredRoles.length === 0 ? (
            <div className="text-center py-8 text-[#6b6b7a]">
              No roles found
            </div>
          ) : (
            filteredRoles.map((role) => {
              const isSelected = currentViewAsRole?.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => onSelectRole(role)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-[#f59e0b]/50 bg-[#f59e0b]/10'
                      : 'border-[#2a2a35] bg-[#1a1a1f] hover:border-[#3a3a48] hover:bg-[#1f1f28]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${role.color}20` }}
                      >
                        <span style={{ color: role.color }}>
                          {role.is_head_role ? '★' : '●'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{role.name}</span>
                          {role.is_head_role && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#f59e0b]">
                              Lead
                            </span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${role.color}20`,
                              color: role.color,
                            }}
                          >
                            Level {role.permission_level}
                          </span>
                        </div>
                        <p className="text-sm text-[#6b6b7a] mt-0.5 line-clamp-1">{role.description}</p>
                        {role.department_name && (
                          <p className="text-xs text-[#4a4a58] mt-1">
                            {role.department_name}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2 text-[#f59e0b]">
                        <FiEye className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="sticky bottom-0 bg-[#141418] border-t border-[#2a2a35] px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#4a4a58]">
              {currentViewAsRole
                ? `Currently viewing as: ${currentViewAsRole.name}`
                : 'Select a role to test permissions'}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
