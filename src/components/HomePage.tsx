import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewAsStore } from '../store/viewAsStore';
import { getFullUserProfile } from '../services/supabaseQueries';

interface HomePageProps {
  onSelectCategory: (category: string) => void;
}

interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Array<{ name: string; color: string }>;
}

export default function HomePage({ onSelectCategory }: HomePageProps) {
  const navigate = useNavigate();
  const { getEffectiveRoles } = useViewAsStore();
  const effectiveRoles = getEffectiveRoles();

  // Helper to check if user has any of the specified roles
  const hasAnyRole = (roles: string[]) => effectiveRoles.some(role => roles.includes(role));

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

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
      roles: ['Super Admin', 'Head Architect'],
    },
    {
      id: 'tasks',
      title: 'Tasks',
      description: 'Assign and manage team tasks',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      ),
      accent: 'from-[#f59e0b] to-[#fbbf24]',
      roles: ['Super Admin', 'Admin', 'Head of Electronics', 'Head of Software', 'Head Architect', 'Head of Project Manager'],
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
            <div className="flex items-center gap-6">
              {/* Clock */}
              <div className="text-right">
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
