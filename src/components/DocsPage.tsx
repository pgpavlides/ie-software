interface DocsPageProps {
  onBack: () => void;
}

export default function DocsPage({ onBack }: DocsPageProps) {
  const docSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of using the IE Software Developer Tools',
      items: [
        'System Requirements',
        'Installation Guide', 
        'First Time Setup',
        'User Account Management'
      ]
    },
    {
      id: 'room-management',
      title: 'Room Management',
      description: 'How to manage and connect to remote rooms',
      items: [
        'Navigating Countries & Cities',
        'Understanding Room Cards',
        'AnyDesk Connection Guide',
        'IP Address Management',
        'Room Information Details'
      ]
    },
    {
      id: 'anydesk-integration',
      title: 'AnyDesk Integration',
      description: 'Complete guide to AnyDesk connectivity features',
      items: [
        'Protocol URL Usage',
        'One-Click Connection',
        'Troubleshooting Connections',
        'Copy & Paste Functionality',
        'Browser Protocol Setup'
      ]
    },
    {
      id: 'navigation',
      title: 'Navigation & Interface',
      description: 'Understanding the application interface',
      items: [
        'Sidebar Navigation',
        'Dashboard Overview',
        'Breadcrumb Navigation',
        'User Account Display',
        'Logout Functionality'
      ]
    },
    {
      id: 'security',
      title: 'Security & Access',
      description: 'Security features and access control',
      items: [
        'User Authentication',
        'Session Management',
        'Account Permissions',
        'Secure Connection Protocols',
        'Data Protection'
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      items: [
        'Connection Problems',
        'Browser Compatibility',
        'AnyDesk Installation Issues',
        'Login Problems',
        'Performance Optimization'
      ]
    }
  ];

  const handleSectionClick = (sectionId: string) => {
    // For now, just scroll to section or show alert
    alert(`Opening documentation for: ${sectionId}`);
  };

  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button 
            onClick={onBack}
            className="mb-4 flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <span className="mr-2">←</span>
            Back to Application
          </button>
          
          <div className="flex items-center mb-6">
            <div className="text-6xl mr-6">📚</div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Documentation
              </h1>
              <p className="text-xl text-gray-600">
                IE Software Developer Tools - User Guide & References
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {docSections.map((section) => (
            <div
              key={section.id}
              onClick={() => handleSectionClick(section.id)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all cursor-pointer"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                {section.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {section.description}
              </p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Topics Covered:</h4>
                <ul className="space-y-1">
                  {section.items.map((item, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-red-600 rounded-full mr-3"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-red-600 font-medium">
                  Click to explore →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links Section */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => alert('Opening FAQ section')}
              className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg p-4 text-center transition-all"
            >
              <div className="text-2xl mb-2">❓</div>
              <div className="text-sm font-medium text-gray-800">FAQ</div>
            </button>
            
            <button 
              onClick={() => alert('Opening video tutorials')}
              className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg p-4 text-center transition-all"
            >
              <div className="text-2xl mb-2">🎥</div>
              <div className="text-sm font-medium text-gray-800">Video Guides</div>
            </button>
            
            <button 
              onClick={() => alert('Opening API reference')}
              className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg p-4 text-center transition-all"
            >
              <div className="text-2xl mb-2">🔧</div>
              <div className="text-sm font-medium text-gray-800">API Reference</div>
            </button>
            
            <button 
              onClick={() => alert('Opening support contact')}
              className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg p-4 text-center transition-all"
            >
              <div className="text-2xl mb-2">💬</div>
              <div className="text-sm font-medium text-gray-800">Support</div>
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Documentation</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search for topics, features, or guides..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}