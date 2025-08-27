export default function MonitoringPage() {
  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <div className="text-6xl mb-6">📊</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Monitoring Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            System monitoring and performance tracking
          </p>
        </header>

        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Coming Soon
          </h3>
          <p className="text-gray-600">
            Monitoring features will be available here. This will include system performance metrics, 
            server status monitoring, and real-time alerts.
          </p>
        </div>
      </div>
    </div>
  );
}