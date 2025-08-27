export default function SecurityPage() {
  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <div className="text-6xl mb-6">🔐</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Security Management
          </h1>
          <p className="text-xl text-gray-600">
            Security management and access control
          </p>
        </header>

        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Coming Soon
          </h3>
          <p className="text-gray-600">
            Security features will be available here. This will include user access control, 
            permission management, audit logs, and security monitoring tools.
          </p>
        </div>
      </div>
    </div>
  );
}