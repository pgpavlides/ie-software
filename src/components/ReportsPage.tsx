export default function ReportsPage() {
  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <div className="text-6xl mb-6">📄</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Reports & Analytics
          </h1>
          <p className="text-xl text-gray-600">
            Generate and view system reports
          </p>
        </header>

        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Coming Soon
          </h3>
          <p className="text-gray-600">
            Reporting features will be available here. This will include usage reports, 
            system analytics, performance metrics, and customizable dashboards.
          </p>
        </div>
      </div>
    </div>
  );
}