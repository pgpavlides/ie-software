import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

interface HomePageProps {
  onSelectCategory: (category: string) => void;
}

interface DashboardStats {
  totalRooms: number;
  totalCities: number;
  totalCountries: number;
  roomTypes: number;
}

export default function HomePage({ onSelectCategory }: HomePageProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    totalCities: 0,
    totalCountries: 0,
    roomTypes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch dashboard statistics
  useEffect(() => {
    async function fetchStats() {
      try {
        const [roomsResult, citiesResult, typesResult] = await Promise.all([
          supabase.from('rooms').select('id', { count: 'exact', head: true }),
          supabase.from('cities').select('id, country'),
          supabase.from('escape_room_types').select('id', { count: 'exact', head: true }),
        ]);

        const uniqueCountries = new Set(citiesResult.data?.map(c => c.country) || []);

        setStats({
          totalRooms: roomsResult.count || 0,
          totalCities: citiesResult.data?.length || 0,
          totalCountries: uniqueCountries.size,
          roomTypes: typesResult.count || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
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
    },
  ];

  const quickActions = [
    { label: 'View Map', action: () => onSelectCategory('map'), icon: '🗺️' },
    { label: 'Overtimes', action: () => onSelectCategory('overtimes'), icon: '⏱️' },
    { label: 'Components', action: () => onSelectCategory('components'), icon: '🧩' },
  ];

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

            {/* Live Clock */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="font-mono text-3xl lg:text-4xl font-semibold text-white tracking-wider">
                  {formatTime(currentTime)}
                </div>
                <div className="text-[#6b6b7a] text-sm mt-1">
                  {formatDate(currentTime)}
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[#1a1a1f] rounded-full border border-[#2a2a35]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span>
                </span>
                <span className="text-[#10b981] text-sm font-medium">System Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <section
          className="mb-10 opacity-0 animate-[fadeSlideIn_0.6s_ease-out_forwards]"
          style={{ animationDelay: '200ms' }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Rooms', value: stats.totalRooms, color: '#ea2127', icon: '◉' },
              { label: 'Cities', value: stats.totalCities, color: '#3b82f6', icon: '◎' },
              { label: 'Countries', value: stats.totalCountries, color: '#10b981', icon: '◈' },
              { label: 'Room Types', value: stats.roomTypes, color: '#f59e0b', icon: '◇' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="group relative bg-[#141418] rounded-2xl border border-[#1f1f28] p-5 transition-all duration-300 hover:border-[#2a2a38] hover:bg-[#18181d] metric-glow"
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[#6b6b7a] text-sm font-medium">{stat.label}</span>
                  <span
                    className="text-lg opacity-40 group-hover:opacity-70 transition-opacity"
                    style={{ color: stat.color }}
                  >
                    {stat.icon}
                  </span>
                </div>
                <div className="font-mono text-3xl lg:text-4xl font-bold text-white">
                  {isLoading ? (
                    <div className="h-10 w-20 bg-[#1f1f28] rounded animate-pulse" />
                  ) : (
                    <span className="inline-block animate-[countUp_0.5s_ease-out_forwards]">
                      {stat.value.toLocaleString()}
                    </span>
                  )}
                </div>
                {/* Subtle accent line */}
                <div
                  className="absolute bottom-0 left-5 right-5 h-px opacity-20"
                  style={{ background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)` }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Main Navigation Cards */}
        <section
          className="mb-10 opacity-0 animate-[fadeSlideIn_0.6s_ease-out_forwards]"
          style={{ animationDelay: '400ms' }}
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
                style={{ animationDelay: `${500 + index * 100}ms` }}
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

        {/* Quick Actions */}
        <section
          className="opacity-0 animate-[fadeSlideIn_0.6s_ease-out_forwards]"
          style={{ animationDelay: '600ms' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 bg-[#3b82f6] rounded-full" />
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, index) => (
              <button
                key={action.label}
                onClick={action.action}
                className="group flex items-center gap-2 px-5 py-3 bg-[#141418] rounded-xl border border-[#1f1f28] text-[#a0a0b0] hover:text-white hover:border-[#2a2a38] hover:bg-[#18181d] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ea2127]/50"
                style={{ animationDelay: `${700 + index * 50}ms` }}
              >
                <span className="text-lg">{action.icon}</span>
                <span className="font-medium text-sm">{action.label}</span>
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
