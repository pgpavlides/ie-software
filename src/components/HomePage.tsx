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
      icon: '🏠'
    },
    {
      id: 'technical',
      title: 'Technical',
      description: 'Technical support and system diagnostics',
      icon: '⚙️'
    },
    {
      id: 'monitoring',
      title: 'Monitoring',
      description: 'System monitoring and performance tracking',
      icon: '📊'
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Security management and access control',
      icon: '🔐'
    },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Generate and view system reports',
      icon: '📄'
    },
    {
      id: 'utilities',
      title: 'Utilities',
      description: 'Various system utilities and tools',
      icon: '🛠️'
    }
  ];

  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Developer Tools Dashboard
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
              icon={category.icon}
              onClick={() => onSelectCategory(category.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}