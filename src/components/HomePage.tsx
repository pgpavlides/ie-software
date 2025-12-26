import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewAsStore } from '../store/viewAsStore';
import { getFullUserProfile } from '../services/supabaseQueries';
import supabase from '../lib/supabase';

interface HomePageProps {
  onSelectCategory: (category: string) => void;
}

interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Array<{ name: string; color: string }>;
}

interface MessageOfTheDay {
  id: string;
  message: string;
  updated_by_name: string | null;
  updated_at: string;
}

export default function HomePage({ onSelectCategory }: HomePageProps) {
  const navigate = useNavigate();
  const { getEffectiveRoles } = useViewAsStore();
  const effectiveRoles = getEffectiveRoles();

  // Helper to check if user has any of the specified roles
  const hasAnyRole = (roles: string[]) => effectiveRoles.some(role => roles.includes(role));

  // Check if user can edit message of the day
  const canEditMessage = hasAnyRole(['Super Admin', 'Boss']);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Message of the Day state
  const [messageOfTheDay, setMessageOfTheDay] = useState<MessageOfTheDay | null>(null);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);

  // Fetch user profile
  useEffect(() => {
    async function fetchData() {
      try {
        const profile = await getFullUserProfile();

        if (profile) {
          setUserProfile({
            id: profile.id,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            roles: profile.roles,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch message of the day
  useEffect(() => {
    async function fetchMessage() {
      try {
        const { data } = await supabase
          .from('message_of_the_day')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setMessageOfTheDay(data);
        }
      } catch (error) {
        // Table might not exist yet, ignore error
        console.log('Message of the day not available');
      }
    }

    fetchMessage();
  }, []);

  // Save message of the day
  const saveMessage = async () => {
    if (!editedMessage.trim() || !userProfile) return;

    setSavingMessage(true);
    try {
      if (messageOfTheDay) {
        // Update existing message
        const { data, error } = await supabase
          .from('message_of_the_day')
          .update({
            message: editedMessage.trim(),
            updated_by_name: userProfile.displayName,
            updated_at: new Date().toISOString()
          })
          .eq('id', messageOfTheDay.id)
          .select()
          .single();

        if (!error && data) {
          setMessageOfTheDay(data);
        }
      } else {
        // Insert new message
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('message_of_the_day')
          .insert({
            message: editedMessage.trim(),
            updated_by: user?.id,
            updated_by_name: userProfile.displayName
          })
          .select()
          .single();

        if (!error && data) {
          setMessageOfTheDay(data);
        }
      }

      setIsEditingMessage(false);
    } catch (error) {
      console.error('Error saving message:', error);
    } finally {
      setSavingMessage(false);
    }
  };

  const allCategories = [
    {
      id: 'room',
      title: 'Rooms',
      description: 'Manage escape rooms and AnyDesk connections',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      accent: 'from-[#ea2127] to-[#ff4f54]',
      roles: ['Super Admin', 'Software', 'Head of Software'],
    },
    {
      id: 'guides',
      title: 'Guides',
      description: 'Documentation and reference materials',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8M8 11h6" />
        </svg>
      ),
      accent: 'from-[#3b82f6] to-[#60a5fa]',
      roles: ['Super Admin', 'Software', 'Head of Software'],
    },
    {
      id: 'utilities',
      title: 'Utilities',
      description: 'System tools and administrative functions',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      accent: 'from-[#10b981] to-[#34d399]',
      roles: ['Super Admin', 'Software', 'Head of Software'],
    },
    {
      id: 'overtimes',
      title: 'Overtimes',
      description: 'Track and manage overtime hours',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      accent: 'from-[#f59e0b] to-[#fbbf24]',
      roles: [], // Available to everyone
    },
    {
      id: 'components',
      title: 'Components',
      description: 'UI component library and design system',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M3 9h18" />
        </svg>
      ),
      accent: 'from-[#8b5cf6] to-[#a78bfa]',
      roles: ['Super Admin', 'Software', 'Head of Software'],
    },
    {
      id: 'map',
      title: 'Map',
      description: 'Interactive location and project map',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      accent: 'from-[#06b6d4] to-[#22d3ee]',
      roles: ['Super Admin', 'Head Architect', 'Project Manager', 'Head Project Manager'],
    },
    {
      id: 'inventory',
      title: 'Inventory',
      description: 'Manage electronics components and stock',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      accent: 'from-[#06b6d4] to-[#22d3ee]',
      roles: ['Super Admin', 'Head of Electronics', 'Electronics'],
    },
    {
      id: 'tasks',
      title: 'Tasks',
      description: 'View and manage assigned tasks',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      ),
      accent: 'from-[#f59e0b] to-[#fbbf24]',
      roles: [], // Available to everyone - global task system
    },
    {
      id: 'admin/users',
      title: 'User Management',
      description: 'Manage users, roles and permissions',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      accent: 'from-[#ef4444] to-[#f87171]',
      roles: ['Super Admin'],
    },
  ];

  // Filter categories based on user's roles
  // Empty roles array means available to everyone
  const categories = allCategories.filter(cat =>
    cat.roles.length === 0 || hasAnyRole(cat.roles)
  );

  // Check if user has no available categories
  const hasNoCategories = categories.length === 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Show "Coming Soon" if user has no available categories
  if (hasNoCategories) {
    return (
      <div className="min-h-full bg-[#0f0f12] relative overflow-hidden flex items-center justify-center">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />

        {/* Gradient orbs for atmosphere */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ea2127] rounded-full blur-[200px] opacity-[0.03]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3b82f6] rounded-full blur-[150px] opacity-[0.02]" />

        <div className="relative z-10 text-center px-6">
          {/* Icon */}
          <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1a1a1f] to-[#0f0f12] border border-[#2a2a35] shadow-xl">
            <svg className="w-12 h-12 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Coming Soon
          </h1>

          {/* Description */}
          <p className="text-lg text-[#6b6b7a] max-w-md mx-auto mb-8">
            Your dashboard is being prepared. New features and tools for your role will be available here soon.
          </p>

          {/* Role badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1f] border border-[#2a2a35] rounded-full">
            <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
            <span className="text-sm text-[#8b8b9a]">
              Logged in as <span className="text-white font-medium">{effectiveRoles.join(', ')}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />

      {/* Gradient orbs for atmosphere */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ea2127] rounded-full blur-[200px] opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3b82f6] rounded-full blur-[150px] opacity-[0.02]" />

      <div className="relative z-10 p-6 lg:p-10 max-w-7xl mx-auto">
        {/* Header Section */}
        <header
          className="mb-10 opacity-0 animate-[fadeSlideIn_0.6s_ease-out_forwards]"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Logo and Title */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-[#ea2127] rounded-2xl blur-xl opacity-30" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-[#1a1a1f] to-[#0f0f12] rounded-2xl border border-[#2a2a35] flex items-center justify-center overflow-hidden">
                  <img
                    src="/logo/logo.png"
                    alt="IE"
                    className="w-10 h-10 object-contain"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                  Control Center
                </h1>
                <p className="text-[#6b6b7a] text-sm mt-1 font-medium">
                  Intelligent Entertainment Software
                </p>
              </div>
            </div>

            {/* Live Clock and User Profile */}
            <div className="flex items-center justify-center lg:justify-end gap-6 w-full lg:w-auto">
              {/* Clock */}
              <div className="text-center lg:text-right">
                <div className="font-mono text-3xl lg:text-4xl font-semibold text-white tracking-wider">
                  {formatTime(currentTime)}
                </div>
                <div className="text-[#6b6b7a] text-sm mt-1">
                  {formatDate(currentTime)}
                </div>
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-12 bg-[#2a2a35]" />

              {/* User Profile Card - Always reserve space */}
              <div className="hidden lg:flex items-center gap-4 px-4 py-3 bg-[#141418] rounded-2xl border border-[#1f1f28] min-w-[200px]">
                {isLoading ? (
                  /* Skeleton loader */
                  <>
                    <div className="w-11 h-11 rounded-full bg-[#1f1f28] animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-[#1f1f28] rounded animate-pulse mb-2" />
                      <div className="h-3 w-16 bg-[#1f1f28] rounded animate-pulse" />
                    </div>
                  </>
                ) : userProfile ? (
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-4 w-full hover:opacity-80 transition-opacity group"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#ea2127] to-[#b81a1f] flex items-center justify-center overflow-hidden shadow-lg shadow-[#ea2127]/20">
                        {userProfile.avatarUrl ? (
                          <img
                            src={userProfile.avatarUrl}
                            alt={userProfile.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-white">
                            {userProfile.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Online indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10b981] border-2 border-[#141418]"></span>
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="text-left">
                      <div className="text-white font-semibold group-hover:text-[#ea2127] transition-colors">
                        {userProfile.displayName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {userProfile.roles.length > 0 ? (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${userProfile.roles[0].color}20`,
                              color: userProfile.roles[0].color,
                            }}
                          >
                            {userProfile.roles[0].name}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6b6b7a]">No role assigned</span>
                        )}
                        {userProfile.roles.length > 1 && (
                          <span className="text-xs text-[#4a4a58]">
                            +{userProfile.roles.length - 1}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg
                      className="w-4 h-4 text-[#4a4a58] group-hover:text-[#6b6b7a] transition-colors ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {/* Message of the Day - Hidden for now, will be added later */}
        {false && (messageOfTheDay?.message || canEditMessage) && (
          <section
            className="mb-8 opacity-0 animate-[fadeSlideIn_0.6s_ease-out_forwards]"
            style={{ animationDelay: '150ms' }}
          >
            <div className="relative bg-gradient-to-br from-[#1a1a23] to-[#141418] rounded-2xl border border-[#2a2a35] overflow-hidden">
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ea2127] via-[#ff4f54] to-[#ea2127]" />

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Icon */}
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-[#ea2127]/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-[#ea2127] uppercase tracking-wider">Message of the Day</h3>
                      </div>

                      {isEditingMessage ? (
                        <div className="space-y-3">
                          <textarea
                            value={editedMessage}
                            onChange={(e) => setEditedMessage(e.target.value)}
                            placeholder="Enter a message for all users..."
                            className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white placeholder:text-[#4a4a58] focus:outline-none focus:border-[#ea2127] focus:ring-2 focus:ring-[#ea2127]/20 resize-none transition-all"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveMessage}
                              disabled={savingMessage || !editedMessage.trim()}
                              className="px-4 py-2 bg-[#ea2127] hover:bg-[#d91e24] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {savingMessage ? 'Saving...' : 'Save Message'}
                            </button>
                            <button
                              onClick={() => setIsEditingMessage(false)}
                              className="px-4 py-2 bg-[#2a2a35] hover:bg-[#3a3a48] text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-white text-base leading-relaxed">
                            {messageOfTheDay?.message || 'No message set. Click edit to add one.'}
                          </p>
                          {messageOfTheDay?.updated_by_name && (
                            <p className="text-[#4a4a58] text-xs mt-2">
                              Last updated by {messageOfTheDay!.updated_by_name} · {messageOfTheDay!.updated_at ? new Date(messageOfTheDay!.updated_at).toLocaleDateString() : ''}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Edit button - only for Super Admin and Boss */}
                  {canEditMessage && !isEditingMessage && (
                    <button
                      onClick={() => {
                        setEditedMessage(messageOfTheDay?.message || '');
                        setIsEditingMessage(true);
                      }}
                      className="shrink-0 p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-all"
                      title="Edit message"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Navigation Cards */}
        <section
          className="mb-10 opacity-0 animate-[fadeSlideIn_0.6s_ease-out_forwards]"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 bg-[#ea2127] rounded-full" />
            <h2 className="text-lg font-semibold text-white">Quick Access</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className="group relative text-left bg-[#141418] rounded-2xl border border-[#1f1f28] p-6 transition-all duration-300 hover:border-[#2a2a38] hover:bg-[#18181d] hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-[#ea2127]/50 focus:ring-offset-2 focus:ring-offset-[#0f0f12] action-btn"
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                {/* Gradient accent on hover */}
                <div
                  className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${category.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl`}
                />

                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${category.accent} text-white shadow-lg`}>
                    {category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#ea2127] transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-[#6b6b7a] text-sm leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                  <div className="text-[#3a3a48] group-hover:text-[#ea2127] group-hover:translate-x-1 transition-all">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>


        {/* Keyboard shortcut hint */}
        <div
          className="mt-12 flex items-center justify-center gap-2 text-[#4a4a58] text-sm opacity-0 animate-[fadeSlideIn_0.6s_ease-out_forwards]"
          style={{ animationDelay: '800ms' }}
        >
          <kbd className="px-2 py-1 bg-[#1a1a1f] rounded border border-[#2a2a35] font-mono text-xs">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-2 py-1 bg-[#1a1a1f] rounded border border-[#2a2a35] font-mono text-xs">`</kbd>
          <span className="ml-2">Open command line</span>
        </div>
      </div>
    </div>
  );
}
