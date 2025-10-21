import { useState, useEffect } from 'react';
import { FiPlay, FiTerminal, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiPlus, FiTool, FiTrash2, FiUpload, FiDownload, FiBook, FiX } from 'react-icons/fi';
import supabase from '../lib/supabase';

interface Script {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  is_active: boolean;
  current_version?: ScriptVersion;
}

interface ScriptVersion {
  id: string;
  script_id: string;
  version_number: number;
  file_name: string;
  file_path: string;
  file_size: number;
  notes: string;
  is_current: boolean;
  created_at: string;
}

interface ExecutionLog {
  id: string;
  script_id: string;
  status: 'running' | 'success' | 'error' | 'cancelled';
  output: string;
  started_at: string;
  completed_at?: string;
  script?: Script;
}

export default function UtilitiesPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [scriptVersions, setScriptVersions] = useState<ScriptVersion[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          console.log('User is admin:', data);
          setIsAdmin(data);
        }
      } catch (error) {
        console.error('Error calling is_admin:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

  useEffect(() => {
    fetchScripts();
    fetchExecutionLogs();

    // Subscribe to execution log changes for real-time updates
    const subscription = supabase
      .channel('script_executions_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'script_executions' },
        () => {
          fetchExecutionLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchScripts = async () => {
    try {
      // First, fetch all active scripts
      const { data: scriptsData, error: scriptsError } = await supabase
        .from('scripts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (scriptsError) throw scriptsError;

      // Then, for each script, fetch its current version
      const scriptsWithVersions = await Promise.all(
        (scriptsData || []).map(async (script) => {
          const { data: versionData } = await supabase
            .from('script_versions')
            .select('*')
            .eq('script_id', script.id)
            .eq('is_current', true)
            .single();
          
          return {
            ...script,
            current_version: versionData
          };
        })
      );

      setScripts(scriptsWithVersions);
    } catch (error) {
      console.error('Error fetching scripts:', error);
      alert('Failed to load scripts');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutionLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('script_executions')
        .select(`
          *,
          script:scripts(*)
        `)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setExecutionLogs(data || []);
    } catch (error) {
      console.error('Error fetching execution logs:', error);
    }
  };

  const fetchScriptVersions = async (scriptId: string) => {
    try {
      const { data, error } = await supabase
        .from('script_versions')
        .select('*')
        .eq('script_id', scriptId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setScriptVersions(data || []);
    } catch (error) {
      console.error('Error fetching script versions:', error);
    }
  };

  const executeScript = async (script: Script) => {
    if (!script.current_version) {
      alert('No version available for this script');
      return;
    }

    try {
      // Create execution log entry
      const { data: execution, error: logError } = await supabase
        .from('script_executions')
        .insert({
          script_id: script.id,
          version_id: script.current_version.id,
          status: 'running',
          output: 'Script execution started...'
        })
        .select()
        .single();

      if (logError) throw logError;

      // Download the script file from storage
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('scripts')
        .download(script.current_version.file_path);

      if (downloadError) throw downloadError;

      // Here you would normally send to a backend API to execute
      // For demonstration, we'll simulate execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update execution log with success
      await supabase
        .from('script_executions')
        .update({
          status: 'success',
          output: `✓ Script "${script.name}" executed successfully`,
          completed_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      alert(`Script "${script.name}" executed successfully!`);
    } catch (error) {
      console.error('Error executing script:', error);
      alert('Failed to execute script: ' + (error as Error).message);
    }
  };

  const deleteScript = async (scriptId: string) => {
    if (!confirm('Are you sure you want to delete this script?')) return;

    try {
      const { error } = await supabase
        .from('scripts')
        .update({ is_active: false })
        .eq('id', scriptId);

      if (error) throw error;
      fetchScripts();
      alert('Script deleted successfully!');
    } catch (error) {
      console.error('Error deleting script:', error);
      alert('Failed to delete script');
    }
  };

  const showVersions = async (script: Script) => {
    setSelectedScript(script);
    await fetchScriptVersions(script.id);
    setShowVersionModal(true);
  };

  const getStatusIcon = (status: ExecutionLog['status']) => {
    switch (status) {
      case 'running':
        return <FiClock className="text-blue-500 animate-spin" />;
      case 'success':
        return <FiCheckCircle className="text-green-500" />;
      case 'error':
        return <FiXCircle className="text-red-500" />;
      case 'cancelled':
        return <FiXCircle className="text-gray-500" />;
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      green: 'bg-green-50 border-green-200 hover:bg-green-100',
      purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
      red: 'bg-red-50 border-red-200 hover:bg-red-100'
    };
    return colors[color] || colors.blue;
  };

  const groupedScripts = scripts.reduce((acc, script) => {
    if (!acc[script.category]) {
      acc[script.category] = [];
    }
    acc[script.category].push(script);
    return acc;
  }, {} as Record<string, Script[]>);

  if (loading) {
    return (
      <div className="min-h-full p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiClock className="animate-spin text-4xl text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading scripts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🛠️</div>
              <div>
                <h1 className="text-4xl font-bold text-gray-800">
                  Script Utilities
                </h1>
                <p className="text-lg text-gray-600">
                  Manage and execute Python scripts
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
            >
              <FiPlus />
              Add Script
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scripts Section */}
          <div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiTerminal className="text-red-600" />
                Available Scripts
              </h2>

              {scripts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FiTerminal className="mx-auto text-4xl mb-3" />
                  <p>No scripts available</p>
                  <p className="text-sm">Click "Add Script" to create your first script</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedScripts).map(([category, categoryScripts]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {categoryScripts.map(script => (
                          <div
                            key={script.id}
                            className={`p-4 rounded-lg border-2 transition-all ${getColorClasses(script.color)}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl">{script.icon}</span>
                                  <h3 className="font-semibold text-gray-800">
                                    {script.name}
                                  </h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">
                                  {script.description}
                                </p>
                                {script.current_version && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>v{script.current_version.version_number}</span>
                                    <span>•</span>
                                    <span>{script.current_version.file_name}</span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4 flex flex-col gap-2">
                                <button
                                  onClick={() => executeScript(script)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
                                >
                                  <FiPlay />
                                  Run
                                </button>
                                <button
                                  onClick={() => showVersions(script)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-blue-100 hover:bg-blue-200 text-blue-700"
                                >
                                  <FiClock />
                                  Versions
                                </button>
                                <button
                                  onClick={() => deleteScript(script.id)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-red-100 hover:bg-red-200 text-red-700"
                                >
                                  <FiTrash2 />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Execution Logs Section */}
          <div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiAlertCircle className="text-red-600" />
                Execution Logs
              </h2>

              {executionLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FiTerminal className="mx-auto text-4xl mb-3" />
                  <p>No execution logs yet</p>
                  <p className="text-sm">Run a script to see logs here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {executionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getStatusIcon(log.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{log.script?.icon}</span>
                            <h4 className="font-semibold text-gray-800 text-sm">
                              {log.script?.name}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 font-mono">
                            {log.output}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(log.started_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Script Modal */}
        {showAddModal && (
          <AddScriptModal
            isAdmin={isAdmin}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              fetchScripts();
            }}
          />
        )}

        {/* Versions Modal */}
        {showVersionModal && selectedScript && (
          <VersionsModal
            script={selectedScript}
            versions={scriptVersions}
            onClose={() => {
              setShowVersionModal(false);
              setSelectedScript(null);
            }}
            onSuccess={() => {
              fetchScripts();
              if (selectedScript) {
                fetchScriptVersions(selectedScript.id);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// Add Script Modal Component
function AddScriptModal({ onClose, onSuccess, isAdmin }: { onClose: () => void; onSuccess: () => void; isAdmin: boolean }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Game Scripts',
    icon: '📄',
    color: 'blue'
  });
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== Starting script creation ===');
    console.log('isAdmin status:', isAdmin);

    if (!isAdmin) {
      alert('You must be an admin to create scripts. Please contact an administrator.');
      return;
    }

    if (!file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    try {
      console.log('Creating script with data:', formData);
      console.log('File info:', { name: file.name, size: file.size, type: file.type });

      // 1. Create script entry
      const { data: script, error: scriptError } = await supabase
        .from('scripts')
        .insert({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          icon: formData.icon,
          color: formData.color
        })
        .select()
        .single();

      if (scriptError) {
        console.error('Script creation error details:', {
          message: scriptError.message,
          code: scriptError.code,
          details: scriptError.details,
          hint: scriptError.hint
        });
        throw new Error(`Failed to create script: ${scriptError.message} (${scriptError.code})`);
      }

      console.log('✓ Script created:', script);

      // 2. Upload file to storage
      const filePath = `${script.id}/${Date.now()}_${file.name}`;
      console.log('Uploading file to:', filePath);

      const { error: uploadError } = await supabase
        .storage
        .from('scripts')
        .upload(filePath, file);

      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully');

      // 3. Create version entry
      console.log('Creating version entry');
      const { error: versionError } = await supabase
        .from('script_versions')
        .insert({
          script_id: script.id,
          version_number: 1,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          notes: notes,
          is_current: true
        });

      if (versionError) {
        console.error('Version creation error:', versionError);
        throw versionError;
      }

      console.log('Script created successfully!');
      alert('Script created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating script:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      alert('Failed to create script: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Add New Script</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Script Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g., Main Game Script"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder="Describe what this script does..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Game Scripts">Game Scripts</option>
                <option value="System">System</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Utilities">Utilities</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color *
              </label>
              <select
                required
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="yellow">Yellow</option>
                <option value="red">Red</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon (Emoji)
            </label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g., 🎮"
              maxLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Script File * (.py)
            </label>
            <input
              type="file"
              required
              accept=".py"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={2}
              placeholder="Initial version"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {uploading ? 'Creating...' : 'Create Script'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Versions Modal Component
function VersionsModal({
  script,
  versions,
  onClose,
  onSuccess
}: {
  script: Script;
  versions: ScriptVersion[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const nextVersion = Math.max(...versions.map(v => v.version_number), 0) + 1;

      // Upload file to storage
      const filePath = `${script.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('scripts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create version entry
      const { error: versionError } = await supabase
        .from('script_versions')
        .insert({
          script_id: script.id,
          version_number: nextVersion,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          notes: notes,
          is_current: false
        });

      if (versionError) throw versionError;

      alert('Version uploaded successfully!');
      setShowUpload(false);
      setFile(null);
      setNotes('');
      onSuccess();
    } catch (error) {
      console.error('Error uploading version:', error);
      alert('Failed to upload version: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const setCurrentVersion = async (versionId: string) => {
    try {
      const { error } = await supabase
        .from('script_versions')
        .update({ is_current: true })
        .eq('id', versionId);

      if (error) throw error;

      alert('Version set as current!');
      onSuccess();
    } catch (error) {
      console.error('Error setting current version:', error);
      alert('Failed to set current version');
    }
  };

  const downloadVersion = async (version: ScriptVersion) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('scripts')
        .download(version.file_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading version:', error);
      alert('Failed to download version');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>{script.icon}</span>
              {script.name} - Versions
            </h2>
            <p className="text-sm text-gray-600 mt-1">{versions.length} version(s)</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              <FiUpload />
              Upload New Version
            </button>
          </div>

          {showUpload && (
            <form onSubmit={handleUploadVersion} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Script File * (.py)
                </label>
                <input
                  type="file"
                  required
                  accept=".py"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={2}
                  placeholder="What's new in this version?"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:bg-gray-300"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border-2 ${
                  version.is_current
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800">
                        Version {version.version_number}
                      </h3>
                      {version.is_current && (
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {version.file_name} ({(version.file_size / 1024).toFixed(2)} KB)
                    </p>
                    {version.notes && (
                      <p className="text-sm text-gray-500 mb-2">{version.notes}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Created: {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    {!version.is_current && (
                      <button
                        onClick={() => setCurrentVersion(version.id)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-all"
                      >
                        <FiCheckCircle />
                        Set Current
                      </button>
                    )}
                    <button
                      onClick={() => downloadVersion(version)}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
                    >
                      <FiDownload />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
