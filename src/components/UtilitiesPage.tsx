export default function UtilitiesPage() {
  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <div className="text-6xl mb-6">🛠️</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Utilities & Tools
          </h1>
          <p className="text-xl text-gray-600">
            Various system utilities and tools
          </p>
        </header>

        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Coming Soon
          </h3>
          <p className="text-gray-600">
            Utility tools will be available here. This will include system maintenance tools, 
            configuration utilities, backup management, and other helpful development tools.
          </p>
        </div>
      </div>
    </div>
  );
}