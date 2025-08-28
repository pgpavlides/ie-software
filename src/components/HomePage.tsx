import CategoryCard from './CategoryCard';

interface HomePageProps {
  onSelectCategory: (category: string) => void;
}

export default function HomePage({ onSelectCategory }: HomePageProps) {
  const categories = [
    {
      id: 'room',
      title: 'Room',
      description: 'Access room management and AnyDesk connections',
      iconPath: '/icons/REGISTER PLAYER.svg'
    },
    {
      id: 'technical',
      title: 'Technical',
      description: 'Technical support and system diagnostics',
      iconPath: '/icons/DEV TOOLS.svg'
    },
    {
      id: 'monitoring',
      title: 'Monitoring',
      description: 'System monitoring and performance tracking',
      iconPath: '/icons/LIVE VIEW.svg'
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Security management and access control',
      iconPath: '/icons/ADMINISTRATOR.svg'
    },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Generate and view system reports',
      iconPath: '/icons/SCOREBOARD.svg'
    },
    {
      id: 'utilities',
      title: 'Utilities',
      description: 'Various system utilities and tools',
      iconPath: '/icons/SETTINGS.svg'
    }
  ];

  return (
    <div className="min-h-full p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full">
        <header className="text-center mb-12">
          <div className="mb-8">
            <img 
              src="/logo/logo.png" 
              alt="IE Software Logo" 
              className="h-24 w-24 mx-auto object-contain mb-6"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            IE Software Department
          </h1>
          <p className="text-xl text-gray-600">
            Choose a category from the sidebar or select one below
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              description={category.description}
              iconPath={category.iconPath}
              onClick={() => onSelectCategory(category.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}