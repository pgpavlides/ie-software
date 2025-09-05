interface User {
  id: number;
  name: string;
  position: string;
  department: string;
  email: string;
  avatar: string;
  status: 'active' | 'inactive';
}

// Dummy user data
const dummyUsers: User[] = [
  {
    id: 1,
    name: 'John Smith',
    position: 'Senior Developer',
    department: 'Engineering',
    email: 'john.smith@company.com',
    avatar: '👨‍💻',
    status: 'active'
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    position: 'Project Manager',
    department: 'Operations',
    email: 'sarah.johnson@company.com',
    avatar: '👩‍💼',
    status: 'active'
  },
  {
    id: 3,
    name: 'Mike Chen',
    position: 'System Administrator',
    department: 'IT Support',
    email: 'mike.chen@company.com',
    avatar: '👨‍🔧',
    status: 'inactive'
  },
  {
    id: 4,
    name: 'Emily Davis',
    position: 'QA Engineer',
    department: 'Quality Assurance',
    email: 'emily.davis@company.com',
    avatar: '👩‍🔬',
    status: 'active'
  }
];

export default function OvertimesPage() {
  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Overtimes Management
          </h1>
          <p className="text-xl text-gray-600">
            Manage employee overtime records and schedules
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Employee List
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {dummyUsers.length} employees registered
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dummyUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                        {user.avatar}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-800 truncate">
                          {user.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-gray-600 mt-1">
                        {user.position}
                      </p>
                      
                      <p className="text-sm text-gray-500">
                        {user.department}
                      </p>
                      
                      <p className="text-sm text-blue-600 hover:text-blue-800 mt-2 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      View Overtime
                    </button>
                    <button className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
                      Edit Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-yellow-800">
                Coming Soon
              </h3>
              <p className="text-yellow-700 mt-1">
                Overtime management functionality is currently under development. 
                The interface shown above displays sample data for demonstration purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}